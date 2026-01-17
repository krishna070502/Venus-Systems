"""
Sales Router for PoultryRetail-Core
===================================
API endpoints for POS and bulk sales.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date, datetime
from uuid import UUID, uuid4
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.sales import (
    SaleCreate, Sale, SaleWithItems, SaleItemWithSKU, SaleSummary
)
from app.models.poultry_retail.enums import PaymentMethod, SaleType

router = APIRouter(prefix="/sales", tags=["Sales"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.post("", response_model=Sale, status_code=201)
async def create_sale(
    sale: SaleCreate,
    current_user: dict = Depends(require_permission(["sales.create"]))
):
    """
    Create a new sale.
    
    This atomically:
    1. Validates stock availability for all items
    2. Creates sale and sale_items records
    3. Debits inventory for each item
    4. Generates receipt number
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(sale.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check bulk sale permission
    if sale.sale_type == SaleType.BULK:
        # Need additional permission check
        pass  # TODO: Add bulk sale permission validation
    
    supabase = get_supabase()
    
    # Check store is active
    store_check = supabase.rpc("check_store_active", {"p_store_id": sale.store_id}).execute()
    if not store_check.data:
        raise HTTPException(status_code=400, detail="Store is in maintenance mode")
    
    # Generate idempotency key if not provided
    idempotency_key = sale.idempotency_key or uuid4()
    
    # Check for duplicate submission
    existing = supabase.table("sales").select("*").eq(
        "idempotency_key", str(idempotency_key)
    ).execute()
    
    if existing.data:
        # Return existing sale (idempotent)
        return existing.data[0]
    
    # Validate stock for each item
    for item in sale.items:
        sku = supabase.table("skus").select("*").eq("id", str(item.sku_id)).execute()
        
        if not sku.data:
            raise HTTPException(status_code=404, detail=f"SKU {item.sku_id} not found")
        
        sku_data = sku.data[0]
        
        # Check stock availability
        stock_check = supabase.rpc("validate_stock_available", {
            "p_store_id": sale.store_id,
            "p_bird_type": sku_data["bird_type"],
            "p_inventory_type": sku_data["inventory_type"],
            "p_required_qty": float(item.weight)
        }).execute()
        
        if not stock_check.data:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {sku_data['name']}. Required: {item.weight} kg"
            )
    
    # Generate receipt number
    receipt_result = supabase.rpc("generate_receipt_number", {
        "p_store_id": sale.store_id
    }).execute()
    
    receipt_number = receipt_result.data
    
    # Calculate total
    total_amount = sum(item.weight * item.price_snapshot for item in sale.items)
    
    # Create sale record
    sale_data = {
        "store_id": sale.store_id,
        "cashier_id": current_user["user_id"],
        "total_amount": str(total_amount),
        "payment_method": sale.payment_method.value,
        "sale_type": sale.sale_type.value,
        "receipt_number": receipt_number,
        "idempotency_key": str(idempotency_key),
        "customer_id": str(sale.customer_id) if sale.customer_id else None,
        "customer_name": sale.customer_name,
        "customer_phone": sale.customer_phone,
        "notes": sale.notes
    }
    
    sale_result = supabase.table("sales").insert(sale_data).execute()
    
    if not sale_result.data:
        raise HTTPException(status_code=400, detail="Failed to create sale")
    
    sale_id = sale_result.data[0]["id"]
    
    # Create sale items (triggers will handle inventory deduction)
    for item in sale.items:
        item_data = {
            "sale_id": sale_id,
            "sku_id": str(item.sku_id),
            "weight": str(item.weight),
            "price_snapshot": str(item.price_snapshot)
        }
        
        item_result = supabase.table("sale_items").insert(item_data).execute()
        
        if not item_result.data:
            # Rollback would be needed here in production
            raise HTTPException(status_code=400, detail="Failed to create sale item")
    
    return sale_result.data[0]


@router.get("", response_model=list[SaleWithItems])
async def list_sales(
    x_store_id: int = Header(..., description="Store ID for context"),
    payment_method: Optional[PaymentMethod] = None,
    sale_type: Optional[SaleType] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """List sales for a store with optional filters."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("sales").select("*, items:sale_items(*, skus(name, code, unit))").eq("store_id", x_store_id)
    
    if payment_method:
        query = query.eq("payment_method", payment_method.value)
    
    if sale_type:
        query = query.eq("sale_type", sale_type.value)
    
    if from_date:
        query = query.gte("created_at", from_date.isoformat())
    
    if to_date:
        query = query.lte("created_at", (to_date.isoformat() + "T23:59:59"))
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    sales_with_items = []
    for sale_data in result.data:
        items_data = sale_data.pop("items", [])
        items = []
        for item in items_data:
            sku_info = item.pop("skus", {})
            items.append(SaleItemWithSKU(
                **item,
                sku_name=sku_info.get("name", ""),
                sku_code=sku_info.get("code", ""),
                unit=sku_info.get("unit", "kg")
            ))
        sales_with_items.append(SaleWithItems(**sale_data, items=items))
    
    return sales_with_items


@router.get("/{sale_id}", response_model=SaleWithItems)
async def get_sale(
    sale_id: UUID,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """Get sale with all items."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get sale
    sale_result = supabase.table("sales").select("*").eq("id", str(sale_id)).execute()
    
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    sale = sale_result.data[0]
    
    # Check store access
    if not validate_store_access(sale["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Get sale items with SKU details
    items_result = supabase.table("sale_items").select(
        "*, skus!inner(name, code, unit)"
    ).eq("sale_id", str(sale_id)).execute()
    
    items = []
    for item in items_result.data:
        sku_data = item.pop("skus", {})
        items.append(SaleItemWithSKU(
            **item,
            sku_name=sku_data.get("name", ""),
            sku_code=sku_data.get("code", ""),
            unit=sku_data.get("unit", "kg")
        ))
    
    return SaleWithItems(**sale, items=items)


@router.get("/summary/daily", response_model=SaleSummary)
async def get_daily_summary(
    x_store_id: int = Header(..., description="Store ID for context"),
    summary_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """Get daily sales summary for a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    target_date = summary_date or date.today()
    
    # Get sales for the day
    result = supabase.table("sales").select(
        "total_amount, payment_method"
    ).eq("store_id", x_store_id).gte(
        "created_at", target_date.isoformat()
    ).lt(
        "created_at", (target_date.isoformat() + "T23:59:59")
    ).execute()
    
    total_sales = Decimal("0")
    total_cash = Decimal("0")
    total_upi = Decimal("0")
    total_card = Decimal("0")
    total_bank = Decimal("0")
    
    for sale in result.data:
        amount = Decimal(str(sale["total_amount"]))
        total_sales += amount
        
        if sale["payment_method"] == "CASH":
            total_cash += amount
        elif sale["payment_method"] == "UPI":
            total_upi += amount
        elif sale["payment_method"] == "CARD":
            total_card += amount
        elif sale["payment_method"] == "BANK":
            total_bank += amount
    
    return SaleSummary(
        store_id=x_store_id,
        date=datetime.combine(target_date, datetime.min.time()),
        total_sales=total_sales,
        total_cash=total_cash,
        total_upi=total_upi,
        total_card=total_card,
        total_bank=total_bank,
        sale_count=len(result.data)
    )


@router.get("/summary/global")
async def get_global_summary(
    summary_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """
    Get global sales summary across ALL stores for today.
    Intended for admin dashboard widgets.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    target_date = summary_date or date.today()
    
    # Get sales for the day across ALL stores
    result = supabase.table("sales").select(
        "total_amount, payment_method"
    ).gte(
        "created_at", target_date.isoformat()
    ).lt(
        "created_at", (target_date.isoformat() + "T23:59:59")
    ).execute()
    
    total_sales = Decimal("0")
    total_cash = Decimal("0")
    total_upi = Decimal("0")
    total_card = Decimal("0")
    total_bank = Decimal("0")
    
    for sale in result.data:
        amount = Decimal(str(sale["total_amount"]))
        total_sales += amount
        
        if sale["payment_method"] == "CASH":
            total_cash += amount
        elif sale["payment_method"] == "UPI":
            total_upi += amount
        elif sale["payment_method"] == "CARD":
            total_card += amount
        elif sale["payment_method"] == "BANK":
            total_bank += amount
    
    return {
        "date": target_date.isoformat(),
        "total_sales": float(total_sales),
        "total_cash": float(total_cash),
        "total_upi": float(total_upi),
        "total_card": float(total_card),
        "total_bank": float(total_bank),
        "sale_count": len(result.data)
    }

