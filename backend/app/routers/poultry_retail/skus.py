"""
SKUs Router for PoultryRetail-Core
==================================
API endpoints for SKU and pricing management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.skus import (
    SKUCreate, SKUUpdate, SKU, StorePriceCreate, StorePrice,
    SKUWithPrice, StorePriceListResponse
)
from app.models.poultry_retail.enums import BirdType, InventoryType

router = APIRouter(prefix="/skus", tags=["SKUs & Pricing"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


# =============================================================================
# SKU LIST ENDPOINT (must come first - no path params)
# =============================================================================

@router.get("", response_model=list[SKU])
async def list_skus(
    bird_type: Optional[BirdType] = None,
    inventory_type: Optional[InventoryType] = None,
    active_only: bool = True,
    current_user: dict = Depends(require_permission(["skus.view"]))
):
    """List all SKUs with optional filters."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("skus").select("*")
    
    if bird_type:
        query = query.eq("bird_type", bird_type.value)
    
    if inventory_type:
        query = query.eq("inventory_type", inventory_type.value)
    
    if active_only:
        query = query.eq("is_active", True)
    
    query = query.order("name")
    
    result = query.execute()
    
    return result.data


@router.post("", response_model=SKU, status_code=201)
async def create_sku(
    sku: SKUCreate,
    current_user: dict = Depends(require_permission(["skus.manage"]))
):
    """Create a new SKU (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check code uniqueness
    existing = supabase.table("skus").select("id").eq("code", sku.code).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"SKU code '{sku.code}' already exists")
    
    data = sku.model_dump()
    data["bird_type"] = data["bird_type"].value
    data["inventory_type"] = data["inventory_type"].value
    
    result = supabase.table("skus").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create SKU")
    
    return result.data[0]


# =============================================================================
# STORE PRICING ENDPOINTS (must come BEFORE /{sku_id} routes!)
# =============================================================================

@router.get("/prices/store", response_model=StorePriceListResponse)
async def get_store_prices(
    x_store_id: int = Header(..., description="Store ID for context"),
    price_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["storeprices.view"]))
):
    """
    Get all SKU prices for a store on a specific date.
    
    If date not provided, uses current date.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    target_date = price_date or date.today()
    
    # Get store name
    store = supabase.table("shops").select("name").eq("id", x_store_id).execute()
    store_name = store.data[0]["name"] if store.data else "Unknown"
    
    # Get all active SKUs
    skus = supabase.table("skus").select("*").eq("is_active", True).order("name").execute()
    
    items = []
    for sku in skus.data:
        # Get current price for this SKU
        price_result = supabase.rpc("get_current_price", {
            "p_store_id": x_store_id,
            "p_sku_id": sku["id"],
            "p_date": target_date.isoformat()
        }).execute()
        
        items.append(SKUWithPrice(
            id=sku["id"],
            name=sku["name"],
            code=sku["code"],
            bird_type=sku["bird_type"],
            inventory_type=sku["inventory_type"],
            unit=sku["unit"],
            is_active=sku["is_active"],
            current_price=price_result.data if price_result.data else None,
            effective_date=target_date if price_result.data else None
        ))
    
    return StorePriceListResponse(
        store_id=x_store_id,
        store_name=store_name,
        date=target_date,
        items=items
    )


@router.post("/prices/store", response_model=StorePrice, status_code=201)
async def set_store_price(
    price: StorePriceCreate,
    current_user: dict = Depends(require_permission(["storeprices.edit"]))
):
    """Set or update price for a SKU at a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(price.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Verify SKU exists
    sku_check = supabase.table("skus").select("id").eq("id", str(price.sku_id)).execute()
    if not sku_check.data:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    data = {
        "store_id": price.store_id,
        "sku_id": str(price.sku_id),
        "price": str(price.price),
        "effective_date": price.effective_date.isoformat(),
        "created_by": current_user["user_id"]
    }
    
    # Upsert (update if exists, insert if not)
    result = supabase.table("store_prices").upsert(
        data,
        on_conflict="store_id,sku_id,effective_date"
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to set price")
    
    return result.data[0]


@router.post("/prices/bulk", status_code=201)
async def set_bulk_prices(
    store_id: int,
    effective_date: date,
    prices: list[dict],  # [{"sku_id": str, "price": float}, ...]
    current_user: dict = Depends(require_permission(["storeprices.edit"]))
):
    """Set prices for multiple SKUs at once."""
    from app.config.database import get_supabase
    
    if not validate_store_access(store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    records = []
    for item in prices:
        records.append({
            "store_id": store_id,
            "sku_id": item["sku_id"],
            "price": str(item["price"]),
            "effective_date": effective_date.isoformat(),
            "created_by": current_user["user_id"]
        })
    
    result = supabase.table("store_prices").upsert(
        records,
        on_conflict="store_id,sku_id,effective_date"
    ).execute()
    
    return {"updated_count": len(result.data), "message": "Prices updated successfully"}


# =============================================================================
# SKU DETAIL ENDPOINTS (path params - must come LAST)
# =============================================================================

@router.get("/{sku_id}", response_model=SKU)
async def get_sku(
    sku_id: UUID,
    current_user: dict = Depends(require_permission(["skus.view"]))
):
    """Get SKU by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("skus").select("*").eq("id", str(sku_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    return result.data[0]


@router.patch("/{sku_id}", response_model=SKU)
async def update_sku(
    sku_id: UUID,
    sku: SKUUpdate,
    current_user: dict = Depends(require_permission(["skus.manage"]))
):
    """Update SKU details (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check SKU exists
    existing = supabase.table("skus").select("id").eq("id", str(sku_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    update_data = sku.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("skus").update(update_data).eq("id", str(sku_id)).execute()
    
    return result.data[0]
