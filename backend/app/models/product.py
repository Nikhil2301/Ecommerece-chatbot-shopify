from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    shopify_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)
    vendor = Column(String, index=True, default="", nullable=True)  # ✅ Allow None, default ""
    product_type = Column(String, index=True, default="", nullable=True)  # ✅ Allow None, default ""
    tags = Column(Text, default="", nullable=True)  # ✅ Allow None, default ""
    handle = Column(String, unique=True, index=True, nullable=True)  # ✅ Allow None
    status = Column(String, default="active", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    shopify_created_at = Column(DateTime(timezone=True))
    shopify_updated_at = Column(DateTime(timezone=True))
    
    # Relationships
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
