# app/api/webhooks.py
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.orm import Session
import base64, hmac, hashlib, json, logging, os

from app.config import settings
from app.database import get_db
from app.services.data_sync import DataSyncService
from app.services.vector_service import VectorService

logger = logging.getLogger("app.webhooks")
router = APIRouter()

def ensure_log_file():
    """Ensure the log file exists and is writable"""
    log_path = "data_sync.txt"  # Relative to current working directory
    try:
        # Create file if it doesn't exist
        if not os.path.exists(log_path):
            with open(log_path, "w") as f:
                f.write("# Webhook Data Sync Log\n")
        return log_path
    except Exception as e:
        logger.warning(f"Could not create log file: {e}")
        return None

def safe_log_to_file(content: str):
    """Safely log content to file, fallback to logger if file unavailable"""
    log_path = ensure_log_file()
    if log_path:
        try:
            with open(log_path, "a") as f:
                f.write(content)
        except Exception as e:
            logger.warning(f"Could not write to log file: {e}")
            logger.info(f"Webhook data: {content}")
    else:
        logger.info(f"Webhook data: {content}")

def verify_webhook(data: bytes, signature: str) -> bool:
    secret = getattr(settings, "SHOPIFY_WEBHOOK_SECRET", None)
    if not secret:
        logger.warning("No SHOPIFY_WEBHOOK_SECRET, skipping verification")
        return True
    
    # ✅ DISABLE SIGNATURE VERIFICATION FOR DEVELOPMENT
    logger.info("Signature verification disabled for development")
    return True
    
    # Original verification code (commented out for development):
    # digest = hmac.new(secret.encode(), data, hashlib.sha256).digest()
    # expected = base64.b64encode(digest).decode()
    # valid = hmac.compare_digest(signature or "", expected)
    # logger.debug("Webhook signature valid: %s", valid)
    # return valid

async def get_webhook_data(request: Request, x_shopify_hmac_sha256: str = Header(None)):
    body = await request.body()
    logger.debug("Raw webhook body: %s", body)
    if x_shopify_hmac_sha256 and not verify_webhook(body, x_shopify_hmac_sha256):
        logger.error("Invalid signature: %s", x_shopify_hmac_sha256)
        raise HTTPException(401, "Invalid signature")
    try:
        data = json.loads(body.decode())
        logger.debug("Parsed webhook JSON: %s", data)
        return data
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", e)
        raise HTTPException(400, "Invalid JSON")

@router.post("/webhooks/products-create")
async def product_create(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    logger.info("🔥🔥🔥 products-create webhook hit")
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    
    # Handle test data
    if data.get("test") is True:
        logger.info("Test webhook received successfully")
        return {"status": "success", "message": "Test webhook processed"}
    
    # Handle real Shopify product data
    if "id" not in data:
        logger.error("Missing 'id' field in webhook data")
        return {"status": "error", "message": "Invalid product data - missing id"}
    
    success = await DataSyncService().sync_single_product(db, data)
    if success:
        VectorService().add_product(data)
        logger.info("Product created synced: %s", data.get("id"))
        return {"status": "success"}
    logger.error("Product create sync failed: %s", data.get("id"))
    raise HTTPException(500, "Sync error")

@router.post("/webhooks/products-update")
async def product_update(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    logger.info("🔥🔥🔥 products-update webhook hit")
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}
    
    if "id" not in data:
        return {"status": "error", "message": "Invalid product data - missing id"}
    
    svc, vs = DataSyncService(), VectorService()
    success = await svc.sync_single_product(db, data)
    
    if success:
        # Just upsert - no need to delete first since we use consistent IDs
        vs.add_product(data)
        logger.info("Product updated synced: %s", data.get("id"))
        return {"status": "success"}
    
    logger.error("Product update sync failed: %s", data.get("id"))
    raise HTTPException(500, "Sync error")

@router.post("/webhooks/inventory_items-create")
async def inventory_item_create(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    # Log all fields received from webhook for analysis
    logger.info(f"Inventory item create webhook data: {json.dumps(data, indent=2)}")
    safe_log_to_file(f"INVENTORY CREATE DATA:\n{json.dumps(data, indent=2)}\n\n")
    
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}

    if "id" not in data:
        return {"status": "error", "message": "Invalid inventory item data - missing id"}

    success = DataSyncService().sync_inventory_item(db, data)
    if success:
        return {"status": "success"}
    raise HTTPException(500, "Sync error")

@router.post("/webhooks/inventory_items-update")
async def inventory_item_update(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    # Log all fields received from webhook for analysis
    logger.info(f"Inventory item update webhook data: {json.dumps(data, indent=2)}")
    safe_log_to_file(f"INVENTORY UPDATE DATA:\n{json.dumps(data, indent=2)}\n\n")
    
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}

    if "id" not in data:
        return {"status": "error", "message": "Invalid inventory item data - missing id"}

    success = DataSyncService().sync_inventory_item(db, data)
    if success:
        return {"status": "success"}
    raise HTTPException(500, "Sync error")

@router.post("/webhooks/inventory_items-delete")
async def inventory_item_delete(
    request: Request,
    db: Session = Depends(get_db),
    x_shopify_hmac_sha256: str = Header(None)
):
    logger.info("🔥🔥🔥 inventory-items-delete webhook hit")
    data = await get_webhook_data(request, x_shopify_hmac_sha256)

    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}

    shopify_id = str(data.get("id"))
    if not shopify_id:
        return {"status": "error", "message": "Invalid inventory item data - missing id"}

    # Delete from PostgreSQL
    deleted = DataSyncService().delete_inventory_item(db, shopify_id)

    # Inventory items are not indexed in Qdrant, so skip vector delete

    if deleted:
        logger.info("Inventory item deleted synced: %s", shopify_id)
    else:
        logger.info("Inventory item delete no-op (not found): %s", shopify_id)

    return {"status": "success"}

@router.post("/webhooks/inventory-levels-connect")
async def inventory_level_connect(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}
    if "inventory_item_id" not in data or "location_id" not in data:
        return {"status": "error", "message": "Invalid inventory level data"}

    success = DataSyncService().sync_inventory_level(db, data)
    if success:
        return {"status": "success"}
    raise HTTPException(500, "Sync error")

@router.post("/webhooks/inventory-levels-update")
async def inventory_level_update(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    # Same as connect webhook handler
    return await inventory_level_connect(request, db, x_shopify_hmac_sha256)

@router.post("/webhooks/inventory-levels-disconnect")
async def inventory_level_disconnect(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}
    if "inventory_item_id" not in data or "location_id" not in data:
        return {"status": "error", "message": "Invalid inventory level data"}

    success = DataSyncService().disconnect_inventory_level(
        db, str(data["inventory_item_id"]), str(data["location_id"])
    )
    if success:
        return {"status": "success"}
    raise HTTPException(500, "Disconnect error")

@router.post("/webhooks/products-delete")
async def product_delete(
    request: Request,
    db: Session = Depends(get_db),
    x_shopify_hmac_sha256: str = Header(None)
):
    logger.info("🔥🔥🔥 products-delete webhook hit")
    data = await get_webhook_data(request, x_shopify_hmac_sha256)

    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}

    shopify_id = str(data.get("id"))
    if not shopify_id:
        return {"status": "error", "message": "Invalid product data - missing id"}

    # Delete from PostgreSQL
    deleted = await DataSyncService().delete_single_product(db, shopify_id)
    # Delete from Qdrant vector DB (no-op if not present)
    VectorService().delete_product(shopify_id)

    if deleted:
        logger.info("Product deleted synced: %s", shopify_id)
    else:
        logger.info("Product delete no-op (not found): %s", shopify_id)

    return {"status": "success"}

@router.post("/webhooks/orders-create")
@router.post("/webhooks/orders-updated")
@router.post("/webhooks/orders-cancelled")
@router.post("/webhooks/orders-paid")
async def orders(request: Request, db: Session = Depends(get_db), x_shopify_hmac_sha256: str = Header(None)):
    topic = request.url.path.split("/")[-1]
    logger.info("🔥🔥🔥 orders webhook hit: %s", topic)
    data = await get_webhook_data(request, x_shopify_hmac_sha256)
    
    if data.get("test") is True:
        return {"status": "success", "message": "Test webhook processed"}
    
    if "id" not in data:
        return {"status": "error", "message": "Invalid order data - missing id"}
    
    success = await DataSyncService().sync_single_order(db, data)
    if success:
        logger.info("Order synced: %s", data.get("id"))
        return {"status": "success"}
    logger.error("Order sync failed: %s", data.get("id"))
    raise HTTPException(500, "Sync error")
