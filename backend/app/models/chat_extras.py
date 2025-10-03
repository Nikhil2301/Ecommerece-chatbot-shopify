# filepath: backend/app/models/chat_extras.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.sql import func
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship

from app.database import Base

class ChatMessageProduct(Base):
    __tablename__ = "chat_message_products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="CASCADE"), index=True, nullable=False)
    # 'exact' | 'suggestion'
    kind = Column(String, nullable=False)

    # Minimal snapshot of product
    shopify_id = Column(String, index=True)
    title = Column(String)
    vendor = Column(String)
    product_type = Column(String)
    price = Column(String)
    compare_at_price = Column(String)
    inventory_quantity = Column(Integer)

    # Store additional fields/images in JSON
    snapshot = Column(MutableDict.as_mutable(JSON), default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        Index("ix_chat_message_products_msg_kind", "message_id", "kind"),
    )

class ChatMessageOrder(Base):
    __tablename__ = "chat_message_orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="CASCADE"), index=True, nullable=False)

    shopify_id = Column(String, index=True)
    order_number = Column(String)
    total_price = Column(String)
    financial_status = Column(String)
    fulfillment_status = Column(String)
    created_at_remote = Column(String)

    snapshot = Column(MutableDict.as_mutable(JSON), default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        Index("ix_chat_message_orders_msg", "message_id"),
    )
