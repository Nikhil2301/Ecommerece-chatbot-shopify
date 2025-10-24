# Enhanced OpenAI Service - Fixed Intent Analysis and Response Generation
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
        """Initialize OpenAI client with compatible httpx client"""
        try:
            http_client = httpx.Client(timeout=30.0)
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
            self.model = settings.OPENAI_MODEL
            logger.info("OpenAI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI service: {e}")
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
            
    async def detect_order_intent(self, message: str) -> dict:
        """Detect if the message is asking about ordered items using OpenAI."""
        system_prompt = """
        You are an intent classification system. Determine if the user is asking about their previous orders.
        Return a JSON with 'is_order_related' (boolean) and 'confidence' (0-1) fields.
        """
        
        user_prompt = f"""
        Message: "{message}"
        
        Is this message asking about previously ordered items or products?
        Respond with a JSON object like: {{"is_order_related": boolean, "confidence": float}}
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"Order intent detection result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in detect_order_intent: {str(e)}")
            # Fallback to simple keyword matching if there's an error
            order_keywords = ['order', 'ordered', 'purchase', 'bought', 'previous order', 'last order', 'my order']
            lower_msg = message.lower()
            is_related = any(keyword in lower_msg for keyword in order_keywords)
            return {
                "is_order_related": is_related,
                "confidence": 0.7 if is_related else 0.1
            }

    def analyze_user_intent_with_context(self, message: str, conversation_history: List[Dict], context_product: Optional[Dict] = None) -> Dict:
        """ENHANCED: Intent analysis with better context awareness to fix Issue #3"""
        context_text = ""
        dynamic_options_info = ""
        extracted_options = {}
        dynamic_qtypes = ["size", "color", "material"]  # default when no dynamic options

        if context_product:
            context_text = f"Current product context: {context_product.get('title', 'Unknown')} (ID: {context_product.get('shopify_id', 'NA')})"
            
            # Extract dynamic options for context
            extracted_options = self.extract_product_options(context_product)
            options = extracted_options.get("options", {})
            
            if options:
                dynamic_qtypes = [name.lower() for name in options.keys()]
                dynamic_options_info = "Available product options:\n"
                for opt_name, values in options.items():
                    if values:
                        shown = values[:6]  # Show first 6
                        suffix = f" (and {len(values) - 6} more)" if len(values) > 6 else ""
                        dynamic_options_info += f"- {opt_name}: {', '.join(shown)}{suffix}\n"
                
                context_text += "\n" + dynamic_options_info

        if conversation_history:
            recent_messages = conversation_history[-4:]  # Last 4 messages
            context_text += "\nRecent conversation:\n"
            for msg in recent_messages:
                role = "User" if msg.get("role") == "user" else "Assistant"
                context_text += f"{role}: {msg.get('message', '')}\n"

        # Enhanced question types with address support
        base_question_types = {
            "price": "asking about cost, pricing, how much",
            "discount": "asking about sales, discounts, deals, offers",
            "availability": "asking about stock, availability, in stock",
            "images": "asking to see product images, photos, pictures",
            "address": "asking about shipping address, billing address, delivery address, address details",
            "shipping": "asking about shipping details, delivery information, tracking",
            "status": "asking about order status, order progress, fulfillment status",
            "general": "general product information"
        }

        # Dynamically generate question types based on extracted options
        if dynamic_options_info:
            option_question_types = {}
            for opt_name in extracted_options.get("options", {}).keys():
                lname = opt_name.lower()
                if any(word in lname for word in ["color", "colour", "size", "material", "fabric", "age", "option"]):
                    option_question_types[f"{opt_name.lower()}"] = f"asking about {opt_name.lower()} options or variants"
            
            if option_question_types:
                base_question_types.update(option_question_types)

        # ENHANCED: System prompt with better context understanding for Issue #1 & #3
        system_prompt = f"""You are an AI assistant that analyzes user messages to determine their intent in an e-commerce context.

{context_text}

The database schema includes:
- products: id, shopify_id, title, description, price, compare_at_price, vendor, product_type, tags, handle, status, images (JSON), variants (JSON), options (JSON)
- product_images: id, product_id, src, alt_text
- product_variants: id, product_id, title, price, compare_at_price, inventory_quantity, sku
- product_options: id, product_id, name, position
- product_option_values: id, option_id, value, position
- orders: id, shopify_id, order_number, email, customer_id, financial_status, fulfillment_status, total_price

Classify user messages into:
1. PRODUCT_SEARCH: user seeks product recommendations OR asks about specific product details (price, discount, sizes, availability, colors, etc.)
2. ORDER_INQUIRY: user wants order status/details
3. GENERAL_CHAT: greeting/general conversation
4. HELP: user requests assistance

CRITICAL CONTEXT ANALYSIS FOR ISSUE #1:
- If user asks "what options are available?", "what's the price?", "is there discount?" without mentioning a specific product, and there's a current product context, this is a follow-up question (is_followup_question: true) about that product.
- If user mentions specific product names or searches for new products, this is a new search (is_followup_question: false).
- If user says "show me", "find me", "I want", this is typically a new search.
- PRICE QUERIES: If user asks "show me products under ₹100" or "items under $50", this is PRODUCT_SEARCH with price filter.

RELEVANCE FILTERING FOR ISSUE #3:
- Only generate relevant responses based on the context
- Avoid generic or out-of-context suggestions
- If no context exists, provide general helpful responses only

Question Types: {base_question_types}

EXTRACTION RULES:
- Extract order_number from patterns like "order #1234", "order 1234", "my order is 1234", "#1234", or just "1234" if context suggests order inquiry
- Extract customer_email from patterns like "email user@example.com", "my email is user@example.com", or just "user@example.com"
- If user provides ONLY a number like "1234" in an order context, extract it as order_number
- If user provides ONLY an email address, extract it as customer_email
- Be flexible with formats: accept order numbers with or without "#", accept various email formats
- PRICE EXTRACTION: Extract price filters from "under ₹100", "below $50", "products under 100", etc.

ADDRESS QUERY DETECTION:
- Look for patterns like "address", "shipping address", "billing address", "delivery address", "where is it being shipped"
- Extract address_type: "shipping", "billing", or "both" based on user query
- If just "address" without specification, default to "both"

Respond in JSON: {{"intent": "PRODUCT_SEARCH|ORDER_INQUIRY|GENERAL_CHAT|HELP", "confidence": 0.0-1.0, "extracted_info": {{"keywords": "...", "order_number": "...", "customer_email": "...", "address_type": "...", "specific_query": "...", "price_filter": {{"max": number}} }}, "is_followup_question": true/false, "question_type": "{'/'.join(base_question_types.keys())}", "context_aware": true/false}}"""

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
            logger.info(f"Intent analysis result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing intent: {e}")
            return {
                "intent": "PRODUCT_SEARCH",
                "confidence": 0.5,
                "extracted_info": {"keywords": message, "order_number": "", "customer_email": "", "address_type": "", "specific_query": ""},
                "is_followup_question": False,
                "question_type": "general",
                "context_aware": False
            }

    def analyze_user_intent(self, message: str) -> Dict:
        """Backward compatibility - calls enhanced version"""
        return self.analyze_user_intent_with_context(message, [], None)

    def generate_product_specific_response(self, product: Dict, user_query: str, question_type: str) -> str:
        """ENHANCED: Generate detailed response about a specific product with image support"""
        if not product:
            return "I don't have information about a specific product right now. Could you tell me which product you're asking about?"

        # Handle image requests directly without OpenAI API call
        if question_type == "images":
            images = product.get("images", [])
            if images and len(images) > 0:
                image_list = []
                for i, img in enumerate(images[:3], 1):  # Show first 3 images
                    image_list.append(f"**Image {i}:** {img.get('src', 'No URL')}")
                
                response = f"Here are the available images for **{product.get('title', 'this product')}**:\n\n" + "\n".join(image_list)
                
                if len(images) > 3:
                    response += f"\n\n*And {len(images) - 3} more images available.*"
                
                return response
            else:
                return f"I don't have any images available for **{product.get('title', 'this product')}** in our current database."

        # Extract comprehensive product information
        extracted_options = self.extract_product_options(product)

        # Get price information with safe conversion
        price = product.get("price")
        compare_price = product.get("compare_at_price")
        
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
                    discount_info = f"{discount_percent:.0f}% OFF! Save ${savings:.2f} (was ${compare_val:.2f})"
            except:
                pass

        # Build product context
        product_context = f"""
Product: {product.get('title', 'N/A')}
- Price: {price_str}
- Discount: {discount_info}
- Vendor: {product.get('vendor', 'N/A')}
- Type: {product.get('product_type', 'N/A')}
- In Stock: {product.get('inventory_quantity', 0)} units
- Status: {product.get('status', 'active')}
- Images Available: {len(product.get('images', []))} images

Available Options:
"""

        # Add dynamic options information
        options = extracted_options.get("options", {})
        for opt_name, values in options.items():
            if values:
                product_context += f"- {opt_name}: {', '.join(values)}\n"

        # Add variant details
        variants = product.get("variants", [])
        if variants:
            product_context += f"\nVariant Details:\n"
            for variant in variants[:3]:  # Show first 3 variants
                variant_info = f"- {variant.get('title', 'N/A')}: ${variant.get('price', 'N/A')}"
                if variant.get('inventory_quantity', 0) > 0:
                    variant_info += f" (In Stock: {variant.get('inventory_quantity')} units)"
                else:
                    variant_info += " (Out of Stock)"
                product_context += variant_info + "\n"

        # Question-specific prompts
        question_prompts = {
            "price": "The user is asking about pricing. Focus on the current price, any discounts, and value information.",
            "discount": "The user is asking about discounts or sales. Check if there are any current discounts and highlight savings.",
            "availability": "The user is asking about stock/availability. Focus on inventory levels and availability status.",
            "images": "The user is asking about product images. Tell them that images are available and list the image URLs if present."
        }

        # Dynamically generate question prompts based on extracted options
        for opt_name in options.keys():
            lname = opt_name.lower()
            question_prompts[lname] = f"The user is asking about {opt_name.lower()} options. Focus on available {opt_name.lower()} values and their availability."

        question_prompts["options"] = "The user is asking about product options or features. Provide comprehensive option information."
        question_prompts["general"] = "Provide helpful product information based on the user's question."
        question_prompts["material"] = question_prompts.get("material", "The user is asking about materials or fabric. Focus on what the product is made of and material properties.")  # Fallback if not dynamic

        context_instruction = question_prompts.get(question_type, "Provide helpful product information based on the user's question.")

        # Limit examples to first two options to avoid overly long prompts
        example_options = "/".join([n.lower() for n in list(options.keys())[:2]]) if len(options) > 0 else "options"

        system_prompt = f"""You are a helpful e-commerce assistant. {context_instruction}

The user is asking about THIS SPECIFIC PRODUCT: {product_context}

User's question: {user_query}

Important Instructions:
1. Answer specifically about THIS product only
2. Be direct and focused on their exact question
3. Use the product information provided above
4. If asking about options (e.g., colors/sizes/{example_options}), list what's actually available
5. If asking about price/discount, use the exact pricing information provided
6. If asking about availability, use the inventory information provided
7. If asking about images, mention the available images and provide URLs if requested
8. Be conversational and helpful
9. Don't repeat unnecessary product details - focus on their specific question
10. If the information they're asking for isn't available, say so clearly
11. NEVER provide irrelevant or generic information - stay focused on the question

Generate a direct, specific answer to their question about this product."""

        try:
            response = self.client.chat.completions.create(
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
            
            # Dynamic fallback response based on question type
            if question_type in extracted_options.get("options", {}):
                opt_values = extracted_options["options"].get(question_type, [])
                if opt_values:
                    return f"The **{product.get('title')}** is available in these {question_type}: {', '.join(opt_values)}. All {question_type} are currently in stock!"
                else:
                    return f"The **{product.get('title')}** comes in its standard {question_type}. Let me know if you'd like more details!"
            
            elif question_type == "price":
                return f"The **{product.get('title')}** is priced at {price_str}. {discount_info}"
            
            elif question_type == "images":
                images = product.get("images", [])
                if images:
                    return f"The **{product.get('title')}** has {len(images)} images available. You can view them in the product gallery above."
                else:
                    return f"Unfortunately, no images are currently available for **{product.get('title')}** in our database."
            
            else:
                return f"Here's information about the **{product.get('title')}**: {price_str}. {discount_info}. Let me know what specific details you'd like to know!"

    def extract_product_options(self, product: Dict) -> Dict:
        """Dynamically extract option names/values and map variant attributes accordingly."""
        options = product.get("options", []) or []
        variants = product.get("variants", []) or []

        # Preserve original option order to map option1..3
        option_names = [opt.get("name", "").strip() for opt in options]

        # Build dynamic options dict: name -> set(values)
        dynamic_options: Dict[str, set] = {}
        for opt in options:
            name = opt.get("name", "").strip()
            if not name:
                continue
            values = opt.get("values", []) or []
            vals = [v.get("value") if isinstance(v, dict) else v for v in values]
            dynamic_options.setdefault(name, set()).update([v for v in vals if v])

        # Variant-level aggregation
        stock_status = []
        for variant in variants:
            # Map variant option1..3 to actual option names
            attributes: Dict[str, Optional[str]] = {}
            variant_option_values = [variant.get("option1"), variant.get("option2"), variant.get("option3")]
            
            for idx, val in enumerate(variant_option_values):
                if idx < len(option_names) and option_names[idx]:
                    name = option_names[idx]
                    if val:
                        dynamic_options.setdefault(name, set()).add(val)
                        attributes[name] = val

            stock_status.append({
                "title": variant.get("title"),
                "inventory_quantity": variant.get("inventory_quantity", 0),
                "sku": variant.get("sku"),
                "available": variant.get("inventory_quantity", 0) > 0,
                "attributes": attributes,
            })

        # Convert sets to sorted lists for serialization
        options_as_lists = {k: sorted(list(v)) for k, v in dynamic_options.items()}

        return {
            "options": options_as_lists,
            "stock_status": stock_status,
            "option_names": option_names,
        }

    def generate_product_recommendations(self, products: List[Dict], user_query: str, question_type: str = "general") -> str:
        """ENHANCED: Generate product recommendation response with better context for Issue #7"""
        if not products:
            return "I couldn't find any products matching your request. Could you try describing what you're looking for differently?"

        # Check if this is a price-based query for Issue #7
        is_price_query = any(word in user_query.lower() for word in ['under', 'below', 'budget', 'max', 'price', 'cost', '₹', '$'])
        
        if len(products) == 1:
            product = products[0].get("product", {}) if "product" in products[0] else products[0]
            extracted_options = self.extract_product_options(product)
            
            options_summary = ""
            if extracted_options.get("options"):
                options_summary = f" with options like {', '.join(extracted_options['options'].keys())}"
                
            if is_price_query:
                price = product.get('price', 0)
                currency = "₹" if "₹" in user_query or "rupee" in user_query.lower() else "$"
                return f"I found **{product.get('title', 'this product')}** at {currency}{price} that matches your budget!{options_summary} You can ask me about its details, availability, or any other questions."
            else:
                return f"I found **{product.get('title', 'this product')}** that matches your search!{options_summary} You can ask me about its price, availability, images, or any other details."
        
        else:
            # Dynamically summarize common options across products if possible
            common_options = set()
            price_range = {"min": float('inf'), "max": 0}
            
            for p in products[:5]:  # Check first few
                opts = self.extract_product_options(p).get("options", {})
                common_options.update(opts.keys())
                
                # Calculate price range
                try:
                    price = float(p.get('price', 0))
                    if price > 0:
                        price_range["min"] = min(price_range["min"], price)
                        price_range["max"] = max(price_range["max"], price)
                except:
                    pass
            
            options_summary = f" with options like {', '.join(list(common_options)[:2])}" if common_options else ""
            
            if is_price_query and price_range["min"] != float('inf'):
                currency = "₹" if "₹" in user_query or "rupee" in user_query.lower() else "$"
                price_info = f" Prices range from {currency}{price_range['min']:.2f} to {currency}{price_range['max']:.2f}."
            else:
                price_info = ""
                
            return f"I found **{len(products)} products** that match your search.{options_summary}{price_info} Take a look at the options below, and feel free to ask me about any specific product!"

    def generate_order_response(self, orders: List[Dict], user_query: str) -> str:
        """Generate focused response about order based on specific user query"""
        if not orders:
            return "I couldn't find any orders matching your request. Please check your order number or email address."

        order = orders[0]  # Process first order

        # Check if this is a specific query type
        query_lower = user_query.lower()

        # Address-specific queries
        if any(word in query_lower for word in ["address", "shipping address", "billing address", "delivery address", "where"]):
            return self._generate_address_response(order, user_query)

        # Status-specific queries
        if any(word in query_lower for word in ["status", "progress", "shipped", "delivered", "tracking"]):
            return self._generate_status_response(order, user_query)

        # Item-specific queries
        if any(word in query_lower for word in ["items", "products", "what did i order", "contents"]):
            return self._generate_items_response(order, user_query)

        # Default: Generate comprehensive response using OpenAI
        return self._generate_comprehensive_response(order, user_query)

    def _generate_address_response(self, order: Dict, user_query: str) -> str:
        """Generate response focused on address information"""
        query_lower = user_query.lower()

        # Extract addresses from order
        addresses = order.get("addresses", [])
        shipping_address = None
        billing_address = None

        for addr in addresses:
            addr_type = addr.get("address_type", "").lower()
            if addr_type == "shipping":
                shipping_address = addr
            elif addr_type == "billing":
                billing_address = addr

        response_parts = []

        # Determine what type of address user wants
        if "shipping" in query_lower or "delivery" in query_lower:
            if shipping_address:
                response_parts.append(self._format_address(shipping_address, "Shipping"))
            else:
                response_parts.append("No shipping address found for this order.")
                
        elif "billing" in query_lower:
            if billing_address:
                response_parts.append(self._format_address(billing_address, "Billing"))
            else:
                response_parts.append("No billing address found for this order.")
                
        else:
            # User asked for "address" generally - show both if available
            if shipping_address:
                response_parts.append(self._format_address(shipping_address, "Shipping"))
            if billing_address:
                response_parts.append(self._format_address(billing_address, "Billing"))
                
            if not shipping_address and not billing_address:
                response_parts.append("No address information found for this order.")

        if not response_parts:
            response_parts.append("I don't have address information for this order.")

        # Add order context
        order_context = f"Order #{order.get('order_number', 'N/A')}"
        return f"Here are the address details for {order_context}:\n\n" + "\n\n".join(response_parts)

    def _format_address(self, address: Dict, address_type: str) -> str:
        """Format address information nicely"""
        lines = [f"**{address_type} Address:**"]
        
        if address.get("name"):
            lines.append(f"Name: {address['name']}")
        if address.get("company"):
            lines.append(f"Company: {address['company']}")
        if address.get("address1"):
            lines.append(f"Address: {address['address1']}")
        if address.get("address2"):
            lines.append(f"Address 2: {address['address2']}")
        
        # City, State, Zip on one line
        location_parts = []
        if address.get("city"):
            location_parts.append(address["city"])
        if address.get("province"):
            location_parts.append(address["province"])
        if address.get("zip"):
            location_parts.append(address["zip"])
        
        if location_parts:
            lines.append(f"Location: {', '.join(location_parts)}")
        
        if address.get("country"):
            lines.append(f"Country: {address['country']}")
        if address.get("phone"):
            lines.append(f"Phone: {address['phone']}")
        
        return "\n".join(lines)

    def _generate_status_response(self, order: Dict, user_query: str) -> str:
        """Generate response focused on order status"""
        order_num = order.get("order_number", "N/A")
        financial_status = order.get("financial_status", "Unknown")
        fulfillment_status = order.get("fulfillment_status", "Unfulfilled")

        status_explanation = {
            "paid": "Your payment has been processed successfully.",
            "partially_paid": "We have received partial payment for your order.",
            "pending": "Your payment is being processed.",
            "authorized": "Your payment method has been authorized.",
            "partially_refunded": "Part of your payment has been refunded.",
            "refunded": "Your payment has been fully refunded.",
            "voided": "Your payment has been cancelled."
        }

        fulfillment_explanation = {
            "unfulfilled": "Your order hasn't been shipped yet.",
            "partial": "Some items in your order have been shipped.",
            "fulfilled": "Your order has been shipped.",
            "restocked": "Your order has been cancelled and items returned to stock."
        }

        response = f"Here's the current status of Order #{order_num}:\n\n"
        response += f"**Payment Status:** {financial_status.title()}\n"
        response += status_explanation.get(financial_status.lower(), "")
        response += f"\n\n**Shipping Status:** {fulfillment_status.title()}\n"
        response += fulfillment_explanation.get(fulfillment_status.lower(), "")

        if fulfillment_status.lower() == "unfulfilled" and financial_status.lower() in ["paid", "authorized"]:
            response += "\n\nYour order will be processed and shipped soon. You'll receive a tracking number once it's dispatched."
        elif fulfillment_status.lower() == "fulfilled":
            response += "\n\nYour order has been shipped! Check your email for tracking information."

        return response

    def _generate_items_response(self, order: Dict, user_query: str) -> str:
        """Generate response focused on ordered items"""
        line_items = order.get("line_items", [])
        order_num = order.get("order_number", "N/A")

        if not line_items:
            return f"No items found for Order #{order_num}."

        response = f"Here are the items in Order #{order_num}:\n\n"
        
        for item in line_items:
            name = item.get("title", item.get("name", "Unknown Item"))
            quantity = item.get("quantity", 1)
            price = item.get("price", 0)
            
            response += f"• {quantity}x {name}"
            if price:
                response += f" - ${price} each"
            response += "\n"

        total_items = sum(item.get("quantity", 1) for item in line_items)
        total_price = order.get("total_price", 0)
        
        response += f"\n**Total:** {total_items} items"
        if total_price:
            response += f" - ${total_price} {order.get('currency', '')}"

        return response

    def _generate_comprehensive_response(self, order: Dict, user_query: str) -> str:
        """Generate comprehensive order response using OpenAI"""
        
        # Format order information
        order_text = f"""
Order #{order.get('order_number', 'N/A')}:
- Status: {order.get('financial_status', 'N/A')} (Payment), {order.get('fulfillment_status', 'Unfulfilled')} (Shipping)
- Total: {order.get('total_price', 'N/A')} {order.get('currency', '')}
- Date: {order.get('created_at', 'N/A')}
- Items: {len(order.get('line_items', []))} items

Items Ordered:
"""

        # Add line items
        for item in order.get("line_items", []):
            # Handle both dict and OrderLineItem objects
            if hasattr(item, 'quantity'):  # It's an OrderLineItem
                item_name = getattr(item, 'title', getattr(item, 'name', 'Unknown'))
                item_price = f"${getattr(item, 'price', 'N/A')}" if hasattr(item, 'price') else 'N/A'
                item_text = f"- {getattr(item, 'quantity', 1)}x {item_name} ({item_price} each)"
            else:  # It's a dict
                item_text = f"- {item.get('quantity', 1)}x {item.get('title', item.get('name', 'Unknown'))} (${item.get('price', 'N/A')} each)"
            
            order_text += item_text + "\n"

        # Add addresses if available
        addresses = order.get("addresses", [])
        for addr in addresses:
            addr_type = addr.get("address_type", "").title()
            if addr_type:
                order_text += f"\n{addr_type} Address: {addr.get('name', '')}, {addr.get('address1', '')}, {addr.get('city', '')}, {addr.get('province', '')} {addr.get('zip', '')}"

        system_prompt = f"""You are a helpful customer service assistant. Based on the user's query about their order, provide a clear, informative response that:

1. Addresses their specific question
2. Provides relevant order details including items, totals, and shipping if available
3. Explains order status in simple terms
4. Offers additional help if needed
5. NEVER provide irrelevant information - stay focused on what they asked

User Query: {user_query}
Order Information: {order_text}

Provide a helpful, professional response."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Please help me understand my order details."}
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error generating order response: {e}")
            # Fallback response
            return f"I found your order #{order.get('order_number', 'N/A')}. Status: {order.get('financial_status', 'N/A')} (Payment), {order.get('fulfillment_status', 'Unfulfilled')} (Shipping). Total: {order.get('total_price', 'N/A')}. Please let me know if you have specific questions!"

    def generate_general_response(self, message: str) -> str:
        """ENHANCED: Generate general conversational response with better relevance for Issue #3"""
        
        # Check for common patterns that should have specific responses
        message_lower = message.lower()
        
        # Greeting responses
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return "Hello! I'm your shopping assistant. I can help you find products, check prices, answer questions about items, and look up your orders. What can I help you with today?"
        
        # Help requests
        if any(word in message_lower for word in ['help', 'assist', 'support']):
            return "I'm here to help! I can:\n• Find products based on your preferences\n• Answer questions about specific items (price, sizes, colors, availability)\n• Check your order status\n• Provide product recommendations\n\nJust tell me what you're looking for or ask me any question!"
        
        # Thank you responses
        if any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
            return "You're welcome! I'm glad I could help. Is there anything else you'd like to know about our products or services?"

        system_prompt = """You are a friendly e-commerce chatbot assistant. You help customers find products and check their orders.

Keep responses:
- Warm and helpful
- Brief but informative (2-3 sentences max)
- Focused on how you can assist with shopping
- Professional yet conversational
- NEVER generic or irrelevant

If users ask about products, encourage them to describe what they're looking for.
If they ask about orders, let them know they can provide an order number or email.
Always stay relevant to e-commerce and shopping assistance."""

        try:
            response = self.client.chat.completions.create(
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