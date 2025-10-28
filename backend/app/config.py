import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6335))
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL")
    SHOPIFY_API_VERSION = os.getenv("SHOPIFY_API_VERSION", "2024-04")
    SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
    SHOPIFY_WEBHOOK_SECRET = os.getenv("SHOPIFY_WEBHOOK_SECRET")

    # Shopify App OAuth (NEW)
    SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY")
    SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET")
    APP_URL = os.getenv("APP_URL", "http://localhost:8000")
    OAUTH_SCOPES = "read_products,read_orders,read_customers"
    
    APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT = int(os.getenv("APP_PORT", 8000))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

settings = Settings()
