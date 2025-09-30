#!/usr/bin/env python3
"""
Bootstrap the Shopify Chatbot backend:

- Loads .env (DATABASE_URL, QDRANT_*, etc.)
- Creates/updates PostgreSQL tables via SQLAlchemy ORM
- Ensures the Qdrant collection exists (creates it if missing)

Usage (from repo root):
  python3 scripts/bootstrap_backend.py
"""

import os
import sys
import traceback

# 1. Detect project root & insert into path
HERE = os.path.abspath(os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, ROOT)

# 2. Load .env if present
try:
    from dotenv import load_dotenv
    env_path = os.path.join(ROOT, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"[bootstrap] Loaded env from {env_path}")
    else:
        print(f"[bootstrap] No .env found at {env_path}")
except ImportError:
    print("[bootstrap] python-dotenv not installed; skipping .env load")

def ensure_db():
    from sqlalchemy import create_engine
    from app.database import Base  # import Base here
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_engine(DATABASE_URL, future=True, echo=False)
    print(f"[bootstrap] Using DATABASE_URL={DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("[bootstrap] ✅ PostgreSQL tables created/verified")

def ensure_qdrant():
    from app.services.vector_service import VectorService

    vector_service = VectorService()
    
    # Just ensure collection exists by instantiating VectorService,
    # which runs _setup_collection() in __init__
    info = vector_service.get_collection_info()
    if info:
        print(f"[bootstrap] ✅ Qdrant collection '{vector_service.collection_name}' ready")
    else:
        print(f"[bootstrap] ❌ Failed to verify Qdrant collection '{vector_service.collection_name}'")


def main():
    try:
        ensure_db()
    except Exception:
        print("[bootstrap] ❌ DB init failed")
        traceback.print_exc()
        sys.exit(1)

    try:
        ensure_qdrant()
    except Exception:
        print("[bootstrap] ❌ Qdrant init failed")
        traceback.print_exc()
        sys.exit(2)

    print("[bootstrap] 🚀 Bootstrap complete")

if __name__ == "__main__":
    main()
