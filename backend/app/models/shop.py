from sqlalchemy import Column, String, DateTime, Boolean
from datetime import datetime
from app.database import Base

class Shop(Base):
    __tablename__ = "shops"
    
    shop_domain = Column(String, primary_key=True, index=True)
    access_token = Column(String, nullable=False)
    scope = Column(String)
    installed_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
