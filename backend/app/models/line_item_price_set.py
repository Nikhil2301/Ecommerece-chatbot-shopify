# app/models/line_item_price_set.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class LineItemPriceSet(Base):
    __tablename__ = "line_item_price_sets"
    
    id = Column(Integer, primary_key=True, index=True)
    line_item_id = Column(Integer, ForeignKey("order_line_items.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # 'price' or 'total_discount'
    shop_money_amount = Column(Float)
    shop_money_currency = Column(String)
    presentment_money_amount = Column(Float)
    presentment_money_currency = Column(String)
    
    # Relationship
    line_item = relationship("OrderLineItem", back_populates="price_sets")