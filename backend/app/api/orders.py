from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class OrderResponse(BaseModel):
    id: int
    shopify_id: str
    order_number: int
    email: str
    financial_status: str
    fulfillment_status: Optional[str] = None
    total_price: float
    currency: str
    created_at: Optional[datetime]

@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    email: Optional[str] = Query(None),
    order_number: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """Get orders with optional filtering"""
    query = db.query(Order)
    
    if email:
        query = query.filter(Order.email == email)
    
    if order_number:
        query = query.filter(Order.order_number == order_number)
    
    orders = query.offset(skip).limit(limit).all()
    return orders

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get specific order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
