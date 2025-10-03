# File: backend/app/services/openai_service.py

from openai import OpenAI
from typing import List, Dict, Optional
from app.config import settings
import json
import logging
import httpx

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        # FIXED: Create OpenAI client with compatible httpx client
        try:
            # Create httpx client without proxies parameter
            http_client = httpx.Client(timeout=30.0)

            # Initialize OpenAI client with custom http client
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
            self.model = settings.OPENAI_MODEL
            logger.info("OpenAI service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize OpenAI service: {e}")
            # Fallback initialization
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL

    def analyze_user_intent_with_context(self, message: str, conversation_history: List[Dict], context_product: Optional[Dict] = None) -> Dict:
        """Enhanced intent analysis with conversation context and product memory"""

        # Build conversation context
        context_text = ""
        if context_product:
            context_text = f"Current product context: {context_product.get('title', 'Unknown')} (ID: {context_product.get('shopify_id', 'N/A')})\n"

        if conversation_history:
            recent_messages = conversation_history[-4:]  # Last 4 messages
            context_text += "Recent conversation:\n"
            for msg in recent_messages:
                role = "User" if msg.get('role') == 'user' else "Assistant"
                context_text += f"{role}: {msg.get('message', '')}\n"

        system_prompt = f"""You are an AI assistant that analyzes user messages to determine their intent in an e-commerce context.

{context_text}

The database schema includes:
• products: id, shopify_id, title, description, price, compare_at_price, vendor, product_type, tags, handle, status, images (JSON), variants (JSON), options (JSON)

Classify user messages into:
1. PRODUCT_SEARCH – user seeks product recommendations OR asks about specific product details
2. ORDER_INQUIRY – user wants order status/details
3. GENERAL_CHAT – greeting/general conversation
4. HELP – user requests assistance

Respond in JSON:
{{
"intent": "PRODUCT_SEARCH|ORDER_INQUIRY|GENERAL_CHAT|HELP",
"confidence": 0.0-1.0,
"extracted_info": {{
"keywords": ["..."],
"order_number": "...",
"customer_email": "...",
"is_followup_question": true/false,
"question_type": "price|discount|size|availability|color|material|options|images|general"
}}
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"Intent analysis: {result}")
            return result

        except Exception as e:
            logger.error(f"Error analyzing intent: {e}")
            return {
                "intent": "PRODUCT_SEARCH",  # Default to search instead of general chat
                "confidence": 0.5,
                "extracted_info": {"keywords": [message], "is_followup_question": False, "question_type": "general"}
            }

    def analyze_user_intent(self, message: str) -> Dict:
        """Backward compatibility - calls enhanced version"""
        return self.analyze_user_intent_with_context(message, [], None)

    def generate_product_specific_response(self, product: Dict, user_query: str, question_type: str) -> str:
        """Generate detailed response about a specific product"""

        if not product:
            return "I don't have information about a specific product right now. Could you tell me which product you're asking about?"

        # Handle image requests directly
        if question_type == "images":
            images = product.get('images', [])
            if images and len(images) > 0:
                image_list = ""
                for i, img in enumerate(images[:3], 1):
                    image_list += f"**Image {i}:** {img.get('src', 'No URL')}\n"

                response = f"Here are the available images for **{product.get('title', 'this product')}**:\n\n{image_list}"
                return response
            else:
                return f"I don't have any images available for **{product.get('title', 'this product')}** in our current database."

        # Get basic product info
        title = product.get('title', 'N/A')
        price = product.get('price', 'N/A')
        description = product.get('description', '')[:200] + "..." if len(product.get('description', '')) > 200 else product.get('description', '')

        try:
            system_prompt = f"""You are a helpful e-commerce assistant. Answer specifically about this product:

**Product: {title}**
- Price: ${price}
- Description: {description}

User's question: "{user_query}"

Provide a helpful, direct answer about this specific product."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.3,
                max_tokens=200
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error generating product-specific response: {e}")
            return f"Here's information about **{title}**: ${price}. {description}"

    def extract_product_options(self, product: Dict) -> Dict:
        """Extract product options"""
        options = product.get('options', []) or []
        variants = product.get('variants', []) or []

        dynamic_options = {}
        for opt in options:
            name = (opt.get('name') or '').strip()
            if name:
                values = opt.get('values', []) or []
                vals = [v.get('value') if isinstance(v, dict) else v for v in values]
                dynamic_options[name] = [v for v in vals if v]

        return {
            'options': dynamic_options,
            'colors': [],
            'sizes': [],
            'variants': variants
        }

    def generate_product_recommendations(self, products: List[Dict], user_query: str, question_type: str = "general") -> str:
        """Generate product recommendation response"""

        if not products:
            return "I couldn't find any products matching your request. Could you try describing what you're looking for differently?"

        if len(products) == 1:
            product = products[0].get("product", {}) if "product" in products[0] else products[0]
            return f"I found **{product.get('title', 'this product')}** that matches your search! You can ask me about its details."
        else:
            return f"I found {len(products)} products that match your search. Take a look at the options below!"

    def generate_order_response(self, orders: List[Dict], user_query: str) -> str:
        """Generate response about order status"""

        if not orders:
            return "I couldn't find any orders matching your request. Please check your order number or email address."

        order = orders[0]
        return f"I found your order #{order.get('order_number', 'N/A')}. Status: {order.get('financial_status', 'N/A')} (Payment), {order.get('fulfillment_status', 'Unfulfilled')} (Shipping). Total: ${order.get('total_price', 'N/A')}"

    def generate_general_response(self, message: str) -> str:
        """Generate general conversational response"""

        try:
            system_prompt = """You are a friendly e-commerce chatbot assistant. Keep responses warm, helpful, and brief."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=100
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error generating general response: {e}")
            return "Hello! I'm here to help you find products and check your orders. How can I assist you today?"
