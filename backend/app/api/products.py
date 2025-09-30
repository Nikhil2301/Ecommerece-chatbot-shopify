from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.product import Product
from app.services.vector_service import VectorService
from pydantic import BaseModel


router = APIRouter()


class ProductResponse(BaseModel):
    id: int
    shopify_id: str
    title: str
    description: Optional[str] = None
    price: float
    vendor: Optional[str] = ""  # ✅ Allow None, default empty string
    product_type: Optional[str] = ""  # ✅ Allow None, default empty string
    tags: Optional[str] = ""  # ✅ Allow None, default empty string
    handle: Optional[str] = None  # ✅ Allow None
    status: str

    class Config:
        from_attributes = True  # ✅ Enable ORM mode


@router.get("/products/search")
async def search_products(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db)
):
    """Search products using vector similarity"""
    try:
        vector_service = VectorService()
        results = vector_service.search_products(q, limit=limit)
        return {"results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products")
async def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """Get products from database including first image, inventory and pricing info"""
    products = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.variants), joinedload(Product.options))
        .offset(skip)
        .limit(limit)
        .all()
    )

    out = []
    for p in products:
        total_inventory = sum(v.inventory_quantity for v in p.variants)
        first_image = p.images[0] if p.images else None
        variants_info = []
        for v in p.variants:
            variants_info.append({
                "title": v.title,
                "price": v.price,
                "compare_at_price": v.compare_at_price,
                "inventory_quantity": v.inventory_quantity,
                "sku": v.sku,
                "option1": v.option1,
                "option2": v.option2,
                "option3": v.option3,
            })

        out.append({
            "id": p.id,
            "shopify_id": p.shopify_id,
            "title": p.title,
            "description": p.description,
            "price": p.price,
            "compare_at_price": p.compare_at_price,
            "vendor": p.vendor or "",
            "product_type": p.product_type or "",
            "tags": p.tags or "",
            "handle": p.handle,
            "status": p.status,
            "inventory_quantity": total_inventory,
            "images": [{"src": first_image.src, "alt": first_image.alt_text}] if first_image else [],
            "variants_count": len(p.variants),
            "options_count": len(p.options),
            "variants": variants_info,
        })

    return out


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get specific product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
