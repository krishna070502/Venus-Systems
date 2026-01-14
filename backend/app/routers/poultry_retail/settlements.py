"""
Settlements Router for PoultryRetail-Core
=========================================
API endpoints for daily settlements and reconciliation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.settlements import (
    SettlementCreate, SettlementSubmit, Settlement, SettlementWithVariance
)
from app.models.poultry_retail.enums import SettlementStatus

router = APIRouter(prefix="/settlements", tags=["Settlements"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.get("/expected")
async def get_expected_values(
    summary_date: date,
    x_store_id: int = Header(..., description="Store ID for context"),
    current_user: dict = Depends(require_permission(["settlements.create"]))
):
    """
    Get system-expected sales and stock values for a specific date.
    Used to populate the reconciliation form.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Calculate sales summary
    sales_result = supabase.rpc("calculate_expected_sales", {
        "p_store_id": x_store_id,
        "p_date": summary_date.isoformat()
    }).execute()
    
    # Calculate stock levels
    stock_result = supabase.rpc("calculate_expected_stock", {
        "p_store_id": x_store_id,
        "p_date": summary_date.isoformat()
    }).execute()
    
    expected_sales = sales_result.data or {"CASH": 0, "UPI": 0, "CARD": 0, "BANK": 0}
    expected_stock = stock_result.data or {}
    
    return {
        "cash": expected_sales.get("CASH", 0),
        "upi": expected_sales.get("UPI", 0),
        "card": expected_sales.get("CARD", 0),
        "bank": expected_sales.get("BANK", 0),
        "stock": expected_stock
    }


@router.post("", response_model=Settlement, status_code=201)
async def create_settlement(
    settlement: SettlementCreate,
    current_user: dict = Depends(require_permission(["settlements.create"]))
):
    """Create a new settlement draft."""
    from app.config.database import get_supabase
    
    if not validate_store_access(settlement.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Check if settlement already exists for this date
    existing = supabase.table("daily_settlements").select("id, status").eq(
        "store_id", settlement.store_id
    ).eq("settlement_date", settlement.settlement_date.isoformat()).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=400, 
            detail=f"Settlement already exists for this date. Status: {existing.data[0]['status']}"
        )
    
    # Create draft settlement
    data = {
        "store_id": settlement.store_id,
        "settlement_date": settlement.settlement_date.isoformat(),
        "status": "DRAFT"
    }
    
    result = supabase.table("daily_settlements").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create settlement")
    
    return result.data[0]


@router.post("/{settlement_id}/submit", response_model=SettlementWithVariance)
async def submit_settlement(
    settlement_id: UUID,
    submit_data: SettlementSubmit,
    current_user: dict = Depends(require_permission(["settlements.submit"]))
):
    """
    Submit a settlement with declarations.
    
    This will:
    1. Calculate expected stock from ledger
    2. Calculate expected sales from sales records
    3. Compare with declared values
    4. Create variance logs for any discrepancies
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get existing settlement
    existing = supabase.table("daily_settlements").select("*").eq(
        "id", str(settlement_id)
    ).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    settlement = existing.data[0]
    
    # Validate store access
    if not validate_store_access(settlement["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check status
    if settlement["status"] not in ["DRAFT", "SUBMITTED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit settlement with status {settlement['status']}"
        )
    
    # Prepare submission data
    update_payload = {
        "declared_cash": str(submit_data.declared_cash),
        "declared_upi": str(submit_data.declared_upi),
        "declared_card": str(submit_data.declared_card),
        "declared_bank": str(submit_data.declared_bank),
        "declared_stock": submit_data.declared_stock.model_dump(mode='json'),
        "expense_amount": str(submit_data.expense_amount),
        "expense_notes": submit_data.expense_notes,
        "status": "SUBMITTED",
        "submitted_by": current_user["id"],
        "submitted_at": datetime.utcnow().isoformat()
    }
    
    # Allow updating the date if provided (admin only or backdate permission checked in frontend/policies)
    if submit_data.settlement_date:
        update_payload["settlement_date"] = submit_data.settlement_date.isoformat()
    
    result = supabase.table("daily_settlements").update(update_payload).eq(
        "id", str(settlement_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update settlement")
    
    # Calculate variance
    variance_result = supabase.rpc("calculate_settlement_variance", {
        "p_settlement_id": str(settlement_id)
    }).execute()
    
    # Get updated settlement with variance
    updated = supabase.table("daily_settlements").select("*").eq(
        "id", str(settlement_id)
    ).execute()
    
    # Count variances
    variance_logs = supabase.table("variance_logs").select("variance_type, status").eq(
        "settlement_id", str(settlement_id)
    ).execute()
    
    positive_count = sum(1 for v in variance_logs.data if v["variance_type"] == "POSITIVE")
    negative_count = sum(1 for v in variance_logs.data if v["variance_type"] == "NEGATIVE")
    pending_count = sum(1 for v in variance_logs.data if v["status"] == "PENDING")
    
    return SettlementWithVariance(
        **updated.data[0],
        variance_count=len(variance_logs.data),
        positive_variance_count=positive_count,
        negative_variance_count=negative_count,
        has_pending_variances=pending_count > 0
    )


@router.post("/{settlement_id}/approve", response_model=Settlement)
async def approve_settlement(
    settlement_id: UUID,
    current_user: dict = Depends(require_permission(["settlements.approve"]))
):
    """Approve a submitted settlement."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get existing settlement
    existing = supabase.table("daily_settlements").select("*").eq(
        "id", str(settlement_id)
    ).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    settlement = existing.data[0]
    
    # Validate store access
    if not validate_store_access(settlement["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check status
    if settlement["status"] != "SUBMITTED":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve settlement with status {settlement['status']}"
        )
    
    # Check for pending variances
    pending = supabase.table("variance_logs").select("id").eq(
        "settlement_id", str(settlement_id)
    ).eq("status", "PENDING").execute()
    
    if pending.data:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve settlement with {len(pending.data)} pending variance(s)"
        )
    
    # Approve settlement
    result = supabase.table("daily_settlements").update({
        "status": "APPROVED",
        "approved_by": current_user["id"],
        "approved_at": datetime.utcnow().isoformat()
    }).eq("id", str(settlement_id)).execute()

    # Award points for zero-variance settlements
    try:
        supabase.rpc("award_zero_variance_points", {
            "p_settlement_id": str(settlement_id)
        }).execute()
    except Exception as e:
        # Don't fail the approval if point awarding fails (logs and continue)
        print(f"Warning: Failed to award points: {str(e)}")
    
    return result.data[0]


@router.post("/{settlement_id}/lock", response_model=Settlement)
async def lock_settlement(
    settlement_id: UUID,
    current_user: dict = Depends(require_permission(["settlements.lock"]))
):
    """Lock an approved settlement (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get existing settlement
    existing = supabase.table("daily_settlements").select("*").eq(
        "id", str(settlement_id)
    ).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    settlement = existing.data[0]
    
    # Check status
    if settlement["status"] != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot lock settlement with status {settlement['status']}"
        )
    
    # Lock settlement
    result = supabase.table("daily_settlements").update({
        "status": "LOCKED",
        "locked_at": "now()"
    }).eq("id", str(settlement_id)).execute()
    
    return result.data[0]


@router.get("", response_model=list[Settlement])
async def list_settlements(
    x_store_id: int = Header(..., description="Store ID for context"),
    status: Optional[SettlementStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["settlements.view"]))
):
    """List settlements for a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("daily_settlements").select("*").eq("store_id", x_store_id)
    
    if status:
        query = query.eq("status", status.value)
    
    if from_date:
        query = query.gte("settlement_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("settlement_date", to_date.isoformat())
    
    query = query.order("settlement_date", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return result.data


@router.get("/{settlement_id}", response_model=SettlementWithVariance)
async def get_settlement(
    settlement_id: UUID,
    current_user: dict = Depends(require_permission(["settlements.view"]))
):
    """Get settlement with variance details."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get settlement
    result = supabase.table("daily_settlements").select("*").eq(
        "id", str(settlement_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    settlement = result.data[0]
    
    # Validate store access
    if not validate_store_access(settlement["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Get variance counts
    variance_logs = supabase.table("variance_logs").select("variance_type, status").eq(
        "settlement_id", str(settlement_id)
    ).execute()
    
    positive_count = sum(1 for v in variance_logs.data if v["variance_type"] == "POSITIVE")
    negative_count = sum(1 for v in variance_logs.data if v["variance_type"] == "NEGATIVE")
    pending_count = sum(1 for v in variance_logs.data if v["status"] == "PENDING")
    
    return SettlementWithVariance(
        **settlement,
        variance_count=len(variance_logs.data),
        positive_variance_count=positive_count,
        negative_variance_count=negative_count,
        has_pending_variances=pending_count > 0
    )
