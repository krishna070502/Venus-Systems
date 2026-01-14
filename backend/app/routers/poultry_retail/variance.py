"""
Variance Router for PoultryRetail-Core
======================================
API endpoints for variance management and approval.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.variance import (
    VarianceLog, VarianceLogWithDetails, VarianceApproval, VarianceDeduction
)
from app.models.poultry_retail.enums import VarianceType, VarianceLogStatus

router = APIRouter(prefix="/variance", tags=["Variance"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.get("", response_model=list[VarianceLogWithDetails])
async def list_variances(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    status: Optional[VarianceLogStatus] = None,
    variance_type: Optional[VarianceType] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["variance.view"]))
):
    """List variance logs with optional filters."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Build query with joins
    query = supabase.table("variance_logs").select(
        "*, "
        "daily_settlements!inner(store_id, settlement_date, submitted_by, "
        "profiles!daily_settlements_submitted_by_fkey(full_name), "
        "shops!inner(id, name)), "
        "profiles!variance_logs_resolved_by_fkey(full_name)"
    )
    
    # If store ID provided, filter by store
    if x_store_id:
        if not validate_store_access(x_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
        query = query.eq("daily_settlements.store_id", x_store_id)
    elif "Admin" not in current_user.get("roles", []):
        # Non-admin must filter by their stores
        store_ids = current_user.get("store_ids", [])
        if not store_ids:
            return []
        query = query.in_("daily_settlements.store_id", store_ids)
    
    if status:
        query = query.eq("status", status.value)
    
    if variance_type:
        query = query.eq("variance_type", variance_type.value)
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform result
    variances = []
    for row in result.data:
        settlement = row.pop("daily_settlements", {})
        shop = settlement.pop("shops", {})
        submitter = settlement.pop("profiles", {})
        resolver = row.pop("profiles", {})
        
        variances.append(VarianceLogWithDetails(
            **row,
            store_id=settlement.get("store_id") or shop.get("id"),
            store_name=shop.get("name", "Unknown"),
            settlement_date=settlement.get("settlement_date"),
            submitted_by_name=submitter.get("full_name"),
            resolved_by_name=resolver.get("full_name")
        ))
    
    return variances


@router.get("/{variance_id}", response_model=VarianceLogWithDetails)
async def get_variance(
    variance_id: UUID,
    current_user: dict = Depends(require_permission(["variance.view"]))
):
    """Get variance log by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("variance_logs").select(
        "*, "
        "daily_settlements!inner(store_id, settlement_date, submitted_by, "
        "profiles!daily_settlements_submitted_by_fkey(full_name), "
        "shops!inner(id, name)), "
        "profiles!variance_logs_resolved_by_fkey(full_name)"
    ).eq("id", str(variance_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Variance not found")
    
    row = result.data[0]
    settlement = row.pop("daily_settlements", {})
    shop = settlement.pop("shops", {})
    submitter = settlement.pop("profiles", {})
    resolver = row.pop("profiles", {})
    
    # Check store access
    store_id = settlement.get("store_id") or shop.get("id")
    if store_id and not validate_store_access(store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    return VarianceLogWithDetails(
        **row,
        store_id=store_id,
        store_name=shop.get("name", "Unknown"),
        settlement_date=settlement.get("settlement_date"),
        submitted_by_name=submitter.get("full_name"),
        resolved_by_name=resolver.get("full_name")
    )


@router.post("/{variance_id}/approve", response_model=VarianceLog)
async def approve_positive_variance(
    variance_id: UUID,
    approval: VarianceApproval,
    current_user: dict = Depends(require_permission(["variance.approve"]))
):
    """
    Approve a positive variance (found stock).
    
    This will:
    1. Credit the inventory ledger
    2. Award staff points
    3. Mark variance as approved
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get variance
    existing = supabase.table("variance_logs").select(
        "*, daily_settlements!inner(store_id)"
    ).eq("id", str(variance_id)).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Variance not found")
    
    variance = existing.data[0]
    settlement = variance.pop("daily_settlements", {})
    
    # Check store access
    if not validate_store_access(settlement.get("store_id"), current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Validate variance type and status
    if variance["variance_type"] != "POSITIVE":
        raise HTTPException(status_code=400, detail="Can only approve positive variances")
    
    if variance["status"] != "PENDING":
        raise HTTPException(
            status_code=400, 
            detail=f"Variance is already {variance['status']}"
        )
    
    # Update variance (trigger will handle ledger entry and staff points)
    update_data = {
        "status": "APPROVED",
        "resolved_by": current_user["user_id"],
        "notes": approval.notes
    }
    
    result = supabase.table("variance_logs").update(update_data).eq(
        "id", str(variance_id)
    ).execute()
    
    return result.data[0]


@router.post("/{variance_id}/deduct", response_model=VarianceLog)
async def deduct_negative_variance(
    variance_id: UUID,
    deduction: VarianceDeduction,
    current_user: dict = Depends(require_permission(["variance.deduct"]))
):
    """
    Deduct a negative variance (lost stock).
    
    This will:
    1. Debit the inventory ledger to match physical count
    2. Deduct staff points
    3. Mark variance as deducted
    """
    from app.config.database import get_supabase
    
    if not deduction.confirm:
        raise HTTPException(
            status_code=400, 
            detail="Must confirm deduction by setting 'confirm' to true"
        )
    
    supabase = get_supabase()
    
    # Get variance
    existing = supabase.table("variance_logs").select(
        "*, daily_settlements!inner(store_id)"
    ).eq("id", str(variance_id)).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Variance not found")
    
    variance = existing.data[0]
    settlement = variance.pop("daily_settlements", {})
    
    # Check store access
    if not validate_store_access(settlement.get("store_id"), current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Validate variance type and status
    if variance["variance_type"] != "NEGATIVE":
        raise HTTPException(status_code=400, detail="Can only deduct negative variances")
    
    if variance["status"] != "PENDING":
        raise HTTPException(
            status_code=400, 
            detail=f"Variance is already {variance['status']}"
        )
    
    # Update variance (trigger will handle ledger entry and staff points)
    update_data = {
        "status": "DEDUCTED",
        "resolved_by": current_user["user_id"],
        "notes": deduction.notes
    }
    
    result = supabase.table("variance_logs").update(update_data).eq(
        "id", str(variance_id)
    ).execute()
    
    return result.data[0]


@router.get("/pending/count")
async def get_pending_variance_count(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    current_user: dict = Depends(require_permission(["variance.view"]))
):
    """Get count of pending variances."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("variance_logs").select(
        "id, daily_settlements!inner(store_id)", count="exact"
    ).eq("status", "PENDING")
    
    if x_store_id:
        if not validate_store_access(x_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
        query = query.eq("daily_settlements.store_id", x_store_id)
    
    result = query.execute()
    
    return {"pending_count": result.count}
