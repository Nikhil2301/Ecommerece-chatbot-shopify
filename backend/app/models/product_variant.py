# app/models/product_variant.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    shopify_variant_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String)
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float)
    position = Column(Integer)
    inventory_policy = Column(String, default="deny")
    option1 = Column(String)
    option2 = Column(String)
    option3 = Column(String)
    taxable = Column(Boolean, default=True)
    barcode = Column(String, index=True)
    fulfillment_service = Column(String, default="manual")
    grams = Column(Integer)
    inventory_management = Column(String)
    requires_shipping = Column(Boolean, default=True)
    sku = Column(String, index=True)
    weight = Column(Float)
    weight_unit = Column(String, default="g")
    inventory_item_id = Column(String)
    inventory_quantity = Column(Integer, default=0)
    old_inventory_quantity = Column(Integer, default=0)
    image_id = Column(Integer, ForeignKey("product_images.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    shopify_created_at = Column(DateTime(timezone=True))
    shopify_updated_at = Column(DateTime(timezone=True))
    
    # Relationship
    product = relationship("Product", back_populates="variants")