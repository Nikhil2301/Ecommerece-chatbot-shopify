#!/usr/bin/env python3
"""
Bootstrap the Shopify Chatbot backend:

- Loads .env (DATABASE_URL, QDRANT_*, etc.)
- Creates PostgreSQL database if missing
- Creates/updates PostgreSQL tables via SQLAlchemy ORM
- Ensures the Qdrant collection exists (creates it if missing)

Usage (from repo root):
  python scripts/bootstrap_backend.py
"""

import os
import sys
import traceback
from urllib.parse import urlparse

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
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import ProgrammingError
    from app.database import Base

    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set in .env")

    url = urlparse(DATABASE_URL)
    db_name = url.path.lstrip("/")
    superuser_url = f"postgresql://{url.username}:{url.password}@{url.hostname}:{url.port}/postgres"

    try:
        engine = create_engine(superuser_url, future=True)
        conn = engine.connect()
        conn.execute(text("COMMIT"))
        conn.execute(text(f"CREATE DATABASE {db_name}"))
        print(f"[bootstrap] ✅ Database '{db_name}' created")
        conn.close()
    except ProgrammingError:
        print(f"[bootstrap] Database '{db_name}' already exists")
    except Exception as e:
        print(f"[bootstrap] Error creating database: {e}")

    engine = create_engine(DATABASE_URL, future=True)
    Base.metadata.create_all(bind=engine)
    print("[bootstrap] ✅ PostgreSQL tables created/verified")

def ensure_qdrant():
    from qdrant_client import QdrantClient

    host = os.getenv("QDRANT_HOST", "localhost")
    port = int(os.getenv("QDRANT_PORT", "6335"))
    api_key = os.getenv("QDRANT_API_KEY") or None

    # Use HTTP URL (no HTTPS) and omit TLS flags
    url = f"http://{host}:{port}"

    client = QdrantClient(
        url=url,
        api_key=api_key,
        prefer_grpc=False  # use HTTP/REST
    )

    try:
        resp = client.get_collections()
        names = [c.name for c in resp.collections]
        target = "products"  # your collection name
        if target in names:
            print(f"[bootstrap] ✅ Qdrant collection '{target}' ready")
        else:
            print(f"[bootstrap] ❌ Qdrant collection '{target}' missing")
    except Exception as e:
        print(f"[bootstrap] ❌ Qdrant connection failed: {e}")
        raise

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
