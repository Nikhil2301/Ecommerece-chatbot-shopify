from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
import json
import logging
import re

from app.database import get_db
from app.models.product import Product
from app.models.order import Order
from app.services.openai_service import OpenAIService
from app.services.vector_service import VectorService

from uuid import uuid4
from sqlalchemy import func, asc, desc
try:
    from app.models.chat import User as UserDB, ChatSession as ChatSessionDB, ChatMessage as ChatMessageDB
    from app.models.chat_extras import ChatMessageProduct as ChatMessageProductDB, ChatMessageOrder as ChatMessageOrderDB
except Exception:
    UserDB = ChatSessionDB = ChatMessageDB = None  # tables not ready yet
    ChatMessageProductDB = ChatMessageOrderDB = None


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

def safe_float_convert(value: Union[str, int, float, None]) -> float:
    """Safely convert a value to float, return 0.0 if conversion fails"""
    if value is None:
        return 0.0
    
    try:
        # Handle string values
        if isinstance(value, str):
            # Remove currency symbols and spaces
            cleaned = re.sub(r'[^\d.,]', '', value)
            if not cleaned:
                return 0.0
            # Handle comma as decimal separator
            cleaned = cleaned.replace(',', '.')
            return float(cleaned)
        
        return float(value)
    except (ValueError, TypeError):
        logger.warning(f"Could not convert price value to float: {value}")
        return 0.0

def normalize_shopify_id(raw_id: Optional[str]) -> Optional[str]:
    """FIXED: Move this function to module level to avoid scoping issues"""
    if not raw_id:
        return None
    s = str(raw_id)
    if s.startswith("gid://shopify/Product/"):
        return s.rsplit("/", 1)[-1]
    return s

def extract_order_info(message: str) -> Dict:
    """Extract order number and email from message using regex patterns as fallback"""
    info = {
        'order_number': None,
        'email': None
    }
    
    # Extract order number patterns
    order_patterns = [
        r'order\s*#?\s*(\d+)',
        r'#\s*(\d+)',
        r'order\s+number\s*:?\s*(\d+)',
        r'tracking\s*#?\s*(\d+)',
        r'^\s*(\d+)\s*$',  # Just a number alone
    ]
    
    for pattern in order_patterns:
        match = re.search(pattern, message.lower())
        if match:
            info['order_number'] = match.group(1)
            break
    
    # Extract email patterns
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, message)
    if email_match:
        info['email'] = email_match.group(0)
    
    return info

def parse_user_preferences(message: str) -> Dict:
    """Parse user message for specific preferences like count, price, etc."""
    preferences = {
        'max_results': None,
        'price_filter': None,
        'brand_filter': None,
        'color_filter': None,
        'size_filter': None,
        'show_similar_to_id': None,
        'product_position_reference': None,  # NEW: For "second product", "third one", etc.
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
    
    # ENHANCED: Parse price filters with more patterns
    price_patterns = [
        r'under\s+\$?(\d+)',
        r'less\s+than\s+\$?(\d+)',
        r'below\s+\$?(\d+)',
        r'cheaper\s+than\s+\$?(\d+)',
        r'budget\s+of\s+\$?(\d+)',
        r'under\s+(\d+)\s*(?:rs|rupees?)',
        r'below\s+(\d+)\s*(?:rs|rupees?)',
        r'less\s+than\s+(\d+)\s*(?:rs|rupees?)'
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
    
    # NEW: Parse product position references (second product, third one, etc.)
    position_patterns = [
        r'(?:the\s+)?(first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?)\s+(?:product|one|item)',
        r'product\s+(?:#|number\s+)?(\d+)',
        r'(?:the\s+)?(?:first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?)\s+(?:one|item)',
    ]
    
    for pattern in position_patterns:
        match = re.search(pattern, message.lower())
        if match:
            position_text = match.group(1) if match.group(1) else match.group(0)
            # Convert ordinal to number
            ordinal_map = {
                'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
                '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5
            }
            
            if position_text in ordinal_map:
                preferences['product_position_reference'] = ordinal_map[position_text]
            elif position_text.isdigit():
                preferences['product_position_reference'] = int(position_text)
            break
    
    return preferences

def apply_product_filters(products: List[Dict], filters: Dict) -> List[Dict]:
    """FIXED: Apply filters to product list with safe price conversion"""
    if not filters:
        return products
    
    filtered = products
    
    # Price filter with safe conversion
    if 'price_filter' in filters and filters['price_filter']:
        max_price = filters['price_filter'].get('max')
        if max_price is not None:
            max_price = float(max_price)
            filtered = [
                p for p in filtered
                if safe_float_convert(p.get('price', 0)) <= max_price
            ]
    
    # Brand filter
    if 'brand_filter' in filters and filters['brand_filter']:
        brand = filters['brand_filter'].lower()
        filtered = [p for p in filtered if brand in (p.get('vendor', '') or '').lower()]
    
    return filtered

def detect_product_specific_question(message: str, context_product: Optional[Dict] = None, 
                                   recent_products: List[Dict] = None, selected_product: Optional[Dict] = None) -> Dict:
    """COMPLETELY FIXED: Better detection of product-specific questions"""
    
    message_lower = message.lower()
    logger.info(f"Analyzing question: '{message}' (lowercased: '{message_lower}')")
    
    # ENHANCED: Much more comprehensive product question patterns
    product_question_patterns = [
        # Color questions
        r'(?:what|which)\s+colors?\s+(?:are\s+)?(?:available|exist|does\s+(?:this|it)\s+come\s+in)',
        r'(?:give\s+me\s+)?which\s+colors?\s+(?:are\s+)?available',
        r'(?:tell\s+me\s+)?(?:the\s+)?(?:available\s+)?colors?',
        r'(?:in\s+)?(?:what|which)\s+colors?\s+(?:is\s+)?(?:it\s+)?(?:available|come)',
        r'colors?\s+available',
        r'available\s+colors?',
        
        # Size questions  
        r'(?:what|which)\s+sizes?\s+(?:are\s+)?(?:available|exist|does\s+(?:this|it)\s+come\s+in)',
        r'(?:give\s+me\s+)?which\s+sizes?\s+(?:are\s+)?available',
        r'(?:tell\s+me\s+)?(?:the\s+)?(?:available\s+)?sizes?',
        r'(?:what|which)\s+sizes?\s+(?:is\s+)?(?:it\s+)?(?:available|come)',
        r'sizes?\s+available',
        r'available\s+sizes?',
        r'please\s+provide\s+(?:the\s+)?(?:all\s+)?sizes?',
        r'give\s+me\s+(?:all\s+)?(?:the\s+)?(?:available\s+)?sizes?',
        
        # NEW: Image questions
        r'(?:show\s+me\s+)?(?:the\s+)?images?\s+(?:of\s+)?(?:this\s+)?(?:product)?',
        r'(?:can\s+)?(?:i\s+)?(?:see\s+)?(?:the\s+)?(?:product\s+)?images?',
        r'(?:display\s+|show\s+)?(?:product\s+)?photos?',
        r'(?:what\s+does\s+)?(?:this|it)\s+look\s+like',
        r'(?:show\s+me\s+)?(?:how\s+)?(?:it\s+|this\s+)?looks?',
        r'(?:i\s+want\s+to\s+see\s+)?(?:the\s+)?images?',
        
        # General product questions
        r'tell\s+me\s+about\s+(?:the\s+)?(?:this\s+)?(?:product|item)',
        r'(?:what\s+about\s+)?(?:this\s+)?(?:product|item)',
        r'is\s+there\s+(?:any\s+)?discount\s+on\s+(?:this|it)',
        r'how\s+much\s+(?:does\s+)?(?:this|it)\s+cost',
        r'what\'?s\s+the\s+price',
        r'is\s+(?:this|it)\s+in\s+stock',
        r'(?:what|which)\s+options\s+(?:are\s+)?available',
        r'tell\s+me\s+more\s+(?:about\s+)?(?:this|it)',
        
        # Enhanced with selection context
        r'(?:give\s+me\s+)?(?:which\s+)?colors?\s+(?:are\s+)?available\s+(?:of\s+|for\s+)?(?:the\s+)?(?:product\s+)?(?:i\s+)?selected',
        r'(?:give\s+me\s+)?(?:which\s+)?sizes?\s+(?:are\s+)?available\s+(?:of\s+|for\s+)?(?:the\s+)?(?:product\s+)?(?:i\s+)?selected',
        r'(?:tell\s+me\s+about\s+)?(?:the\s+)?(?:product\s+)?(?:i\s+)?selected',
        r'(?:what\s+about\s+)?(?:the\s+)?(?:product\s+)?(?:i\s+)?selected',
        r'(?:show\s+me\s+)?(?:the\s+)?images?\s+(?:of\s+)?(?:the\s+)?(?:product\s+)?(?:i\s+)?selected'
    ]
    
    # Check for product position references
    target_product = None
    has_product_reference = False
    question_type = "general"
    
    # Check for position-based references first
    position_patterns = [
        r'(?:the\s+)?(first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?)\s+(?:product|one|item)',
        r'product\s+(?:#|number\s+)?(\d+)',
        r'(?:the\s+)?(?:first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?)\s+(?:one|item)',
    ]
    
    for pattern in position_patterns:
        match = re.search(pattern, message_lower)
        if match:
            position_text = match.group(1) if match.groups() and match.group(1) else match.group(0).split()[-2]
            ordinal_map = {
                'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
                '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5
            }
            
            position = None
            if position_text in ordinal_map:
                position = ordinal_map[position_text]
            elif position_text.isdigit():
                position = int(position_text)
            
            if position and recent_products and len(recent_products) >= position:
                target_product = recent_products[position - 1]
                has_product_reference = True
                logger.info(f"Found position reference: position {position} -> {target_product.get('title', 'Unknown')}")
                break
    
    # PRIORITY FIX: If no position reference, check selected product FIRST
    if not target_product and selected_product:
        target_product = selected_product
        has_product_reference = True
        logger.info(f"Using selected product: {target_product.get('title', 'Unknown')}")
    
    # If still no target, use context product
    if not target_product and context_product:
        target_product = context_product
        
        # Check for product name mentions
        product_title = context_product['title'].lower()
        product_words = product_title.split()
        
        # Check if any significant words from product title are in the message
        for word in product_words:
            if len(word) > 3 and word in message_lower:
                has_product_reference = True
                break
        
        # Check for "for [product name]" pattern
        if re.search(rf'for\s+["\']?{re.escape(product_title)}["\']?', message_lower):
            has_product_reference = True
            
        # Check for partial product title matches
        product_words_filtered = [w for w in product_words if len(w) > 3]
        if len(product_words_filtered) > 0:
            # Check if at least 50% of significant words are in the message
            matches = sum(1 for word in product_words_filtered if word in message_lower)
            if matches >= len(product_words_filtered) * 0.5:
                has_product_reference = True
    
    # ENHANCED: Check for product question patterns with better logging
    is_product_question = False
    for i, pattern in enumerate(product_question_patterns):
        if re.search(pattern, message_lower):
            is_product_question = True
            logger.info(f"Matched product question pattern {i+1}: {pattern}")
            
            # Determine question type
            if 'image' in message_lower or 'photo' in message_lower or 'picture' in message_lower or 'look' in message_lower:
                question_type = "images"
            elif 'color' in message_lower:
                question_type = "color"
            elif 'size' in message_lower:
                question_type = "size"
            elif 'material' in message_lower:
                question_type = "material"
            elif 'discount' in message_lower:
                question_type = "discount"
            elif 'price' in message_lower or 'cost' in message_lower:
                question_type = "price"
            elif 'stock' in message_lower or 'available' in message_lower:
                question_type = "availability"
            elif 'option' in message_lower:
                question_type = "options"
            
            break
    
    # CRITICAL FIX: If we have a target product but no question pattern match, 
    # still treat it as a product question if it sounds like one
    if not is_product_question and target_product:
        # Check for simple keywords that indicate product questions
        product_keywords = ['color', 'size', 'available', 'price', 'cost', 'discount', 'stock', 'option', 'material', 'image', 'photo', 'look']
        if any(keyword in message_lower for keyword in product_keywords):
            is_product_question = True
            logger.info("Detected product question based on keywords and target product presence")
    
    result = {
        'is_product_question': is_product_question,
        'question_type': question_type,
        'has_product_reference': has_product_reference,
        'should_use_context': is_product_question and target_product is not None,
        'target_product': target_product
    }
    
    logger.info(f"Question analysis result: {result}")
    return result

def find_product_by_id(shopify_id: str, db: Session) -> Optional[Dict]:
    """Helper function to find a product by its shopify_id"""
    try:
        product = (
            db.query(Product)
            .options(joinedload(Product.images), joinedload(Product.variants), joinedload(Product.options))
            .filter(Product.shopify_id == shopify_id)
            .first()
        )
        
        if not product:
            return None
            
        # Format product for response with safe price conversion
        total_inventory = sum(v.inventory_quantity for v in product.variants)
        first_image = product.images[0] if product.images else None

        variants_info = []
        for variant in product.variants:
            variants_info.append({
                "title": variant.title,
                "price": safe_float_convert(variant.price),
                "compare_at_price": safe_float_convert(variant.compare_at_price) if variant.compare_at_price else None,
                "inventory_quantity": variant.inventory_quantity,
                "sku": variant.sku,
                "option1": variant.option1,
                "option2": variant.option2,
                "option3": variant.option3,
            })

        # NEW: Include all images, not just first one
        all_images = []
        for img in product.images:
            all_images.append({
                "src": img.src,
                "alt": img.alt_text or product.title
            })

        return {
            "id": product.id,
            "shopify_id": product.shopify_id,
            "title": product.title,
            "description": product.description,
            "price": safe_float_convert(product.price),
            "compare_at_price": safe_float_convert(product.compare_at_price) if product.compare_at_price else None,
            "vendor": product.vendor,
            "product_type": product.product_type,
            "tags": product.tags,
            "handle": product.handle,
            "status": product.status,
            "inventory_quantity": total_inventory,
            "images": all_images,  # FIXED: Return all images
            "variants_count": len(product.variants),
            "options_count": len(product.options),
            "variants": variants_info,
        }
        
    except Exception as e:
        logger.error(f"Error finding product by ID {shopify_id}: {e}")
        return None

def get_product_inventory_from_db(shopify_id: str, db: Session) -> int:
    """FIXED: Get real inventory quantity for a product from database"""
    try:
        product = (
            db.query(Product)
            .options(joinedload(Product.variants))
            .filter(Product.shopify_id == shopify_id)
            .first()
        )
        
        if not product:
            return 0
            
        # Sum inventory from all variants
        total_inventory = sum(v.inventory_quantity for v in product.variants)
        return total_inventory
        
    except Exception as e:
        logger.error(f"Error getting inventory for product {shopify_id}: {e}")
        return 0

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

        # === Persist: ensure user & session and save the user message ===
        email_val = (chat_message.email or "").strip().lower()
        if not email_val:
            raise HTTPException(status_code=400, detail="email is required for chat")

        # Ensure user exists, then resolve session and persist the user message
        session_db = None
        try:
            if UserDB and ChatSessionDB and ChatMessageDB:
                # 1) Ensure user
                user_db = db.query(UserDB).filter(UserDB.email == email_val).one_or_none()
                if not user_db:
                    user_db = UserDB(email=email_val)
                    db.add(user_db)
                    db.flush()

                # 2) Resolve session id: use provided, else most recent, else new
                resolved_session_id = chat_message.session_id or None
                if not resolved_session_id:
                    last_session = (
                        db.query(ChatSessionDB)
                          .filter(ChatSessionDB.user_id == user_db.id)
                          .order_by(ChatSessionDB.last_activity_at.desc())
                          .first()
                    )
                    if last_session:
                        resolved_session_id = last_session.id
                    else:
                        resolved_session_id = str(uuid4())

                # 3) Load or create session
                session_db = (
                    db.query(ChatSessionDB)
                      .filter(ChatSessionDB.id == resolved_session_id, ChatSessionDB.user_id == user_db.id)
                      .one_or_none()
                )
                if not session_db:
                    session_db = ChatSessionDB(
                        id=resolved_session_id,
                        user_id=user_db.id,
                        session_metadata={}
                    )
                    db.add(session_db)
                    db.flush()

                session_id = session_db.id  # use resolved

                # 4) Save the user message turn
                db.add(ChatMessageDB(
                    session_id=session_db.id,
                    role="user",
                    content=chat_message.message,
                    extra={
                        "selected_product_id": chat_message.selected_product_id,
                        "filters": chat_message.filters,
                        "page_number": chat_message.page_number,
                    }
                ))
                db.commit()
        except Exception as e:
            logger.error(f"Persistence (user turn) failed: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        # === End persist user turn ===

        if session_id not in session_context:
            session_context[session_id] = {
                'product_ids': [],
                'selected_product_id': None,
                'last_query': '',
                'conversation_history': [],
                'last_shown_products': [],
                'context_product': None,
                'numbered_products': {},  # Track products by number for "show me more like #2"
                'recent_search_products': [],  # NEW: Track recent search results for position references
                'selected_product': None,  # NEW: Track currently selected product
                'pending_order_email': None,  # NEW: Remember email for order inquiry
                'pending_order_number': None,  # NEW: Remember order number for order inquiry
                # PAGINATION: Cache search results for pagination
                'cached_search_results': [],  # Full list of products from last search
                'cached_search_query': '',  # The query that generated cached results
                'cached_suggestions': [],  # Full list of suggestions
                'current_exact_page': 1,  # Current page for exact matches
                'current_suggestions_page': 1,  # Current page for suggestions
            }

        # ENHANCED: Handle selected product ID from frontend
        selected_product = None
        if chat_message.selected_product_id:
            logger.info(f"Frontend sent selected product ID: {chat_message.selected_product_id}")
            
            # Always update the selected product context when frontend sends it
            session_context[session_id]['selected_product_id'] = chat_message.selected_product_id
            
            # Update context product when selection changes
            new_context_product = find_product_by_id(chat_message.selected_product_id, db)
            if new_context_product:
                session_context[session_id]['context_product'] = new_context_product
                session_context[session_id]['selected_product'] = new_context_product  # NEW: Store selected product
                selected_product = new_context_product
                logger.info(f"Updated context product to: {new_context_product['title']}")

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

        # ENHANCED: Better product question detection with recent products and selected product
        context_product = session_context[session_id].get('context_product')
        recent_products = session_context[session_id].get('recent_search_products', [])
        selected_product = session_context[session_id].get('selected_product')
        
        logger.info(f"Context for question detection:")
        logger.info(f"  - Context product: {context_product.get('title') if context_product else 'None'}")
        logger.info(f"  - Selected product: {selected_product.get('title') if selected_product else 'None'}")
        logger.info(f"  - Recent products count: {len(recent_products) if recent_products else 0}")
        
        product_question_analysis = detect_product_specific_question(
            chat_message.message, 
            context_product, 
            recent_products, 
            selected_product
        )
        
        logger.info(f"Product question analysis: {product_question_analysis}")

        # Intent analysis with conversation context
        intent_analysis = openai_service.analyze_user_intent_with_context(
            chat_message.message,
            session_context[session_id]['conversation_history'],
            context_product
        )

        intent = intent_analysis.get("intent", "GENERAL_CHAT")
        confidence = intent_analysis.get("confidence", 0.5)
        extracted_info = intent_analysis.get("extracted_info", {})

        response_text = ""
        exact_matches = []
        suggestions = []
        orders = None
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

        # PRIORITY FIX: Handle product-specific questions FIRST, before other intents
        if product_question_analysis['is_product_question'] and product_question_analysis['should_use_context']:
            target_product = product_question_analysis.get('target_product')
            
            if target_product:
                logger.info(f"HANDLING PRODUCT-SPECIFIC QUESTION: {product_question_analysis['question_type']} for {target_product['title']}")
                
                # NEW: Handle image requests specifically
                if product_question_analysis['question_type'] == 'images':
                    if target_product.get('images') and len(target_product['images']) > 0:
                        image_list = target_product['images']
                        response_text = f"Here are the available images for **{target_product['title']}**:\n\n"
                        
                        for i, img in enumerate(image_list[:5], 1):  # Show up to 5 images
                            response_text += f"**Image {i}:** {img['src']}\n"
                        
                        if len(image_list) > 5:
                            response_text += f"\n*And {len(image_list) - 5} more images available.*"
                    else:
                        response_text = f"I don't have any images available for **{target_product['title']}** in our current database. You may want to visit the product page directly or contact customer service for visual information."
                else:
                    # Generate response for other product questions
                    response_text = openai_service.generate_product_specific_response(
                        target_product,
                        chat_message.message,
                        product_question_analysis['question_type']
                    )
                
                # Update context to the target product
                session_context[session_id]['context_product'] = target_product
                context_product = target_product
                
                show_exact_slider = False
                show_suggestions_slider = False
                exact_matches = []
                suggestions = []
                
                # Generate smart suggestions that avoid the just-asked question
                suggested_questions = generate_smart_suggestions(target_product, product_question_analysis['question_type'])
            else:
                # No target product found - ask for clarification
                if recent_products and len(recent_products) > 0:
                    response_text = f"I found {len(recent_products)} products in our recent results. Could you please specify which product you're asking about? For example, say 'the first product' or 'the second one'."
                else:
                    response_text = "I'd be happy to help you with product information! Could you please select a product first or tell me which specific product you're interested in?"
                
                suggested_questions = [
                    "Show me some products",
                    "Tell me about the first product",
                    "What products do you have?"
                ]

        elif intent == "PRODUCT_SEARCH":
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
                    # Fix: Handle keywords as both string and list
                    if keywords:
                        if isinstance(keywords, list):
                            search_query = " ".join(keywords)
                        else:
                            search_query = str(keywords)
                    else:
                        search_query = chat_message.message
            
            # NEW: Handle position-based product references
            elif user_preferences.get('product_position_reference'):
                position = user_preferences['product_position_reference']
                recent_products = session_context[session_id].get('recent_search_products', [])
                
                if recent_products and len(recent_products) >= position:
                    target_product = recent_products[position - 1]
                    
                    # Update context to this product
                    session_context[session_id]['context_product'] = target_product
                    context_product = target_product
                    
                    # Generate response about this specific product
                    response_text = openai_service.generate_product_specific_response(
                        target_product,
                        chat_message.message,
                        "general"
                    )
                    
                    # Show this product as the main result
                    exact_matches = [target_product]
                    show_exact_slider = True
                    show_suggestions_slider = False
                    
                    suggested_questions = [
                        "What colors are available?",
                        "What sizes does this come in?",
                        "What's the price?",
                        "Is there any discount?",
                    ]
                else:
                    response_text = f"I couldn't find a product at position {position} from the recent results. Please try a new search."
                    # Fix: Handle keywords as both string and list
                    if keywords:
                        if isinstance(keywords, list):
                            search_query = " ".join(keywords)
                        else:
                            search_query = str(keywords)
                    else:
                        search_query = chat_message.message
            
            else:
                # New product search
                # Fix: Handle keywords as both string and list
                if keywords:
                    if isinstance(keywords, list):
                        search_query = " ".join(keywords)
                    else:
                        search_query = str(keywords)
                else:
                    search_query = chat_message.message
                logger.info(f"Searching for: {search_query}")

                # PAGINATION FIX: Check if this is a pagination request for cached results
                is_pagination_request = False
                cached_query = session_context[session_id].get('cached_search_query', '')
                cached_results = session_context[session_id].get('cached_search_results', [])
                
                # Check if query matches cached query (for pagination)
                if cached_query and cached_results and search_query.lower() == cached_query.lower():
                    if chat_message.page_number and chat_message.page_number > 1:
                        is_pagination_request = True
                        logger.info(f"PAGINATION REQUEST detected: page {chat_message.page_number} of cached results")

                if is_pagination_request and cached_results:
                    # Use cached results for pagination
                    logger.info(f"Using {len(cached_results)} cached results for pagination")
                    all_products = cached_results
                else:
                    # New search - query vector database
                    max_results = user_preferences.get('max_results') or 50  # Default higher for filtering
                    search_limit = min(max_results * 2, 100)  # Search more to account for filtering
                    product_results = vector_service.search_products(search_query, limit=search_limit)

                if not is_pagination_request and product_results:
                    # Process results into exact matches
                    all_products = []
                    
                    # FIXED: Use the module-level normalize function
                    product_ids: List[str] = []
                    for p in product_results:
                        if not isinstance(p, dict):
                            continue
                        payload = p.get("product") if "product" in p else p
                        sid = payload.get("shopify_id") or payload.get("shopifyId") or payload.get("id")
                        sid = normalize_shopify_id(sid)
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

                        # FIXED: Format products for response with safe price handling
                        for product in db_products:
                            total_inventory = sum(v.inventory_quantity for v in product.variants)
                            
                            # FIXED: Include all images
                            all_images = []
                            for img in product.images:
                                all_images.append({
                                    "src": img.src,
                                    "alt": img.alt_text or product.title
                                })

                            variants_info = []
                            for variant in product.variants:
                                variants_info.append({
                                    "title": variant.title,
                                    "price": safe_float_convert(variant.price),
                                    "compare_at_price": safe_float_convert(variant.compare_at_price) if variant.compare_at_price else None,
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
                                "price": safe_float_convert(product.price),
                                "compare_at_price": safe_float_convert(product.compare_at_price) if product.compare_at_price else None,
                                "vendor": product.vendor,
                                "product_type": product.product_type,
                                "tags": product.tags,
                                "handle": product.handle,
                                "status": product.status,
                                "inventory_quantity": total_inventory,  # FIXED: Real inventory
                                "images": all_images,  # FIXED: All images
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

                    # CACHE: Store filtered results for pagination (only for new searches)
                    if not is_pagination_request:
                        session_context[session_id]['cached_search_results'] = filtered_products
                        session_context[session_id]['cached_search_query'] = search_query
                        logger.info(f"Cached {len(filtered_products)} products for query: {search_query}")

                    # PAGINATION: Determine products to show on this page
                    page_size = 5  # Products per page
                    start_idx = (current_page - 1) * page_size
                    end_idx = start_idx + page_size
                    
                    exact_matches = filtered_products[start_idx:end_idx]
                    has_more_exact = end_idx < len(filtered_products)
                    
                    logger.info(f"Showing products {start_idx+1}-{min(end_idx, len(filtered_products))} of {total_exact_matches} (page {current_page})")

                    # Generate numbered product mapping for "show me more like #X"
                    numbered_products = {}
                    for i, product in enumerate(exact_matches, 1):
                        numbered_products[i] = product
                    session_context[session_id]['numbered_products'] = numbered_products
                    
                    # NEW: Store recent search products for position references
                    session_context[session_id]['recent_search_products'] = exact_matches

                    # ENHANCED: Generate suggestions with FIXED inventory
                    # For suggestions, search for related products
                    suggestion_query = f"related to {search_query} alternative similar"
                    suggestion_results = vector_service.search_products(suggestion_query, limit=20)
                    
                    # Filter out exact matches from suggestions (if any)
                    exact_match_ids = set(p['shopify_id'] for p in exact_matches) if exact_matches else set()
                    
                    suggestion_products = []
                    for result in suggestion_results:
                        if not isinstance(result, dict):
                            continue
                        payload = result.get("product") if "product" in result else result
                        sid = normalize_shopify_id(payload.get("shopify_id") or payload.get("shopifyId") or payload.get("id"))
                        
                        if sid and sid not in exact_match_ids:
                            # FIXED: Get real inventory from database
                            real_inventory = get_product_inventory_from_db(sid, db)
                            
                            # Build suggestion product from payload with safe price conversion
                            img_src = None
                            if isinstance(payload.get("image"), dict):
                                img_src = payload["image"].get("src")
                            elif payload.get("images") and isinstance(payload["images"], list) and payload["images"]:
                                first_img = payload["images"][0]
                                if isinstance(first_img, dict):
                                    img_src = first_img.get("src")

                            # Safe price extraction
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
                                "price": safe_float_convert(price_val),
                                "compare_at_price": None,
                                "vendor": payload.get("vendor") or "",
                                "product_type": payload.get("product_type") or "",
                                "tags": payload.get("tags") or "",
                                "handle": payload.get("handle"),
                                "status": payload.get("status") or "active",
                                "inventory_quantity": real_inventory,  # FIXED: Real inventory
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

                    # ENHANCED: Set context product to first result for follow-ups
                    if exact_matches:
                        context_product = exact_matches[0]
                        session_context[session_id]['context_product'] = context_product
                        logger.info(f"Set new context product: {context_product['title']}")

                    # ENHANCED: Generate dynamic response based on results
                    # Special handling for pagination requests
                    if is_pagination_request:
                        showing_start = start_idx + 1
                        showing_end = min(end_idx, total_exact_matches)
                        response_text = f"Here are products {showing_start}-{showing_end} of {total_exact_matches} matches:"
                        show_exact_slider = True
                        show_suggestions_slider = False
                        suggested_questions = [
                            "Tell me about the first product",
                            "Show me more results" if has_more_exact else "Show me products under $50",
                            "What colors are available for product 1?",
                        ]
                    elif user_preferences.get('max_results') == 1:
                        if exact_matches:
                            response_text = f"Here's the product that matches your search: **{exact_matches[0]['title']}**"
                            show_exact_slider = True
                            suggested_questions = [
                                "What colors are available?",
                                "What sizes does this come in?",
                                "Show me the images",
                                "What's the price?",
                                "Is there any discount?",
                            ]
                        else:
                            response_text = "I couldn't find exactly what you're looking for, but here are some related suggestions:"
                            show_suggestions_slider = len(suggestions) > 0
                    elif total_exact_matches == 0:
                        response_text = "I couldn't find exact matches for your search, but here are some related suggestions you might like:"
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
                    # ENHANCED: No results found - generate alternative suggestions
                    response_text = "I couldn't find any products matching your search. Let me show you some other products you might like:"
                    
                    # Try a broader search for suggestions
                    general_query = "popular products"
                    general_results = vector_service.search_products(general_query, limit=10)
                    
                    suggestion_products = []
                    for result in general_results:
                        if not isinstance(result, dict):
                            continue
                        payload = result.get("product") if "product" in result else result
                        sid = normalize_shopify_id(payload.get("shopify_id") or payload.get("shopifyId") or payload.get("id"))
                        
                        if sid:
                            # FIXED: Get real inventory from database
                            real_inventory = get_product_inventory_from_db(sid, db)
                            
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
                                "price": safe_float_convert(price_val),
                                "compare_at_price": None,
                                "vendor": payload.get("vendor") or "",
                                "product_type": payload.get("product_type") or "",
                                "tags": payload.get("tags") or "",
                                "handle": payload.get("handle"),
                                "status": payload.get("status") or "active",
                                "inventory_quantity": real_inventory,  # FIXED: Real inventory
                                "images": [{"src": img_src, "alt": payload.get("title")}] if img_src else [],
                                "variants_count": len(variants) if isinstance(variants, list) else 0,
                                "options_count": len(payload.get("options") or []),
                                "variants": [],
                            })
                    
                    suggestions = suggestion_products[:5]
                    show_suggestions_slider = len(suggestions) > 0
                    exact_matches = []
                    show_exact_slider = False
                    
                    suggested_questions = [
                        "Show me shirts",
                        "Find me a dress",
                        "Show me shoes",
                        "What's on sale?",
                        "Show me popular products"
                    ]

        elif intent == "ORDER_INQUIRY":
        # Extract order info with enhanced parsing
            extracted_info = intent_analysis.get("extracted_info", {})
            order_number = extracted_info.get("order_number")
            email = extracted_info.get("customer_email") or chat_message.email
            specific_query = extracted_info.get("specific_query", "")
            address_type = extracted_info.get("address_type", "")
            
            # Save newly provided info for future use
            if email:
                session_context[session_id]["pending_order_email"] = email
            if order_number:
                session_context[session_id]["pending_order_number"] = order_number
                
            # Check for saved partial info from previous messages
            saved_email = session_context[session_id].get("pending_order_email")
            saved_order_number = session_context[session_id].get("pending_order_number")
            
            # Merge current info with saved info
            if not email and saved_email:
                email = saved_email
                logger.info(f"Using saved email: {email}")
            if not order_number and saved_order_number:
                order_number = saved_order_number
                logger.info(f"Using saved order number: {order_number}")
                
            # FALLBACK: Use regex extraction if AI missed it
            fallback_info = extract_order_info(chat_message.message)
            if not order_number and fallback_info["order_number"]:
                order_number = fallback_info["order_number"]
                logger.info(f"Fallback extracted order number: {order_number}")
            if not email and fallback_info["email"]:
                email = fallback_info["email"]
                logger.info(f"Fallback extracted email: {email}")
            
            # Check what's missing and respond accordingly
            if not order_number and not email:
                response_text = "For your privacy and security, I need your order number and email address to look up your order. Please provide both."
                orders = None
                suggested_questions = ["My order number is 1234", "My email is user@example.com", "Order 1234, email user@example.com"]
            elif not order_number:
                # Have email but no order number
                response_text = f"Thank you! I have your email ({email}). Now, please provide your order number so I can look up your order details."
                orders = None
                suggested_questions = ["My order number is 1234", "Order 1234", "It's order 1234"]
            elif not email:
                # Have order number but no email
                response_text = f"Thank you! I have your order number ({order_number}). For security, please also provide your email address associated with this order."
                orders = None
                suggested_questions = ["My email is user@example.com", "user@example.com", "It's user@example.com"]
            else:
                # Have both - proceed with order lookup
                logger.info(f"Looking up order {order_number} for email {email}")
                
                try:
                    order_number_int = int(order_number)
                except (ValueError, TypeError):
                    response_text = f"The order number '{order_number}' doesn't look valid. Please provide a numeric order number (e.g., 1234)."
                    orders = None
                    suggested_questions = ["My order number is 1234", "Let me try again", "Show me products instead"]
                else:
                    # ENHANCED: Load order with addresses using joinedload
                    query = db.query(Order).options(
                        joinedload(Order.line_items),
                        joinedload(Order.addresses)  # Add this to load address data
                    )
                    query = query.filter(Order.order_number == order_number_int)
                    query = query.filter(Order.email == email)
                    order = query.first()
                    
                    if not order:
                        response_text = f"Sorry, I couldn't find an order with number {order_number} for email {email}. Please verify both details and try again. Make sure you're using the exact email and order number from your order confirmation."
                        orders = None
                        # Clear saved info if order not found
                        session_context[session_id]["pending_order_email"] = None
                        session_context[session_id]["pending_order_number"] = None
                        suggested_questions = ["Let me try a different order number", "Check order with different email", "Show me products instead"]
                    else:
                        # SUCCESS! Clear saved info and return order details
                        session_context[session_id]["pending_order_email"] = None
                        session_context[session_id]["pending_order_number"] = None
                        
                        # Format line items
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
                        
                        # ENHANCED: Format addresses  
                        addresses = []
                        for addr in getattr(order, "addresses", []):
                            addresses.append({
                                "address_type": getattr(addr, "address_type", ""),
                                "name": getattr(addr, "name", ""),
                                "company": getattr(addr, "company", ""),
                                "address1": getattr(addr, "address1", ""),
                                "address2": getattr(addr, "address2", ""),
                                "city": getattr(addr, "city", ""),
                                "province": getattr(addr, "province", ""),
                                "zip": getattr(addr, "zip", ""),
                                "country": getattr(addr, "country", ""),
                                "phone": getattr(addr, "phone", "")
                            })
                        
                        # Build comprehensive order info
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
                            "addresses": addresses,  # Include address data
                            "total_items": sum(item["quantity"] for item in line_items)
                        }
                        
                        orders = [order_info]
                        
                        # ENHANCED: Generate focused response based on query type
                        response_text = openai_service.generate_order_response(orders, chat_message.message)
                        suggested_questions = ["Track this order", "When will it arrive?", "Show me similar products"]

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

        # ENHANCED: Always return the current context product in response

        # Helper to trim product objects for storage
        def _trim_product(p: Dict) -> Dict:
            if not p:
                return {}
            return {
                "id": p.get("id"),
                "shopify_id": p.get("shopify_id"),
                "title": p.get("title"),
                "price": p.get("price"),
                "compare_at_price": p.get("compare_at_price"),
                "vendor": p.get("vendor"),
                "product_type": p.get("product_type"),
                "inventory_quantity": p.get("inventory_quantity"),
                "images": [{"src": i.get("src"), "alt": i.get("alt") or i.get("alt_text")}
                           for i in (p.get("images") or [])[:5]],
            }

        def _trim_order(o: Dict) -> Dict:
            if not o:
                return {}
            return {
                "id": o.get("id"),
                "shopify_id": o.get("shopify_id"),
                "order_number": o.get("order_number"),
                "total_price": o.get("total_price"),
                "financial_status": o.get("financial_status"),
                "fulfillment_status": o.get("fulfillment_status"),
                "created_at": o.get("created_at"),
                "line_items": [
                    {
                        "title": li.get("title"),
                        "quantity": li.get("quantity"),
                        "price": li.get("price"),
                        "vendor": li.get("vendor"),
                    }
                    for li in (o.get("line_items") or [])[:10]
                ],
            }

        # Prepare payloads to store
        trimmed_exact = [_trim_product(p) for p in (exact_matches or [])[:50]]
        trimmed_suggestions = [_trim_product(p) for p in (suggestions or [])[:50]]
        trimmed_orders = [_trim_order(o) for o in (orders or [])[:50]] if orders else []
        trimmed_context = _trim_product(context_product) if context_product else None

        # === Persist: assistant turn ===
        try:
            if ChatMessageDB and session_db:
                # Create assistant message first so we get its ID
                assistant_msg = ChatMessageDB(
                    session_id=session_db.id,
                    role="assistant",
                    content=response_text,
                    extra={
                        "intent": intent,
                        "applied_filters": applied_filters,
                        "search_metadata": search_metadata,
                        "suggested_questions": suggested_questions,
                        "show_exact_slider": show_exact_slider,
                        "show_suggestions_slider": show_suggestions_slider,
                        "total_exact_matches": total_exact_matches,
                        "total_suggestions": total_suggestions,
                        "current_page": current_page,
                        "has_more_exact": has_more_exact,
                        "has_more_suggestions": has_more_suggestions,
                        # Persist sliders/orders/context (also in normalized tables below)
                        "exact_matches": trimmed_exact,
                        "suggestions": trimmed_suggestions,
                        "orders": trimmed_orders,
                        "context_product": trimmed_context,
                        "selected_product_id": session_context.get(session_id, {}).get("selected_product_id"),
                    }
                )
                db.add(assistant_msg)
                db.flush()  # obtain assistant_msg.id

                # Also store normalized rows if models are available
                if ChatMessageProductDB:
                    product_rows = []
                    for p in trimmed_exact:
                        product_rows.append(ChatMessageProductDB(
                            message_id=assistant_msg.id,
                            kind="exact",
                            shopify_id=p.get("shopify_id"),
                            title=p.get("title"),
                            vendor=p.get("vendor"),
                            product_type=p.get("product_type"),
                            price=str(p.get("price")),
                            compare_at_price=str(p.get("compare_at_price")),
                            inventory_quantity=p.get("inventory_quantity"),
                            snapshot=p,
                        ))
                    for p in trimmed_suggestions:
                        product_rows.append(ChatMessageProductDB(
                            message_id=assistant_msg.id,
                            kind="suggestion",
                            shopify_id=p.get("shopify_id"),
                            title=p.get("title"),
                            vendor=p.get("vendor"),
                            product_type=p.get("product_type"),
                            price=str(p.get("price")),
                            compare_at_price=str(p.get("compare_at_price")),
                            inventory_quantity=p.get("inventory_quantity"),
                            snapshot=p,
                        ))
                    if product_rows:
                        db.add_all(product_rows)

                if ChatMessageOrderDB and trimmed_orders:
                    order_rows = []
                    for o in trimmed_orders:
                        order_rows.append(ChatMessageOrderDB(
                            message_id=assistant_msg.id,
                            shopify_id=o.get("shopify_id"),
                            order_number=o.get("order_number"),
                            total_price=str(o.get("total_price")),
                            financial_status=o.get("financial_status"),
                            fulfillment_status=o.get("fulfillment_status"),
                            created_at_remote=o.get("created_at"),
                            snapshot=o,
                        ))
                    if order_rows:
                        db.add_all(order_rows)

                if ChatSessionDB and session_db:
                    session_db.last_activity_at = func.now()
                db.commit()
        except Exception as e:
            logger.error(f"Persistence (assistant turn) failed: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        # === End persist assistant turn ===

        return ChatResponse(
                response=response_text,
                intent=intent,
                confidence=confidence,
                exact_matches=exact_matches if show_exact_slider else [],
                suggestions=suggestions if show_suggestions_slider else [],
                orders=orders,
                context_product=context_product,  # Always include current context
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
            context_product=None,
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
        "Show me the images",  # NEW: Image suggestion
        "Tell me about the material",
        "Is there any discount on this?",
        "How much does this cost?",
        "Is this in stock?",
        "Show me similar products",
        "What options are available?"
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
        elif last_question_type == "images" and ("image" in suggestion_lower):
            should_skip = True
        elif last_question_type == "material" and ("material" in suggestion_lower):
            should_skip = True
        elif last_question_type == "discount" and ("discount" in suggestion_lower):
            should_skip = True
        elif last_question_type == "price" and ("cost" in suggestion_lower):
            should_skip = True
        elif last_question_type == "availability" and ("stock" in suggestion_lower):
            should_skip = True
        elif last_question_type == "options" and ("option" in suggestion_lower):
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


try:
    from app.models.chat import User, ChatSession, ChatMessage
except Exception:
    User = ChatSession = ChatMessage = None  # type: ignore

@router.get("/chat/history")
def get_history(
    email: str = Query(..., description="User email"),
    session_id: Optional[str] = Query(None, description="Chat session id; if absent, use most recent session"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Return messages for the given session.
    If session_id is missing, picks the user's most recent session.
    """
    # Models must be imported at module level:
    # from app.models.chat import User, ChatSession, ChatMessage
    if User is None:
        return {"session_id": None, "messages": []}
    user = db.query(User).filter(User.email == email.strip().lower()).one_or_none()
    if not user:
        return {"session_id": None, "messages": []}

    # Resolve session
    session = None
    if session_id:
        session = (
            db.query(ChatSession)
              .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
              .one_or_none()
        )
    if not session:
        session = (
            db.query(ChatSession)
              .filter(ChatSession.user_id == user.id)
              .order_by(desc(ChatSession.last_activity_at))
              .first()
        )
    if not session:
        return {"session_id": None, "messages": []}

    # Fetch messages oldest → newest
    msgs = (
        db.query(ChatMessage)
          .filter(ChatMessage.session_id == session.id)
          .order_by(asc(ChatMessage.created_at))
          .limit(limit)
          .all()
    )
    return {
        "session_id": session.id,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "extra": m.extra,
            }
            for m in msgs
        ],
    }