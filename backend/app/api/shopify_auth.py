from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, Response
import hmac
import hashlib
import secrets
import httpx
import os
import requests
from app.config import settings
from app.models.shop import Shop
from app.database import SessionLocal

router = APIRouter()

def verify_hmac(params: dict, secret: str) -> bool:
    """Verify Shopify HMAC signature"""
    params_copy = params.copy()
    received_hmac = params_copy.pop('hmac', '')
    
    sorted_params = sorted((k, str(v)) for k, v in params_copy.items())
    query_string = '&'.join(f"{k}={v}" for k, v in sorted_params)
    
    calculated_hmac = hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_hmac, received_hmac)

SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY")
SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET")
API_VERSION = os.getenv("SHOPIFY_API_VERSION", "2023-10")
REDIRECT_URI = os.getenv("APP_URL") + "/api/shopify/callback"

@router.get("/shopify/install")
def install(request: Request):
    shop = request.query_params.get("shop")
    install_url = (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={SHOPIFY_API_KEY}&scope=read_products,write_products,read_orders,write_orders,read_script_tags,write_script_tags&redirect_uri={REDIRECT_URI}"
    )
    return Response(status_code=302, headers={"Location": install_url})

@router.get("/shopify/callback")
def callback(request: Request):
    code = request.query_params.get("code")
    shop = request.query_params.get("shop")
    token_url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id": SHOPIFY_API_KEY,
        "client_secret": SHOPIFY_API_SECRET,
        "code": code,
    }
    resp = requests.post(token_url, json=payload)
    access_token = resp.json()["access_token"]
    db = SessionLocal()
    shop_obj = db.query(Shop).filter(Shop.shop == shop).first()
    if not shop_obj:
        shop_obj = Shop(shop=shop, access_token=access_token, api_version=API_VERSION, webhook_secret="")
        db.add(shop_obj)
    else:
        shop_obj.access_token = access_token
        shop_obj.api_version = API_VERSION
    db.commit()
    db.close()
    return {"success": True}

@router.get("/auth/install")
async def install_app(shop: str):
    """Step 1: Redirect merchant to Shopify OAuth screen"""
    if not shop or not shop.endswith('.myshopify.com'):
        raise HTTPException(status_code=400, detail="Invalid shop domain")
    
    nonce = secrets.token_urlsafe(16)
    redirect_uri = f"{settings.APP_URL}/api/auth/callback"
    
    install_url = (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={settings.SHOPIFY_API_KEY}&"
        f"scope={settings.OAUTH_SCOPES}&"
        f"redirect_uri={redirect_uri}&"
        f"state={nonce}"
    )
    
    return RedirectResponse(url=install_url)

@router.get("/auth/callback")
async def auth_callback(code: str, shop: str, state: str, hmac: str):
    """Step 2: Exchange code for access token"""
    params = {"code": code, "shop": shop, "state": state, "hmac": hmac}
    
    # Verify HMAC
    if not verify_hmac(params, settings.SHOPIFY_API_SECRET):
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://{shop}/admin/oauth/access_token",
            json={
                "client_id": settings.SHOPIFY_API_KEY,
                "client_secret": settings.SHOPIFY_API_SECRET,
                "code": code
            }
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get access token")
    
    data = response.json()
    access_token = data.get("access_token")
    
    # TODO: Save to database
    print(f"✅ Shop {shop} installed! Access token: {access_token[:20]}...")
    
    # Redirect merchant back to Shopify admin
    return RedirectResponse(url=f"https://{shop}/admin/apps")
