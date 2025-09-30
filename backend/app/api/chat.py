from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import logging
import re

from app.database import get_db
from app.models.product import Product
from app.models.order import Order
from app.services.openai_service import OpenAIService
from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)
router = APIRouter()

# Session context with conversation memory
session_context = {}

class ChatMessage(BaseModel):
    message: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    session_id: Optional[str] = None
    selected_product_id: Optional[str] = None
    conversation_history: Optional[List[Dict]] = []
    # New fields for filtering and pagination
    max_results: Optional[int] = None
    filters: Optional[Dict] = {}
    page_number: Optional[int] = 1

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    # Dual slider support
    exact_matches: Optional[List[Dict]] = None
    suggestions: Optional[List[Dict]] = None  
    orders: Optional[List[Dict]] = None
    context_product: Optional[Dict] = None
    show_exact_slider: Optional[bool] = False
    show_suggestions_slider: Optional[bool] = False
    suggested_questions: Optional[List[str]] = []
    # Metadata
    total_exact_matches: Optional[int] = 0
    total_suggestions: Optional[int] = 0
    current_page: Optional[int] = 1
    has_more_exact: Optional[bool] = False
    has_more_suggestions: Optional[bool] = False
    applied_filters: Optional[Dict] = {}
    search_metadata: Optional[Dict] = {}

def parse_user_preferences(message: str) -> Dict:
    """Parse user message for specific preferences like count, price, etc."""
    preferences = {
        'max_results': None,
        'price_filter': None,
        'brand_filter': None,
        'color_filter': None,
        'size_filter': None,
        'show_similar_to_id': None
    }
    
    # Parse quantity requests
    quantity_patterns = [
        r'(?:show|find|get|want)\s+(?:me\s+)?(?:only\s+)?(\d+)\s+',
        r'(\d+)\s+(?:products?|items?|things?)',
        r'just\s+(\d+)\s*',
        r'only\s+(\d+)\s*'
    ]
    
    for pattern in quantity_patterns:
        match = re.search(pattern, message.lower())
        if match:
            preferences['max_results'] = int(match.group(1))
            break
    
    # Parse price filters
    price_patterns = [
        r'under\s+\$?(\d+)',
        r'less\s+than\s+\$?(\d+)',
        r'below\s+\$?(\d+)',
        r'cheaper\s+than\s+\$?(\d+)',
        r'budget\s+of\s+\$?(\d+)'
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, message.lower())
        if match:
            preferences['price_filter'] = {'max': float(match.group(1))}
            break
    
    # Parse brand filters
    brand_match = re.search(r'(?:from|by|brand)\s+([a-zA-Z][a-zA-Z0-9\s]{1,20})', message.lower())
    if brand_match:
        preferences['brand_filter'] = brand_match.group(1).strip().title()
    
    # Parse "more like #X" requests
    similar_match = re.search(r'(?:more|similar)\s+(?:like|to)\s+(?:#|number\s+)?(\d+)', message.lower())
    if similar_match:
        preferences['show_similar_to_id'] = int(similar_match.group(1))
    
    return preferences

def apply_product_filters(products: List[Dict], filters: Dict) -> List[Dict]:
    """Apply filters to product list"""
    if not filters:
        return products
    
    filtered = products
    
    # Price filter
    if 'price_filter' in filters and filters['price_filter']:
        max_price = filters['price_filter'].get('max')
        if max_price:
            filtered = [p for p in filtered if p.get('price', 0) <= max_price]
    
    # Brand filter
    if 'brand_filter' in filters and filters['brand_filter']:
        brand = filters['brand_filter'].lower()
        filtered = [p for p in filtered if brand in (p.get('vendor', '') or '').lower()]
    
    return filtered

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_message: ChatMessage,
    db: Session = Depends(get_db)
):
    try:
        openai_service = OpenAIService()
        vector_service = VectorService()

        # Initialize session context
        session_id = chat_message.session_id or "default"
        if session_id not in session_context:
            session_context[session_id] = {
                'product_ids': [],
                'selected_product_id': None,
                'last_query': '',
                'conversation_history': [],
                'last_shown_products': [],
                'context_product': None,
                'numbered_products': {},  # Track products by number for "show me more like #2"
            }

        # Parse user preferences
        user_preferences = parse_user_preferences(chat_message.message)
        
        # Add current message to conversation history
        user_msg = {
            'role': 'user',
            'message': chat_message.message,
            'timestamp': datetime.now().isoformat()
        }
        session_context[session_id]['conversation_history'].append(user_msg)

        # Keep only last 10 messages for context
        if len(session_context[session_id]['conversation_history']) > 10:
            session_context[session_id]['conversation_history'] = session_context[session_id]['conversation_history'][-10:]

        # Intent analysis with conversation context
        intent_analysis = openai_service.analyze_user_intent_with_context(
            chat_message.message,
            session_context[session_id]['conversation_history'],
            session_context[session_id].get('context_product')
        )

        intent = intent_analysis.get("intent", "GENERAL_CHAT")
        confidence = intent_analysis.get("confidence", 0.5)
        extracted_info = intent_analysis.get("extracted_info", {})

        response_text = ""
        exact_matches = []
        suggestions = []
        orders = None
        context_product = session_context[session_id].get('context_product')
        show_exact_slider = False
        show_suggestions_slider = False
        suggested_questions = []
        
        # Metadata
        total_exact_matches = 0
        total_suggestions = 0
        current_page = chat_message.page_number or 1
        has_more_exact = False
        has_more_suggestions = False
        applied_filters = {}
        search_metadata = {}

        logger.info(f"Intent: {intent}, Preferences: {user_preferences}")

        if intent == "PRODUCT_SEARCH":
            keywords = extracted_info.get("keywords", [])
            is_followup = extracted_info.get("is_followup_question", False)
            question_type = extracted_info.get("question_type", "general")

            # Handle "show more like #X" requests
            if user_preferences.get('show_similar_to_id'):
                target_id = user_preferences['show_similar_to_id']
                numbered_products = session_context[session_id].get('numbered_products', {})
                
                if target_id in numbered_products:
                    reference_product = numbered_products[target_id]
                    # Create similarity search based on reference product
                    similarity_query = f"{reference_product.get('title', '')} {reference_product.get('product_type', '')} {reference_product.get('vendor', '')}"
                    search_query = similarity_query
                    response_text = f"Here are products similar to #{target_id} - {reference_product.get('title', 'that product')}:"
                else:
                    response_text = f"I couldn't find product #{target_id} from our recent results. Please try a new search."
                    search_query = " ".join(keywords) if keywords else chat_message.message
            elif is_followup and context_product and question_type in ["price", "discount", "size", "availability", "color", "material", "fabric", "options"]:
                # Handle follow-up questions (existing logic)
                logger.info(f"Handling follow-up question about {context_product.get('title')} - {question_type}")
                
                response_text = openai_service.generate_product_specific_response(
                    context_product,
                    chat_message.message,
                    question_type
                )
                
                show_exact_slider = False
                show_suggestions_slider = False
                exact_matches = []
                suggestions = []
                
                suggested_questions = generate_smart_suggestions(context_product, question_type)
            else:
                # New product search
                search_query = " ".join(keywords) if keywords else chat_message.message
                logger.info(f"Searching for: {search_query}")

                # Determine search limit based on user preference or default
                max_results = user_preferences.get('max_results') or 50  # Default higher for filtering
                search_limit = min(max_results * 2, 100)  # Search more to account for filtering

                # Search vector database
                product_results = vector_service.search_products(search_query, limit=search_limit)

                if product_results:
                    # Process results into exact matches
                    all_products = []
                    
                    # Extract and normalize product data
                    def _normalize_shopify_id(raw_id: Optional[str]) -> Optional[str]:
                        if not raw_id:
                            return None
                        s = str(raw_id)
                        if s.startswith("gid://shopify/Product/"):
                            return s.rsplit("/", 1)[-1]
                        return s

                    product_ids: List[str] = []
                    for p in product_results:
                        if not isinstance(p, dict):
                            continue
                        payload = p.get("product") if "product" in p else p
                        sid = payload.get("shopify_id") or payload.get("shopifyId") or payload.get("id")
                        sid = _normalize_shopify_id(sid)
                        if sid:
                            product_ids.append(sid)

                    if product_ids:
                        # Query database for full product details
                        db_products = (
                            db.query(Product)
                            .options(joinedload(Product.images), joinedload(Product.variants), joinedload(Product.options))
                            .filter(Product.shopify_id.in_(product_ids))
                            .all()
                        )

                        # Format products for response
                        for product in db_products:
                            total_inventory = sum(v.inventory_quantity for v in product.variants)
                            first_image = product.images[0] if product.images else None

                            variants_info = []
                            for variant in product.variants:
                                variants_info.append({
                                    "title": variant.title,
                                    "price": variant.price,
                                    "compare_at_price": variant.compare_at_price,
                                    "inventory_quantity": variant.inventory_quantity,
                                    "sku": variant.sku,
                                    "option1": variant.option1,
                                    "option2": variant.option2,
                                    "option3": variant.option3,
                                })

                            product_data = {
                                "id": product.id,
                                "shopify_id": product.shopify_id,
                                "title": product.title,
                                "description": product.description,
                                "price": product.price,
                                "compare_at_price": product.compare_at_price,
                                "vendor": product.vendor,
                                "product_type": product.product_type,
                                "tags": product.tags,
                                "handle": product.handle,
                                "status": product.status,
                                "inventory_quantity": total_inventory,
                                "images": [{"src": first_image.src, "alt": first_image.alt_text}] if first_image else [],
                                "variants_count": len(product.variants),
                                "options_count": len(product.options),
                                "variants": variants_info,
                            }
                            all_products.append(product_data)

                    # Apply filters if specified
                    filters_to_apply = {}
                    if user_preferences.get('price_filter'):
                        filters_to_apply['price_filter'] = user_preferences['price_filter']
                        applied_filters['price_max'] = user_preferences['price_filter']['max']
                    if user_preferences.get('brand_filter'):
                        filters_to_apply['brand_filter'] = user_preferences['brand_filter']
                        applied_filters['brand'] = user_preferences['brand_filter']

                    filtered_products = apply_product_filters(all_products, filters_to_apply)
                    total_exact_matches = len(filtered_products)

                    # Determine exact matches to show
                    max_exact_display = user_preferences.get('max_results') or 5
                    if user_preferences.get('max_results') == 1:
                        max_exact_display = 1
                    
                    page_size = 5
                    start_idx = (current_page - 1) * page_size
                    end_idx = start_idx + max_exact_display
                    
                    exact_matches = filtered_products[start_idx:end_idx]
                    has_more_exact = end_idx < len(filtered_products)

                    # Generate numbered product mapping for "show me more like #X"
                    numbered_products = {}
                    for i, product in enumerate(exact_matches, 1):
                        numbered_products[i] = product
                    session_context[session_id]['numbered_products'] = numbered_products

                    # Generate suggestions (different products that might interest user)
                    if exact_matches and len(exact_matches) > 0:
                        # For suggestions, search for related but different products
                        suggestion_query = f"related to {search_query} alternative similar"
                        suggestion_results = vector_service.search_products(suggestion_query, limit=20)
                        
                        # Filter out exact matches from suggestions
                        exact_match_ids = set(p['shopify_id'] for p in exact_matches)
                        
                        suggestion_products = []
                        for result in suggestion_results:
                            if not isinstance(result, dict):
                                continue
                            payload = result.get("product") if "product" in result else result
                            sid = _normalize_shopify_id(payload.get("shopify_id") or payload.get("shopifyId") or payload.get("id"))
                            
                            if sid and sid not in exact_match_ids:
                                # Build suggestion product from payload
                                img_src = None
                                if isinstance(payload.get("image"), dict):
                                    img_src = payload["image"].get("src")
                                elif payload.get("images") and isinstance(payload["images"], list) and payload["images"]:
                                    first_img = payload["images"][0]
                                    if isinstance(first_img, dict):
                                        img_src = first_img.get("src")

                                price_val = None
                                variants = payload.get("variants") or []
                                if isinstance(variants, list) and variants:
                                    v0 = variants[0]
                                    if isinstance(v0, dict):
                                        price_val = v0.get("price") or v0.get("compare_at_price")
                                if price_val is None:
                                    price_val = payload.get("price")

                                suggestion_products.append({
                                    "id": sid,
                                    "shopify_id": sid,
                                    "title": payload.get("title") or "Product",
                                    "description": payload.get("description") or payload.get("body_html") or "",
                                    "price": price_val or 0,
                                    "compare_at_price": None,
                                    "vendor": payload.get("vendor") or "",
                                    "product_type": payload.get("product_type") or "",
                                    "tags": payload.get("tags") or "",
                                    "handle": payload.get("handle"),
                                    "status": payload.get("status") or "active",
                                    "inventory_quantity": 0,
                                    "images": [{"src": img_src, "alt": payload.get("title")}] if img_src else [],
                                    "variants_count": len(variants) if isinstance(variants, list) else 0,
                                    "options_count": len(payload.get("options") or []),
                                    "variants": [],
                                })
                        
                        # Apply same filters to suggestions
                        suggestions = apply_product_filters(suggestion_products, filters_to_apply)[:5]
                        total_suggestions = len(suggestions)

                    # Store context for follow-up questions
                    session_context[session_id]['product_ids'] = [p['shopify_id'] for p in exact_matches]
                    session_context[session_id]['last_shown_products'] = exact_matches

                    # Set context product to first result for follow-ups
                    if exact_matches:
                        context_product = exact_matches[0]
                        session_context[session_id]['context_product'] = context_product

                    # Generate dynamic response based on results
                    if user_preferences.get('max_results') == 1:
                        if exact_matches:
                            response_text = f"Here's the product that matches your search: **{exact_matches[0]['title']}**"
                            show_exact_slider = True
                            suggested_questions = [
                                "What colors are available?",
                                "What sizes does this come in?",
                                "What's the price?",
                                "Is there any discount?",
                            ]
                        else:
                            response_text = "I couldn't find exactly what you're looking for. Here are some related suggestions:"
                            show_suggestions_slider = len(suggestions) > 0
                    elif total_exact_matches == 0:
                        response_text = "I couldn't find exact matches for your search. Here are some related suggestions:"
                        show_suggestions_slider = len(suggestions) > 0
                    elif total_exact_matches == 1:
                        response_text = f"I found 1 product that matches your search: **{exact_matches[0]['title']}**"
                        show_exact_slider = True
                        if suggestions:
                            show_suggestions_slider = True
                    else:
                        filter_text = ""
                        if applied_filters:
                            filter_parts = []
                            if 'price_max' in applied_filters:
                                filter_parts.append(f"under ${applied_filters['price_max']}")
                            if 'brand' in applied_filters:
                                filter_parts.append(f"from {applied_filters['brand']}")
                            if filter_parts:
                                filter_text = f" ({', '.join(filter_parts)})"
                        
                        if len(exact_matches) < total_exact_matches:
                            response_text = f"I found {total_exact_matches} products{filter_text}! Here are the first {len(exact_matches)} matches."
                            has_more_exact = True
                        else:
                            response_text = f"I found {total_exact_matches} products{filter_text} that match your search."
                        
                        show_exact_slider = True
                        if suggestions:
                            show_suggestions_slider = True

                    search_metadata = {
                        'original_query': search_query,
                        'total_vector_results': len(product_results),
                        'filters_applied': bool(applied_filters),
                        'user_max_results': user_preferences.get('max_results')
                    }

                else:
                    response_text = "I couldn't find any products matching your search. Could you try different keywords or be more specific?"
                    exact_matches = []
                    suggestions = []
                    show_exact_slider = False
                    show_suggestions_slider = False
                    
                    suggested_questions = [
                        "Show me shirts",
                        "Find me a dress",
                        "Show me shoes",
                        "What's on sale?",
                        "Show me new arrivals"
                    ]

        elif intent == "ORDER_INQUIRY":
            # Handle order inquiries (existing logic)
            order_number = extracted_info.get("order_number")
            email = extracted_info.get("customer_email") or chat_message.email

            if not order_number:
                response_text = "For your privacy and security, please provide your order number to access your order details."
                orders = None
            else:
                query = db.query(Order).options(joinedload(Order.line_items))
                query = query.filter(Order.order_number == order_number)
                if email:
                    query = query.filter(Order.email == email)
                
                order = query.first()

                if not order:
                    response_text = "Sorry, I couldn't find any order matching that number and email. Please verify and try again."
                    orders = None
                else:
                    line_items = []
                    for item in order.line_items:
                        line_items.append({
                            "id": getattr(item, "shopify_line_id", item.id),
                            "name": getattr(item, "name", ""),
                            "title": getattr(item, "title", ""),
                            "quantity": getattr(item, "quantity", 0),
                            "price": getattr(item, "price", 0),
                            "total_discount": getattr(item, "total_discount", 0),
                            "vendor": getattr(item, "vendor", ""),
                            "sku": getattr(item, "sku", ""),
                        })

                    order_info = {
                        "id": order.id,
                        "shopify_id": order.shopify_id,
                        "order_number": order.order_number,
                        "email": order.email,
                        "financial_status": order.financial_status,
                        "fulfillment_status": order.fulfillment_status,
                        "total_price": order.total_price,
                        "currency": order.currency,
                        "created_at": order.created_at.isoformat() if order.created_at else None,
                        "line_items": line_items,
                        "total_items": sum(item["quantity"] for item in line_items),
                    }

                    orders = [order_info]
                    response_text = openai_service.generate_order_response(orders, chat_message.message)

        else:
            # General conversation
            response_text = openai_service.generate_general_response(chat_message.message)
            suggested_questions = [
                "Show me popular products",
                "I'm looking for a gift",
                "What's new in your store?",
                "Can you help me find something specific?"
            ]

        # Update session context
        session_context[session_id]['last_query'] = chat_message.message

        # Add bot response to conversation history
        bot_msg = {
            'role': 'assistant',
            'message': response_text,
            'timestamp': datetime.now().isoformat(),
            'exact_matches_count': len(exact_matches) if exact_matches else 0,
            'suggestions_count': len(suggestions) if suggestions else 0
        }
        session_context[session_id]['conversation_history'].append(bot_msg)

        return ChatResponse(
            response=response_text,
            intent=intent,
            confidence=confidence,
            exact_matches=exact_matches if show_exact_slider else [],
            suggestions=suggestions if show_suggestions_slider else [],
            orders=orders,
            context_product=context_product,
            show_exact_slider=show_exact_slider,
            show_suggestions_slider=show_suggestions_slider,
            suggested_questions=suggested_questions,
            total_exact_matches=total_exact_matches,
            total_suggestions=total_suggestions,
            current_page=current_page,
            has_more_exact=has_more_exact,
            has_more_suggestions=has_more_suggestions,
            applied_filters=applied_filters,
            search_metadata=search_metadata
        )

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        import traceback
        traceback.print_exc()
        
        return ChatResponse(
            response="Sorry, I'm having trouble processing your request right now. Please try again in a moment.",
            intent="error",
            confidence=0.0,
            exact_matches=[],
            suggestions=[],
            orders=None,
            show_exact_slider=False,
            show_suggestions_slider=False,
            total_exact_matches=0,
            total_suggestions=0,
            current_page=1,
            has_more_exact=False,
            has_more_suggestions=False,
            applied_filters={},
            search_metadata={}
        )

def generate_smart_suggestions(product: Dict, last_question_type: str) -> List[str]:
    """Generate intelligent follow-up suggestions based on product and last question"""
    base_suggestions = [
        "Is this available in other colors?",
        "What sizes are available?", 
        "Tell me about the material",
        "Is there any discount on this?",
        "How much does this cost?",
        "Is this in stock?",
        "Show me similar products"
    ]

    # Remove the question type they just asked about
    filtered_suggestions = []
    for suggestion in base_suggestions:
        suggestion_lower = suggestion.lower()
        should_skip = False
        
        if last_question_type == "color" and ("color" in suggestion_lower):
            should_skip = True
        elif last_question_type == "size" and ("size" in suggestion_lower):
            should_skip = True
        elif last_question_type == "material" and ("material" in suggestion_lower):
            should_skip = True
        elif last_question_type == "discount" and ("discount" in suggestion_lower):
            should_skip = True
        elif last_question_type == "price" and ("cost" in suggestion_lower):
            should_skip = True
        elif last_question_type == "availability" and ("stock" in suggestion_lower):
            should_skip = True
        
        if not should_skip:
            filtered_suggestions.append(suggestion)

    return filtered_suggestions[:4]

# Add pagination endpoints
@router.get("/chat/products/more")
async def get_more_products(
    session_id: str = Query(...),
    page: int = Query(1),
    type: str = Query("exact", regex="^(exact|suggestions)$"),
    db: Session = Depends(get_db)
):
    """Get more products for pagination"""
    try:
        if session_id not in session_context:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = session_context[session_id]
        # Implementation for loading more products based on last search
        # This would re-run the search with different page parameters
        
        return {"message": "Pagination endpoint - implementation depends on your specific needs"}
    except Exception as e:
        logger.error(f"Pagination error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@router.post("/clear-context")
async def clear_session_context(session_id: str):
    """Clear conversation context for a session"""
    if session_id in session_context:
        del session_context[session_id]
    return {"status": "success", "message": "Context cleared"}

@router.get("/context/{session_id}")
async def get_session_context(session_id: str):
    """Get current session context (for debugging)"""
    return session_context.get(session_id, {})