from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
from pathlib import Path
from datetime import datetime
import os

# Import your existing routers
from app.api.chat import router as chat_router
from app.api.products import router as products_router
from app.api.orders import router as orders_router
from app.api.webhooks import router as webhooks_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("app.log")
    ]
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="AI E-commerce Chatbot API",
    description="Intelligent shopping assistant with product search and order management",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat_router, prefix="/api/v1", tags=["chat"])
app.include_router(products_router, prefix="/api/v1", tags=["products"])
app.include_router(orders_router, prefix="/api/v1", tags=["orders"])
app.include_router(webhooks_router, prefix="/api/v1", tags=["webhooks"])

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("Starting AI E-commerce Chatbot API...")
    
    # Create necessary directories
    os.makedirs("logs", exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    # Initialize services
    try:
        from app.database import engine
        from app.models.product import Base as ProductBase
        from app.models.order import Base as OrderBase
        
        # Create tables if they don't exist
        ProductBase.metadata.create_all(bind=engine)
        OrderBase.metadata.create_all(bind=engine)
        
        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    # Initialize vector service
    try:
        from app.services.vector_service import VectorService
        vector_service = VectorService()
        logger.info("Vector service initialized successfully")
    except Exception as e:
        logger.error(f"Vector service initialization failed: {e}")
        
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("Shutting down AI E-commerce Chatbot API...")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI E-commerce Chatbot API",
        "version": "2.0.0",
        "status": "running",
        "docs_url": "/docs",
        "features": [
            "Product Search with AI",
            "Order Management",
            "Dual Slider Results",
            "Smart Filtering",
            "Contextual Conversations"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        from app.database import get_db
        
        # Test database connection
        db = next(get_db())
        db.execute("SELECT 1")
        db_status = "connected"
        db.close()
        
        # Test vector service
        try:
            from app.services.vector_service import VectorService
            vector_service = VectorService()
            vector_info = vector_service.get_collection_info()
            vector_status = "connected"
        except Exception as ve:
            logger.warning(f"Vector service check failed: {ve}")
            vector_status = "disconnected"
            vector_info = {}
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "database": db_status,
                "vector_db": vector_status,
                "vector_points": vector_info.get("points_count", 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@app.get("/sync")
async def trigger_sync():
    """Trigger data synchronization"""
    try:
        # This would typically trigger your Shopify sync process
        # For now, just return success
        return {
            "status": "sync_triggered",
            "message": "Data synchronization started",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Sync trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

# Additional middleware for request logging
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds()
    
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )