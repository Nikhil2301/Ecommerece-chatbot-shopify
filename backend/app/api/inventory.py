# backend/app/api/inventory.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.inventory_item import InventoryItem
from pydantic import BaseModel

router = APIRouter()

class InventoryItemResponse(BaseModel):
    id: int
    shopify_id: str
    sku: Optional[str] = None
    requires_shipping: bool
    tracked: bool
    cost: Optional[float] = None
    country_code_of_origin: Optional[str] = None
    harmonized_system_code: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/inventory/items", response_model=List[InventoryItemResponse])
async def get_inventory_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """Get inventory items from database"""
    items = db.query(InventoryItem).offset(skip).limit(limit).all()
    return items

@router.get("/inventory/items/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """Get specific inventory item"""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item
