# app/models/order_address.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class OrderAddress(Base):
    __tablename__ = "order_addresses"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    address_type = Column(String, nullable=False, index=True)  # 'billing' or 'shipping'
    first_name = Column(String)
    last_name = Column(String)
    company = Column(String)
    address1 = Column(String)
    address2 = Column(String)
    city = Column(String)
    province = Column(String)
    country = Column(String)
    zip = Column(String)
    phone = Column(String)
    name = Column(String)
    country_code = Column(String)
    province_code = Column(String)
    
    # Relationship
    order = relationship("Order", back_populates="addresses")