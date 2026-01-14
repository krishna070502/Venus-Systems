"""
Inventory Router for PoultryRetail-Core
=======================================
API endpoints for inventory and stock management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.inventory import (
    InventoryLedgerEntry, InventoryLedgerCreate,
    CurrentStock, StockSummary, StockByType
)
from app.models.poultry_retail.enums import BirdType, InventoryType

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.get("/stock", response_model=StockSummary)
async def get_current_stock(
    x_store_id: int = Header(..., description="Store ID for context"),
    current_user: dict = Depends(require_permission(["inventory.view"]))
):
    """
    Get current stock levels for a store.
    
    Returns stock breakdown by bird type and inventory type.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Use the get_current_stock function
    result = supabase.rpc("get_current_stock", {"p_store_id": x_store_id}).execute()
    
    # Build stock summary
    summary = StockSummary(
        store_id=x_store_id,
        BROILER=StockByType(),
        PARENT_CULL=StockByType(),
        as_of=datetime.utcnow()
    )
    
    for row in result.data:
        bird_type = row["bird_type"]
        inv_type = row["inventory_type"]
        qty = row["current_qty"]
        count = row.get("current_bird_count", 0)
        
        target = summary.BROILER if bird_type == "BROILER" else summary.PARENT_CULL
        setattr(target, inv_type, qty)
        if inv_type == "LIVE":
            setattr(target, "LIVE_COUNT", count)
    
    return summary


@router.get("/stock/{bird_type}", response_model=StockByType)
async def get_stock_by_bird_type(
    bird_type: BirdType,
    x_store_id: int = Header(..., description="Store ID for context"),
    current_user: dict = Depends(require_permission(["inventory.view"]))
):
    """Get stock for a specific bird type."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    result = supabase.rpc("get_current_stock", {
        "p_store_id": x_store_id,
        "p_bird_type": bird_type.value
    }).execute()
    
    stock = StockByType()
    for row in result.data:
        inv_type = row["inventory_type"]
        setattr(stock, inv_type, row["current_qty"])
        if inv_type == "LIVE":
            stock.LIVE_COUNT = row.get("current_bird_count", 0)
    
    return stock


@router.get("/ledger", response_model=list[InventoryLedgerEntry])
async def get_ledger_entries(
    x_store_id: int = Header(..., description="Store ID for context"),
    bird_type: Optional[BirdType] = None,
    inventory_type: Optional[InventoryType] = None,
    reason_code: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["inventory.ledger"]))
):
    """
    Get inventory ledger entries for a store.
    
    The ledger is append-only and shows all inventory movements.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("inventory_ledger_view").select("*").eq("store_id", x_store_id)
    
    if bird_type:
        query = query.eq("bird_type", bird_type.value)
    
    if inventory_type:
        query = query.eq("inventory_type", inventory_type.value)
    
    if reason_code:
        query = query.eq("reason_code", reason_code)
    
    if from_date:
        query = query.gte("created_at", from_date.isoformat())
    
    if to_date:
        query = query.lte("created_at", to_date.isoformat())
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return result.data


@router.post("/adjust", response_model=InventoryLedgerEntry, status_code=201)
async def create_adjustment(
    adjustment: InventoryLedgerCreate,
    x_store_id: int = Header(..., description="Store ID for context"),
    current_user: dict = Depends(require_permission(["inventory.adjust"]))
):
    """
    Create a manual inventory adjustment (Admin only).
    
    Use positive quantity_change for credit, negative for debit.
    """
    from app.config.database import get_supabase
    
    # Only admin can adjust
    if "Admin" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only Admin can make adjustments")
    
    if adjustment.store_id != x_store_id:
        raise HTTPException(status_code=400, detail="Store ID mismatch with header")
    
    supabase = get_supabase()
    
    # Determine reason code based on direction
    reason_code = adjustment.reason_code
    if adjustment.quantity_change > 0 and reason_code not in ["ADJUSTMENT_CREDIT", "OPENING_BALANCE"]:
        reason_code = "ADJUSTMENT_CREDIT"
    elif adjustment.quantity_change < 0 and reason_code != "ADJUSTMENT_DEBIT":
        reason_code = "ADJUSTMENT_DEBIT"
    
    # For debit, validate sufficient stock
    if adjustment.quantity_change < 0:
        stock_check = supabase.rpc("validate_stock_available", {
            "p_store_id": adjustment.store_id,
            "p_bird_type": adjustment.bird_type.value,
            "p_inventory_type": adjustment.inventory_type.value,
            "p_required_qty": abs(float(adjustment.quantity_change))
        }).execute()
        
        if not stock_check.data:
            raise HTTPException(
                status_code=400, 
                detail="Insufficient stock for this adjustment"
            )
    
    # Create ledger entry
    result = supabase.rpc("add_inventory_ledger_entry", {
        "p_store_id": adjustment.store_id,
        "p_bird_type": adjustment.bird_type.value,
        "p_inventory_type": adjustment.inventory_type.value,
        "p_quantity_change": float(adjustment.quantity_change),
        "p_reason_code": reason_code,
        "p_user_id": current_user["user_id"],
        "p_notes": adjustment.notes
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create adjustment")
    
    # Get the created entry
    entry = supabase.table("inventory_ledger").select("*").eq(
        "id", result.data
    ).execute()
    
    return entry.data[0]


@router.get("/reason-codes")
async def get_reason_codes(
    current_user: dict = Depends(require_permission(["inventory.view"]))
):
    """Get all valid inventory reason codes."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("inventory_reason_codes").select("*").execute()
    
    return result.data
