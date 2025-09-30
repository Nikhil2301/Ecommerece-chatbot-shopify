# File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/backend/app/services/openai_service.py
# REPLACE YOUR EXISTING openai_service.py WITH THIS ENHANCED VERSION

import openai
from typing import List, Dict, Optional
from app.config import settings
import json
import logging

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
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
• product_images: id, product_id, src, alt_text
• product_variants: id, product_id, title, price, compare_at_price, inventory_quantity, sku
• product_options: id, product_id, name, position
• product_option_values: id, option_id, value, position
• orders: id, shopify_id, order_number, email, customer_id, financial_status, fulfillment_status, total_price

Classify user messages into:
1. PRODUCT_SEARCH – user seeks product recommendations OR asks about specific product details (price, discount, sizes, availability, colors, etc.)
2. ORDER_INQUIRY – user wants order status/details
3. GENERAL_CHAT – greeting/general conversation
4. HELP – user requests assistance

CRITICAL CONTEXT ANALYSIS:
- If user asks "what colors are available?", "what's the price?", "what sizes?", "is there discount?" without mentioning a specific product, and there's a current product context, this is a follow-up question (is_followup_question: true) about that product.
- If user mentions specific product names or searches for new products, this is a new search (is_followup_question: false).
- If user says "show me", "find me", "I want", this is typically a new search.

Question Types:
- price: asking about cost, pricing, how much
- discount: asking about sales, discounts, deals, offers
- size: asking about sizes, fit, measurements
- availability: asking about stock, availability, in stock
- color: asking about colors, colour options
- material: asking about fabric, material, what it's made of
- options: general product options or features
- general: general product information

Extract any mentioned order_number, customer_email, and keywords for product searches.

Respond in JSON:
{{
  "intent": "PRODUCT_SEARCH|ORDER_INQUIRY|GENERAL_CHAT|HELP",
  "confidence": 0.0-1.0,
  "extracted_info": {{
    "keywords": ["..."],
    "order_number": "...",
    "customer_email": "...",
    "is_followup_question": true/false,
    "question_type": "price|discount|size|availability|color|material|options|general",
    "context_aware": true/false
  }}
}}"""

        try:
            response = openai.chat.completions.create(
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
                "intent": "GENERAL_CHAT",
                "confidence": 0.5,
                "extracted_info": {"keywords": [], "is_followup_question": False, "question_type": "general"}
            }

    def analyze_user_intent(self, message: str) -> Dict:
        """Backward compatibility - calls enhanced version"""
        return self.analyze_user_intent_with_context(message, [], None)

    def generate_product_specific_response(self, product: Dict, user_query: str, question_type: str) -> str:
        """Generate detailed response about a specific product for follow-up questions"""
        
        if not product:
            return "I don't have information about a specific product right now. Could you tell me which product you're asking about?"
        
        # Extract comprehensive product information
        extracted_options = self.extract_product_options(product)
        
        # Get price information
        price = product.get('price')
        compare_price = product.get('compare_at_price')
        
        try:
            price_val = float(price) if price else 0
            price_str = f"${price_val:.2f}" if price_val > 0 else "Price not available"
        except:
            price_str = "Price not available"
        
        # Calculate discount if available
        discount_info = "No current discount"
        if compare_price and price:
            try:
                compare_val = float(compare_price)
                price_val = float(price)
                if compare_val > price_val:
                    discount_percent = ((compare_val - price_val) / compare_val) * 100
                    savings = compare_val - price_val
                    discount_info = f"**{discount_percent:.0f}% OFF!** Save ${savings:.2f} (was ${compare_val:.2f})"
            except:
                pass
        
        # Build product context
        product_context = f"""
**Product: {product.get('title', 'N/A')}**
- **Price:** {price_str}
- **Discount:** {discount_info}
- **Vendor:** {product.get('vendor', 'N/A')}
- **Type:** {product.get('product_type', 'N/A')}
- **In Stock:** {product.get('inventory_quantity', 0)} units
- **Status:** {product.get('status', 'active')}

**Available Options:**
"""
        
        # Add dynamic options information
        options = extracted_options.get('options', {})
        for opt_name, values in options.items():
            if values:
                product_context += f"- **{opt_name}:** {', '.join(values)}\n"
        
        # Add variant details
        variants = product.get('variants', [])
        if variants:
            product_context += f"\n**Variant Details:**\n"
            for variant in variants[:5]:  # Show first 5 variants
                variant_info = f"- {variant.get('title', 'N/A')}: ${variant.get('price', 'N/A')} "
                if variant.get('inventory_quantity', 0) > 0:
                    variant_info += f"(✅ In Stock: {variant.get('inventory_quantity')} units)"
                else:
                    variant_info += "(❌ Out of Stock)"
                product_context += variant_info + "\n"
        
        # Question-specific system prompts
        question_prompts = {
            "color": "The user is asking specifically about color options. Focus on available colors and their availability.",
            "size": "The user is asking about sizes. Focus on size options, fit information, and size availability.",
            "price": "The user is asking about pricing. Focus on the current price, any discounts, and value information.",
            "discount": "The user is asking about discounts or sales. Check if there are any current discounts and highlight savings.",
            "availability": "The user is asking about stock/availability. Focus on inventory levels and availability status.",
            "material": "The user is asking about materials or fabric. Focus on what the product is made of and material properties.",
            "options": "The user is asking about product options or features. Provide comprehensive option information."
        }
        
        context_instruction = question_prompts.get(question_type, "Provide helpful product information based on the user's question.")
        
        system_prompt = f"""You are a helpful e-commerce assistant. {context_instruction}

The user is asking about THIS SPECIFIC PRODUCT (they're following up on a previous conversation):

{product_context}

User's question: "{user_query}"

Important Instructions:
1. Answer specifically about THIS product only
2. Be direct and focused on their exact question
3. Use the product information provided above
4. If asking about colors/sizes/options, list what's actually available
5. If asking about price/discount, use the exact pricing information provided
6. If asking about availability, use the inventory information provided
7. Be conversational and helpful
8. Don't repeat unnecessary product details - focus on their specific question
9. If the information they're asking for isn't available, say so clearly

Generate a direct, specific answer to their question about this product."""

        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Please answer my question about {product.get('title')}: {user_query}"}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating product-specific response: {e}")
            
            # Fallback response based on question type
            if question_type == "color":
                colors = extracted_options.get('colors', [])
                if colors:
                    return f"The **{product.get('title')}** is available in these colors: **{', '.join(colors)}**. All colors are currently in stock!"
                else:
                    return f"The **{product.get('title')}** comes in its standard color. Let me know if you'd like more details!"
                    
            elif question_type == "size":
                sizes = extracted_options.get('sizes', [])
                if sizes:
                    return f"The **{product.get('title')}** is available in these sizes: **{', '.join(sizes)}**. Check the size chart for the best fit!"
                else:
                    return f"This product comes in a standard size. Contact us for specific measurements if needed!"
                    
            elif question_type == "price":
                return f"The **{product.get('title')}** is priced at **{price_str}**. {discount_info}"
                
            else:
                return f"Here's information about the **{product.get('title')}**: {price_str}. Let me know what specific details you'd like to know!"

    def extract_product_options(self, product: Dict) -> Dict:
        """Dynamically extract option names/values and map variant attributes accordingly."""
        options = product.get('options', []) or []
        variants = product.get('variants', []) or []
        
        # Preserve original option order to map option1..3
        option_names = [
            (opt.get('name') or '').strip()
            for opt in options
        ]
        
        # Build dynamic options dict: name -> set(values)
        dynamic_options: Dict[str, set] = {}
        for opt in options:
            name = (opt.get('name') or '').strip()
            if not name:
                continue
            values = opt.get('values', []) or []
            vals = [v.get('value') if isinstance(v, dict) else v for v in values]
            dynamic_options.setdefault(name, set()).update([v for v in vals if v])
        
        # Variant-level aggregation
        stock_status = []
        for variant in variants:
            # Map variant option1..3 to actual option names
            attributes: Dict[str, Optional[str]] = {}
            variant_option_values = [variant.get('option1'), variant.get('option2'), variant.get('option3')]
            
            for idx, val in enumerate(variant_option_values):
                if idx < len(option_names) and option_names[idx]:
                    name = option_names[idx]
                    if val:
                        dynamic_options.setdefault(name, set()).add(val)
                        attributes[name] = val
            
            stock_status.append({
                'title': variant.get('title'),
                'inventory_quantity': variant.get('inventory_quantity', 0),
                'sku': variant.get('sku'),
                'available': variant.get('inventory_quantity', 0) > 0,
                'attributes': attributes,
            })
        
        # Backward-compatible convenience keys
        def pick_values_by_name(substrs: List[str]) -> List[str]:
            out = set()
            for name, vals in dynamic_options.items():
                lname = name.lower()
                if any(s in lname for s in substrs):
                    out.update(vals)
            return sorted(list(out))
        
        colors = pick_values_by_name(['color', 'colour'])
        sizes = pick_values_by_name(['size'])
        fabrics = pick_values_by_name(['fabric', 'material'])
        age_groups = pick_values_by_name(['age', 'age group', 'age_group'])
        
        # Convert sets to sorted lists for serialization
        options_as_lists = {k: sorted(list(v)) for k, v in dynamic_options.items()}
        
        return {
            'options': options_as_lists,  # dynamic: { option_name: [values...] }
            'colors': colors,
            'sizes': sizes,
            'fabrics': fabrics,
            'age_groups': age_groups,
            'stock_status': stock_status,
            'option_names': option_names,  # preserve order
        }

    def generate_product_recommendations(self, products: List[Dict], user_query: str, question_type: str = "general") -> str:
        """Generate product recommendation response - for new searches"""
        
        if not products:
            return "I couldn't find any products matching your request. Could you try describing what you're looking for differently?"
        
        # For new searches, provide overview
        if len(products) == 1:
            product = products[0].get("product", {}) if "product" in products[0] else products[0]
            return f"I found **{product.get('title', 'this product')}** that matches your search! You can ask me about its colors, sizes, price, or any other details."
        else:
            return f"I found {len(products)} products that match your search. Take a look at the options below, and feel free to ask me about any specific product!"

    def generate_order_response(self, orders: List[Dict], user_query: str) -> str:
        """Generate response about order status"""
        if not orders:
            return "I couldn't find any orders matching your request. Please check your order number or email address."
        
        orders_text = ""
        for order in orders:
            # List all items with quantity and name
            item_lines = []
            for item in order.get('line_items', []):
                item_lines.append(f"- {item.get('quantity', 1)}x {item.get('title', 'N/A')}")
            
            items_text = '\n'.join(item_lines)
            
            orders_text += f"""
### Order #{order.get('order_number', 'N/A')}
- **Status:** {order.get('financial_status', 'N/A')} (Payment), {order.get('fulfillment_status', 'Unfulfilled')} (Shipping)
- **Total:** ${order.get('total_price', 'N/A')} {order.get('currency', '')}
- **Date:** {order.get('created_at', 'N/A')}
- **Items:** {len(order.get('line_items', []))} item(s)

**Ordered Items:**
{items_text}

---
"""
        
        system_prompt = f"""You are a helpful customer service assistant. Based on the user's query about their order(s), provide a clear, informative response that:

1. Addresses their specific question
2. Provides relevant order details
3. Explains order status in simple terms
4. Offers additional help if needed

User Query: {user_query}

Order Information:
{orders_text}

Provide a helpful, professional response."""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Please help me understand my order status."}
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating order response: {e}")
            return "I can see your order information. Please let me know if you have any specific questions about your order status."

    def generate_general_response(self, message: str) -> str:
        """Generate general conversational response"""
        system_prompt = """You are a friendly e-commerce chatbot assistant. You help customers find products and check their orders.

Keep responses:
- Warm and helpful
- Brief but informative  
- Focused on how you can assist
- Professional yet conversational

If users ask about products, encourage them to describe what they're looking for.
If they ask about orders, let them know they can provide an order number or email.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating general response: {e}")
            return "Hello! I'm here to help you find products and check your orders. How can I assist you today?"