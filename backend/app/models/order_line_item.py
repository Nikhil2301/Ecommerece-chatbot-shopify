# app/models/order_line_item.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class OrderLineItem(Base):
    __tablename__ = "order_line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    shopify_line_item_id = Column(String, unique=True, index=True, nullable=False)
    admin_graphql_api_id = Column(String)
    current_quantity = Column(Integer, nullable=False)
    fulfillable_quantity = Column(Integer, default=0)
    fulfillment_service = Column(String, default="manual")
    fulfillment_status = Column(String)
    gift_card = Column(Boolean, default=False)
    grams = Column(Integer)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    product_exists = Column(Boolean, default=True)
    product_id = Column(String, index=True)
    quantity = Column(Integer, nullable=False)
    requires_shipping = Column(Boolean, default=True)
    sku = Column(String, index=True)
    taxable = Column(Boolean, default=True)
    title = Column(String)
    total_discount = Column(Float, default=0.00)
    variant_id = Column(String, index=True)
    variant_inventory_management = Column(String)
    variant_title = Column(String)
    vendor = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order = relationship("Order", back_populates="line_items")
    price_sets = relationship("LineItemPriceSet", back_populates="line_item", cascade="all, delete-orphan")
    tax_lines = relationship("LineItemTaxLine", back_populates="line_item", cascade="all, delete-orphan")