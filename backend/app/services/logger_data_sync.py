import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models.product import Product
from app.models.order import Order
from app.services.shopify_service import ShopifyService
from backend.app.services.vector_service import VectorService
from datetime import datetime
import json

# Helper for JSON serialization of datetime
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Configure logger
logger = logging.getLogger("data_sync")
logger.setLevel(logging.INFO)
file_handler = logging.FileHandler("data_sync.log")
formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

class DataSyncService:
    def __init__(self):
        self.shopify_service = ShopifyService()
        self.vector_service = VectorService()
    
    def sync_products(self, db: Session) -> Dict[str, int]:
        """Sync products from Shopify to PostgreSQL and Qdrant"""
        stats = {"added": 0, "updated": 0, "errors": 0}
        
        try:
            # Get products from Shopify
            shopify_products = self.shopify_service.get_products()
            print(f"Fetched {len(shopify_products)} products from Shopify")
            
            for shopify_product in shopify_products:
                try:
                    # Check if product exists in PostgreSQL
                    existing_product = db.query(Product).filter(
                        Product.shopify_id == str(shopify_product["id"])
                    ).first()
                    
                    # Prepare product data for PostgreSQL
                    product_data = {
                        "shopify_id": str(shopify_product["id"]),
                        "title": shopify_product.get("title"),
                        "description": shopify_product.get("body_html", ""),
                        "price": float(shopify_product.get("variants", [{}])[0].get("price", 0)),
                        "compare_at_price": self._get_compare_price(shopify_product),
                        "vendor": shopify_product.get("vendor"),
                        "product_type": shopify_product.get("product_type"),
                        "tags": shopify_product.get("tags"),
                        "images": shopify_product.get("images", []),
                        "variants": shopify_product.get("variants", []),
                        "options": shopify_product.get("options", []),
                        "handle": shopify_product.get("handle"),
                        "status": shopify_product.get("status", "active")
                    }
                    
                    # Insert or Update in PostgreSQL
                    if existing_product:
                        # Update existing product in PostgreSQL
                        for key, value in product_data.items():
                            setattr(existing_product, key, value)
                        # Don't manually set updated_at - SQLAlchemy handles it automatically
                        stats["updated"] += 1
                        # print(f"Updated product: {product_data['title']}")
                        logger.info(f"Updated product: {json.dumps(product_data, cls=DateTimeEncoder)}")
                    else:
                        # Create new product in PostgreSQL
                        new_product = Product(**product_data)
                        # Don't manually set created_at/updated_at - SQLAlchemy handles it automatically
                        db.add(new_product)
                        stats["added"] += 1
                        # print(f"Added new product: {product_data['title']}")
                        logger.info(f"Added product: {json.dumps(product_data, cls=DateTimeEncoder)}")
                    
                    # Flush to ensure the record is persisted in this transaction
                    db.flush()
                    
                    # Add/update in Qdrant vector database
                    try:
                        self.vector_service.add_product(shopify_product)
                    except Exception as vector_e:
                        print(f"Error adding product to vector DB: {vector_e}")
                    
                except Exception as e:
                    print(f"Error syncing product {shopify_product.get('id')}: {e}")
                    stats["errors"] += 1
                    import traceback
                    traceback.print_exc()
            
            # Commit all changes to PostgreSQL
            db.commit()
            print(f"Product sync completed - PostgreSQL committed successfully")
            
        except Exception as e:
            print(f"Error in product sync: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            print("Product sync rolled back due to error")
        
        return stats
    
    def sync_orders(self, db: Session) -> Dict[str, int]:
        """Sync orders from Shopify to PostgreSQL"""
        stats = {"added": 0, "updated": 0, "errors": 0}
        
        try:
            # Get orders from Shopify
            shopify_orders = self.shopify_service.get_orders()
            print(f"Fetched {len(shopify_orders)} orders from Shopify")
            
            for shopify_order in shopify_orders:
                try:
                    # Check if order exists in PostgreSQL
                    existing_order = db.query(Order).filter(
                        Order.shopify_id == str(shopify_order["id"])
                    ).first()
                    
                    # Prepare order data for PostgreSQL
                    order_data = {
                        "shopify_id": str(shopify_order["id"]),
                        "order_number": shopify_order.get("order_number"),
                        "email": shopify_order.get("email"),
                        "phone": shopify_order.get("phone"),
                        "customer_id": str(shopify_order.get("customer", {}).get("id", "") if shopify_order.get("customer") else ""),
                        "financial_status": shopify_order.get("financial_status"),
                        "fulfillment_status": shopify_order.get("fulfillment_status"),
                        "total_price": float(shopify_order.get("total_price", 0)),
                        "subtotal_price": float(shopify_order.get("subtotal_price", 0)),
                        "total_tax": float(shopify_order.get("total_tax", 0)),
                        "currency": shopify_order.get("currency"),
                        "line_items": shopify_order.get("line_items", []),
                        "billing_address": shopify_order.get("billing_address"),
                        "shipping_address": shopify_order.get("shipping_address"),
                        "processed_at": self._parse_datetime(shopify_order.get("processed_at"))
                    }
                    
                    # Insert or Update in PostgreSQL
                    if existing_order:
                        # Update existing order in PostgreSQL
                        for key, value in order_data.items():
                            setattr(existing_order, key, value)
                        # Don't manually set updated_at - SQLAlchemy handles it automatically
                        stats["updated"] += 1
                        print(f"Updated order: {order_data['order_number']}")
                        logger.info(f"Updated order: {json.dumps(order_data, cls=DateTimeEncoder)}")
                    else:
                        # Create new order in PostgreSQL
                        new_order = Order(**order_data)
                        # Don't manually set created_at/updated_at - SQLAlchemy handles it automatically
                        db.add(new_order)
                        stats["added"] += 1
                        print(f"Added new order: {order_data['order_number']}")
                        logger.info(f"Added order: {json.dumps(order_data, cls=DateTimeEncoder)}")
                    
                    # Flush to ensure the record is persisted in this transaction
                    db.flush()
                    
                except Exception as e:
                    print(f"Error syncing order {shopify_order.get('id')}: {e}")
                    stats["errors"] += 1
                    import traceback
                    traceback.print_exc()
            
            # Commit all changes to PostgreSQL
            db.commit()
            print(f"Order sync completed - PostgreSQL committed successfully")
            
        except Exception as e:
            print(f"Error in order sync: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            print("Order sync rolled back due to error")
        
        return stats
    
    def _get_compare_price(self, product: Dict) -> Optional[float]:
        """Extract compare at price from product variants"""
        variants = product.get("variants", [])
        if variants and variants[0].get("compare_at_price"):
            return float(variants[0]["compare_at_price"])
        return None
    
    def _parse_datetime(self, date_string: Optional[str]) -> Optional[datetime]:
        """Parse Shopify datetime string"""
        if not date_string:
            return None
        try:
            return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        except Exception:
            return None
