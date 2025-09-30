# app/models/line_item_tax_line.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class LineItemTaxLine(Base):
    __tablename__ = "line_item_tax_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    line_item_id = Column(Integer, ForeignKey("order_line_items.id", ondelete="CASCADE"), nullable=False)
    channel_liable = Column(Boolean, default=False)
    price = Column(Float, nullable=False)
    rate = Column(Float)
    title = Column(String)
    shop_money_amount = Column(Float)
    shop_money_currency = Column(String)
    presentment_money_amount = Column(Float)
    presentment_money_currency = Column(String)
    
    # Relationship
    line_item = relationship("OrderLineItem", back_populates="tax_lines")