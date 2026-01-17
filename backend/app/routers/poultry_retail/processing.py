"""
Processing Router for PoultryRetail-Core
========================================
API endpoints for processing live birds into dressed meat.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date
from uuid import UUID, uuid4
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.inventory import (
    ProcessingEntryCreate, ProcessingEntry, ProcessingCalculation,
    WastageConfig, WastageConfigCreate
)
from app.models.poultry_retail.enums import BirdType, InventoryType

router = APIRouter(prefix="/processing", tags=["Processing"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.get("/calculate")
async def calculate_processing_yield(
    input_weight: float = Query(..., gt=0),
    bird_type: BirdType = Query(...),
    output_type: InventoryType = Query(...),
    current_user: dict = Depends(require_permission(["processing.view"]))
) -> ProcessingCalculation:
    """
    Calculate expected processing yield before creating entry.
    
    Returns wastage percentage, wastage weight, and output weight.
    """
    from app.config.database import get_supabase
    
    if output_type == InventoryType.LIVE:
        raise HTTPException(status_code=400, detail="Output type cannot be LIVE")
    
    supabase = get_supabase()
    
    # Get wastage percentage
    result = supabase.rpc("calculate_processing_output", {
        "p_input_weight": input_weight,
        "p_bird_type": bird_type.value,
        "p_target_type": output_type.value
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to calculate yield")
    
    data = result.data[0]
    
    return ProcessingCalculation(
        input_weight=Decimal(str(input_weight)),
        wastage_percentage=Decimal(str(data["wastage_percentage"])),
        wastage_weight=Decimal(str(data["wastage_weight"])),
        output_weight=Decimal(str(data["output_weight"]))
    )


@router.post("", response_model=ProcessingEntry, status_code=201)
async def create_processing_entry(
    entry: ProcessingEntryCreate,
    current_user: dict = Depends(require_permission(["processing.create"]))
):
    """
    Create a processing entry.
    
    This atomically:
    1. Validates sufficient LIVE stock
    2. Debits LIVE inventory
    3. Credits SKIN/SKINLESS inventory
    4. Records wastage
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(entry.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Check store is active
    store_check = supabase.rpc("check_store_active", {"p_store_id": entry.store_id}).execute()
    if not store_check.data:
        raise HTTPException(status_code=400, detail="Store is in maintenance mode")
    
    # Validate sufficient LIVE stock
    stock_check = supabase.rpc("validate_stock_available", {
        "p_store_id": entry.store_id,
        "p_bird_type": entry.input_bird_type.value,
        "p_inventory_type": "LIVE",
        "p_required_qty": float(entry.input_weight)
    }).execute()
    
    if not stock_check.data:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient LIVE stock. Required: {entry.input_weight} kg"
        )
    
    # Generate idempotency key if not provided
    idempotency_key = entry.idempotency_key or uuid4()
    
    # Check for duplicate submission
    existing = supabase.table("processing_entries").select("id").eq(
        "idempotency_key", str(idempotency_key)
    ).execute()
    
    if existing.data:
        # Return existing entry (idempotent)
        return supabase.table("processing_entries").select("*").eq(
            "id", existing.data[0]["id"]
        ).execute().data[0]
    
    # Create processing entry (trigger trigger_enforce_yield will handle yield, trigger_processing_ledger will handle stock)
    insert_data = {
        "store_id": entry.store_id,
        "processing_date": entry.processing_date.isoformat(),
        "input_bird_type": entry.input_bird_type.value,
        "output_inventory_type": entry.output_inventory_type.value,
        "input_weight": str(entry.input_weight),
        "input_bird_count": entry.input_bird_count,
        "actual_output_weight": str(entry.actual_output_weight) if entry.actual_output_weight else None,
        "idempotency_key": str(idempotency_key),
        "processed_by": current_user["user_id"]
    }
    
    result = supabase.table("processing_entries").insert(insert_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create processing entry")
    
    return result.data[0]


@router.get("", response_model=list[ProcessingEntry])
async def list_processing_entries(
    x_store_id: int = Header(..., description="Store ID for context"),
    bird_type: Optional[BirdType] = None,
    output_type: Optional[InventoryType] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["processing.view"]))
):
    """List processing entries for a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("processing_entries").select("*").eq("store_id", x_store_id)
    
    if bird_type:
        query = query.eq("input_bird_type", bird_type.value)
    
    if output_type:
        query = query.eq("output_inventory_type", output_type.value)
    
    if from_date:
        query = query.gte("processing_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("processing_date", to_date.isoformat())
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return result.data


@router.get("/wastage-config", response_model=list[WastageConfig])
async def get_wastage_config(
    bird_type: Optional[BirdType] = None,
    current_user: dict = Depends(require_permission(["wastageconfig.view"]))
):
    """Get current wastage configuration."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("wastage_config").select("*")
    
    if bird_type:
        query = query.eq("bird_type", bird_type.value)
    
    query = query.order("effective_date", desc=True)
    
    result = query.execute()
    
    return result.data


@router.post("/wastage-config", response_model=WastageConfig, status_code=201)
async def create_wastage_config(
    config: WastageConfigCreate,
    current_user: dict = Depends(require_permission(["wastageconfig.edit"]))
):
    """Create or update wastage configuration (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    data = config.model_dump()
    data["bird_type"] = data["bird_type"].value
    data["target_inventory_type"] = data["target_inventory_type"].value
    data["percentage"] = str(data["percentage"])
    data["effective_date"] = data["effective_date"].isoformat()
    data["is_active"] = config.is_active
    data["created_by"] = current_user["user_id"]
    
    result = supabase.table("wastage_config").upsert(
        data,
        on_conflict="bird_type,target_inventory_type,effective_date"
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create wastage config")
    
    return result.data[0]
