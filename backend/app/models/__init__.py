# app/models/__init__.py
# Import all models to ensure they're registered with SQLAlchemy

from .product import Product
from .product_image import ProductImage
from .product_option import ProductOption
from .product_option_value import ProductOptionValue
from .product_variant import ProductVariant
from .order import Order
from .order_line_item import OrderLineItem
from .line_item_price_set import LineItemPriceSet
from .line_item_tax_line import LineItemTaxLine
from .order_address import OrderAddress
from .chat import User, ChatSession, ChatMessage
from .chat_extras import ChatMessageProduct, ChatMessageOrder
from .shop import Shop

__all__ = [
    "Product",
    "ProductImage", 
    "ProductOption",
    "ProductOptionValue",
    "ProductVariant",
    "Order",
    "OrderLineItem",
    "LineItemPriceSet", 
    "LineItemTaxLine",
    "OrderAddress",
    # Chat-related models
    "User",
    "ChatSession",
    "ChatMessage",
    "ChatMessageProduct",
    "ChatMessageOrder",
    "Shop",
]