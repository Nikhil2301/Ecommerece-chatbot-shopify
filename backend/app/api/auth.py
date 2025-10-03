
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from sqlalchemy import desc

from app.database import get_db

try:
    from app.models.chat import User, ChatSession, ChatMessage
except Exception:
    User = ChatSession = ChatMessage = None  # type: ignore

router = APIRouter(prefix="/api/v1", tags=["auth"])

@router.post("/auth/identify")
def identify(payload: dict, db: Session = Depends(get_db)):
    '''Identify a user by email.
    Reuse the most recent existing chat session by default (so history appears across browsers).
    Pass {"new_session": true} in payload to force creating a new session.
    '''
    email = (payload.get("email") or "").strip().lower()
    new_session = bool(payload.get("new_session", False))
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    if not (User and ChatSession):
        # Tables not ready yet; still return a uuid so FE can proceed
        return {"user_id": -1, "email": email, "session_id": str(uuid4()), "reused": False}

    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        user = User(email=email)
        db.add(user)
        db.flush()

    session = None
    reused = False

    if not new_session:
        session = (
            db.query(ChatSession)
              .filter(ChatSession.user_id == user.id)
              .order_by(desc(ChatSession.last_activity_at))
              .first()
        )
        if session:
            reused = True

    if not session:
        session = ChatSession(
            id=str(uuid4()),
            user_id=user.id,
            session_metadata=payload.get("metadata") or {}
        )
        db.add(session)
        db.flush()

    db.commit()
    return {"user_id": user.id, "email": user.email, "session_id": session.id, "reused": reused}
