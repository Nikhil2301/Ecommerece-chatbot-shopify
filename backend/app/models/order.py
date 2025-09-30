# app/models/order.py
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    shopify_id = Column(String, unique=True, index=True, nullable=False)
    order_number = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    customer_id = Column(String, index=True)
    financial_status = Column(String, index=True)
    fulfillment_status = Column(String, index=True)
    total_price = Column(Float, nullable=False)
    subtotal_price = Column(Float)
    total_tax = Column(Float)
    total_discounts = Column(Float, default=0.00)
    currency = Column(String, default="USD")
    gateway = Column(String)
    note = Column(Text)
    tags = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Relationships
    line_items = relationship("OrderLineItem", back_populates="order", cascade="all, delete-orphan")
    addresses = relationship("OrderAddress", back_populates="order", cascade="all, delete-orphan")