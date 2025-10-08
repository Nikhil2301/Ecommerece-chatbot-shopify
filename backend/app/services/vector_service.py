from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, Range
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Union
import uuid
import hashlib
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.client = QdrantClient(
            url=f"http://{settings.QDRANT_HOST}:{settings.QDRANT_PORT}",
            api_key=settings.QDRANT_API_KEY,
            prefer_grpc=False
        )
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.collection_name = "products"
        self._setup_collection()

    def _setup_collection(self):
        """Initialize Qdrant collection if it doesn't exist"""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=384,  # all-MiniLM-L6-v2 embedding size
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Error setting up collection: {e}")

    def add_product(self, product: Dict) -> bool:
        """Add product to vector database with enhanced metadata"""
        try:
            # Create searchable text from product data
            product_text = self._create_product_text(product)
            
            # Generate embedding
            embedding = self.model.encode(product_text).tolist()
            
            # Generate deterministic UUID from shopify product ID
            shopify_id = str(product.get("id"))
            point_id = self._generate_deterministic_uuid(shopify_id)
            
            # Enhanced payload with searchable fields
            payload = dict(product)
            payload.update({
                "searchable_text": product_text,
                "price_float": self._safe_float_convert(product.get("price")),
                "compare_at_price_float": self._safe_float_convert(product.get("compare_at_price")),
                "vendor_lower": (product.get("vendor") or "").lower(),
                "product_type_lower": (product.get("product_type") or "").lower(),
                "tags_lower": (product.get("tags") or "").lower(),
                "has_discount": bool(product.get("compare_at_price")) and 
                               self._safe_float_convert(product.get("compare_at_price", 0)) > 
                               self._safe_float_convert(product.get("price", 0)),
                "in_stock": (product.get("inventory_quantity") or 0) > 0,
                "popularity_score": self._calculate_popularity_score(product)
            })

            point = PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload
            )

            # Upsert point
            self.client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
            
            return True
        except Exception as e:
            logger.error(f"Error adding product to vector DB: {e}")
            return False

    def search_products(self, 
                       query: str, 
                       limit: int = 10,
                       filters: Optional[Dict] = None,
                       min_score: float = 0.3) -> List[Dict]:
        """Search products with filtering capabilities"""
        try:
            # Generate query embedding
            query_embedding = self.model.encode(query).tolist()
            
            # Build Qdrant filter from search filters
            qdrant_filter = self._build_qdrant_filter(filters) if filters else None
            
            # Search
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=qdrant_filter,
                limit=limit * 2,  # Get more results to account for filtering
                with_payload=True,
                score_threshold=min_score
            )

            # Format and post-process results
            formatted_results = []
            for result in results:
                if result.score >= min_score:
                    formatted_results.append({
                        "score": result.score,
                        "product": result.payload
                    })
            
            # Apply additional filtering that can't be done at vector level
            if filters:
                formatted_results = self._post_filter_results(formatted_results, filters)
            
            # Sort by relevance and popularity
            formatted_results = self._sort_results(formatted_results)
            
            return formatted_results[:limit]
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []

    def search_similar_products(self, 
                               reference_product_id: str, 
                               limit: int = 5,
                               exclude_self: bool = True) -> List[Dict]:
        """Find products similar to a reference product"""
        try:
            # First get the reference product
            point_id = self._generate_deterministic_uuid(reference_product_id)
            
            # Get the reference product's vector
            reference_point = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[point_id],
                with_vectors=True,
                with_payload=True
            )
            
            if not reference_point:
                return []
            
            reference_vector = reference_point[0].vector
            reference_payload = reference_point[0].payload
            
            # Build filter to exclude reference product if needed
            search_filter = None
            if exclude_self:
                search_filter = Filter(
                    must_not=[
                        FieldCondition(
                            key="id",
                            match=MatchValue(value=reference_product_id)
                        )
                    ]
                )
            
            # Search for similar products
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=reference_vector,
                query_filter=search_filter,
                limit=limit,
                with_payload=True
            )
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "score": result.score,
                    "product": result.payload,
                    "similarity_reason": self._get_similarity_reason(reference_payload, result.payload)
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar products: {e}")
            return []

    def _build_qdrant_filter(self, filters: Dict) -> Optional[Filter]:
        """Build Qdrant filter from search parameters"""
        conditions = []
        
        # Price filter
        if "price_max" in filters:
            conditions.append(
                FieldCondition(
                    key="price_float",
                    range=Range(lte=float(filters["price_max"]))
                )
            )
        
        if "price_min" in filters:
            conditions.append(
                FieldCondition(
                    key="price_float",
                    range=Range(gte=float(filters["price_min"]))
                )
            )
        
        # Brand filter
        if "brand" in filters:
            conditions.append(
                FieldCondition(
                    key="vendor_lower",
                    match=MatchValue(value=filters["brand"].lower())
                )
            )
        
        # Category filter
        if "category" in filters:
            conditions.append(
                FieldCondition(
                    key="product_type_lower",
                    match=MatchValue(value=filters["category"].lower())
                )
            )
        
        # In stock filter
        if filters.get("in_stock_only"):
            conditions.append(
                FieldCondition(
                    key="in_stock",
                    match=MatchValue(value=True)
                )
            )
        
        # On sale filter
        if filters.get("on_sale_only"):
            conditions.append(
                FieldCondition(
                    key="has_discount",
                    match=MatchValue(value=True)
                )
            )
        
        return Filter(must=conditions) if conditions else None

    def _post_filter_results(self, results: List[Dict], filters: Dict) -> List[Dict]:
        """Apply filters that can't be handled at the vector search level"""
        filtered_results = []
        
        for result in results:
            product = result["product"]
            include = True
            
            # Color filter (requires text matching in tags/description)
            if "color" in filters:
                color_terms = filters["color"].lower().split()
                product_text = (
                    f"{product.get('title', '')} {product.get('tags', '')} "
                    f"{product.get('description', '')}"
                ).lower()
                
                if not any(term in product_text for term in color_terms):
                    include = False
            
            # Size filter
            if "size" in filters and include:
                size_terms = filters["size"].lower().split()
                product_text = (
                    f"{product.get('title', '')} {product.get('tags', '')}"
                ).lower()
                
                if not any(term in product_text for term in size_terms):
                    include = False
            
            if include:
                filtered_results.append(result)
        
        return filtered_results

    def _sort_results(self, results: List[Dict]) -> List[Dict]:
        """Sort results by relevance score and popularity"""
        return sorted(results, key=lambda x: (
            x["score"],  # Primary: vector similarity
            x["product"].get("popularity_score", 0)  # Secondary: popularity
        ), reverse=True)

    def _calculate_popularity_score(self, product: Dict) -> float:
        """Calculate a popularity score for ranking"""
        score = 0.0
        
        # Factors that increase popularity
        if product.get("inventory_quantity", 0) > 0:
            score += 1.0
        
        if product.get("compare_at_price") and product.get("price"):
            try:
                compare_price = float(product["compare_at_price"])
                current_price = float(product["price"])
                if compare_price > current_price:
                    discount_percent = (compare_price - current_price) / compare_price
                    score += discount_percent * 2.0  # Higher score for bigger discounts
            except (ValueError, TypeError):
                pass
        
        # High inventory suggests popularity
        inventory = product.get("inventory_quantity", 0)
        if inventory > 50:
            score += 0.5
        elif inventory > 20:
            score += 0.3
        
        return score

    def _get_similarity_reason(self, reference: Dict, similar: Dict) -> str:
        """Generate a reason why products are similar"""
        reasons = []
        
        if reference.get("vendor") == similar.get("vendor"):
            reasons.append("same brand")
        
        if reference.get("product_type") == similar.get("product_type"):
            reasons.append("same category")
        
        # Check price similarity
        ref_price = self._safe_float_convert(reference.get("price"))
        sim_price = self._safe_float_convert(similar.get("price"))
        
        if ref_price and sim_price and abs(ref_price - sim_price) / ref_price < 0.2:
            reasons.append("similar price")
        
        return ", ".join(reasons) if reasons else "similar features"

    def _safe_float_convert(self, value: Union[str, int, float, None]) -> Optional[float]:
        """Safely convert a value to float"""
        if value is None:
            return None
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _generate_deterministic_uuid(self, shopify_id: str) -> str:
        """Generate deterministic UUID from shopify product ID"""
        namespace = uuid.UUID('12345678-1234-5678-1234-123456789abc')
        return str(uuid.uuid5(namespace, shopify_id))

    def _create_product_text(self, product: Dict) -> str:
        """Create searchable text from product data"""
        parts = []
        
        if product.get("title"):
            parts.append(product["title"])
        
        if product.get("body_html"):
            # Strip HTML tags for cleaner text
            import re
            clean_description = re.sub(r'<[^>]+>', '', product["body_html"])
            parts.append(clean_description)
        
        if product.get("vendor"):
            parts.append(f"Brand: {product['vendor']}")
        
        if product.get("product_type"):
            parts.append(f"Type: {product['product_type']}")
        
        if product.get("tags"):
            parts.append(f"Tags: {product['tags']}")
        
        # Add variant information for better searchability
        if product.get("variants"):
            variant_text = []
            for variant in product["variants"][:3]:  # First 3 variants
                if variant.get("title"):
                    variant_text.append(variant["title"])
            if variant_text:
                parts.append(f"Options: {' '.join(variant_text)}")
        
        return " ".join(parts)

    def delete_product(self, shopify_id: str) -> bool:
        """Delete product from vector database"""
        try:
            point_id = self._generate_deterministic_uuid(shopify_id)
            
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[point_id]
            )
            
            return True
        except Exception as e:
            logger.error(f"Error deleting product from vector DB: {e}")
            return False

    def get_collection_info(self) -> Dict:
        """Get information about the collection - handles Qdrant version compatibility"""
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            # Handle different Qdrant response structures safely
            result = {}
            
            # Try to get points count
            if hasattr(info, 'points_count'):
                result['points_count'] = info.points_count
            elif hasattr(info, 'vectors_count'):
                result['points_count'] = info.vectors_count
            else:
                result['points_count'] = 0
            
            # Try to get status
            if hasattr(info, 'status'):
                result['status'] = str(info.status)
            else:
                result['status'] = 'unknown'
            
            return result
        except Exception as e:
            # Don't log as error - this is often just a version mismatch warning
            logger.debug(f"Could not get detailed collection info (version mismatch): {e}")
            return {'points_count': 0, 'status': 'unknown'}
    
    def delete_all(self) -> bool:
        """Delete all products from vector database and recreate collection"""
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_exists = any(c.name == self.collection_name for c in collections)
            
            if collection_exists:
                self.client.delete_collection(self.collection_name)
                logger.info(f"Deleted collection: {self.collection_name}")
            
            # Recreate collection
            self._setup_collection()
            logger.info(f"Recreated collection: {self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error in delete_all: {e}")
            return False
