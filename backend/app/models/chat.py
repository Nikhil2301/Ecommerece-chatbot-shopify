from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict  # <-- add this
# from sqlalchemy.dialects.postgresql import JSONB  # (optional) if you're on Postgres

from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    # renamed python attribute; keep DB column name "metadata"
    session_metadata = Column("metadata", MutableDict.as_mutable(JSON), default=dict)
    # If you're on Postgres and want JSONB:
    # session_metadata = Column("metadata", MutableDict.as_mutable(JSONB), default=dict)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    __table_args__ = (Index("ix_chat_sessions_user_last", "user_id", "last_activity_at"),)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' | 'assistant' | 'system'
    content = Column(Text, nullable=False)
    tokens = Column(Integer)
    # track in-place updates and avoid mutable default literal
    extra = Column(MutableDict.as_mutable(JSON), default=dict)
    # For Postgres JSONB:
    # extra = Column(MutableDict.as_mutable(JSONB), default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ChatSession", back_populates="messages")
    __table_args__ = (Index("ix_chat_messages_session_created", "session_id", "created_at"),)
