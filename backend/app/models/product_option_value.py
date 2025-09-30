# app/models/product_option_value.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ProductOptionValue(Base):
    __tablename__ = "product_option_values"
    
    id = Column(Integer, primary_key=True, index=True)
    option_id = Column(Integer, ForeignKey("product_options.id", ondelete="CASCADE"), nullable=False)
    value = Column(String, nullable=False)
    position = Column(Integer)
    
    # Relationship
    option = relationship("ProductOption", back_populates="values")