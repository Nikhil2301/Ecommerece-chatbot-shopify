# app/models/inventory_item.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from app.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    shopify_id = Column(String, unique=True, index=True, nullable=False)
    sku = Column(String, nullable=True)
    requires_shipping = Column(Boolean, default=False)
    tracked = Column(Boolean, default=True)
    cost = Column(Float, nullable=True)
    country_code_of_origin = Column(String, nullable=True)
    province_code_of_origin = Column(String, nullable=True)        # NEW
    harmonized_system_code = Column(String, nullable=True)
    weight_value = Column(Float, nullable=True)                    # NEW
    weight_unit = Column(String, nullable=True)                    # NEW
    shopify_created_at = Column(DateTime(timezone=True), nullable=True)  # NEW
    shopify_updated_at = Column(DateTime(timezone=True), nullable=True)  # NEW
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())