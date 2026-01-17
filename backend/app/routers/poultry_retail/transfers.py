"""
Stock Transfers Router for PoultryRetail-Core
==============================================
API endpoints for inter-store stock transfers.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.stock_transfers import (
    StockTransferCreate, StockTransfer, StockTransferWithStores,
    TransferReceive, TransferApprove, TransferReject, TransferStatus
)


router = APIRouter(prefix="/transfers", tags=["Stock Transfers"])


def get_user_store_id(user: dict) -> Optional[int]:
    """Get the user's assigned store ID."""
    store_ids = user.get("store_ids", [])
    return store_ids[0] if store_ids else None


@router.get("/shops")
async def list_shops_for_transfer(
    current_user: dict = Depends(require_permission(["inventory.transfer.view"]))
):
    """
    Get all shops for transfer dropdown.
    Available to any user with transfer view permission.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    result = supabase.table("shops").select("id, name").eq("status", "ACTIVE").order("name").execute()
    
    return result.data or []


@router.post("", response_model=StockTransfer, status_code=201)
async def create_transfer(
    transfer: StockTransferCreate,
    current_user: dict = Depends(require_permission(["inventory.transfer.create"]))
):
    """
    Create a new stock transfer.
    
    - Regular users can only transfer FROM their assigned store
    - Users with `inventory.transfer.cross_store` can transfer from any store
    - Users with `inventory.transfer.backdate` can set custom dates
    - Users with `inventory.transfer.approve` auto-approve (skip RECEIVED step)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    user_id = current_user["user_id"]
    permissions = current_user.get("permissions", [])
    
    # Validate from_store access
    can_cross_store = "inventory.transfer.cross_store" in permissions
    user_store = get_user_store_id(current_user)
    
    if not can_cross_store:
        if user_store is None:
            raise HTTPException(status_code=400, detail="You must be assigned to a store to create transfers")
        if transfer.from_store_id != user_store:
            raise HTTPException(status_code=403, detail="You can only transfer from your assigned store")
    
    # Validate date
    can_backdate = "inventory.transfer.backdate" in permissions
    transfer_date = transfer.transfer_date or date.today()
    
    if not can_backdate and transfer_date != date.today():
        transfer_date = date.today()  # Force today's date
    
    # Validate stores are different
    if transfer.from_store_id == transfer.to_store_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same store")
    
    # Check if sender has sufficient stock
    stock_check = supabase.rpc("validate_stock_available", {
        "p_store_id": transfer.from_store_id,
        "p_bird_type": transfer.bird_type,
        "p_inventory_type": transfer.inventory_type,
        "p_required_qty": float(transfer.weight_kg)
    }).execute()
    
    if not stock_check.data:
        raise HTTPException(status_code=400, detail="Insufficient stock for this transfer")
    
    # All transfers start as SENT to enforce the lifecycle:
    # SENT -> RECEIVED -> APPROVED
    initial_status = "SENT"
    
    # Create transfer
    transfer_data = {
        "from_store_id": transfer.from_store_id,
        "to_store_id": transfer.to_store_id,
        "bird_type": transfer.bird_type,
        "inventory_type": transfer.inventory_type,
        "weight_kg": float(transfer.weight_kg),
        "bird_count": transfer.bird_count or 0,
        "transfer_date": transfer_date.isoformat(),
        "status": initial_status,
        "initiated_by": user_id,
        "notes": transfer.notes
    }
    
    result = supabase.table("stock_transfers").insert(transfer_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create transfer")
    
    return result.data[0]


@router.get("", response_model=list[StockTransferWithStores])
async def list_transfers(
    status: Optional[TransferStatus] = None,
    from_store_id: Optional[int] = None,
    to_store_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["inventory.transfer.view"]))
):
    """
    List stock transfers.
    
    - Regular users see transfers involving their stores
    - Admins can see all transfers
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    permissions = current_user.get("permissions", [])
    is_admin = "Admin" in current_user.get("roles", [])
    user_stores = current_user.get("store_ids", [])
    
    # Build query with store names
    query = supabase.table("stock_transfers").select(
        "*, "
        "from_store:shops!stock_transfers_from_store_id_fkey(name), "
        "to_store:shops!stock_transfers_to_store_id_fkey(name)"
    )
    
    # Filter by status
    if status:
        query = query.eq("status", status.value)
    
    # Filter by stores
    if from_store_id:
        query = query.eq("from_store_id", from_store_id)
    if to_store_id:
        query = query.eq("to_store_id", to_store_id)
    
    # Non-admins only see their stores
    if not is_admin and user_stores:
        query = query.or_(
            f"from_store_id.in.({','.join(map(str, user_stores))}),to_store_id.in.({','.join(map(str, user_stores))})"
        )
    
    # Date filters
    if from_date:
        query = query.gte("transfer_date", from_date.isoformat())
    if to_date:
        query = query.lte("transfer_date", to_date.isoformat())
    
    # Order and paginate
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform to include store names
    transfers = []
    for row in result.data:
        row["from_store_name"] = row.get("from_store", {}).get("name") if row.get("from_store") else None
        row["to_store_name"] = row.get("to_store", {}).get("name") if row.get("to_store") else None
        # Remove nested objects
        row.pop("from_store", None)
        row.pop("to_store", None)
        transfers.append(row)
    
    return transfers


@router.get("/{transfer_id}", response_model=StockTransferWithStores)
async def get_transfer(
    transfer_id: UUID,
    current_user: dict = Depends(require_permission(["inventory.transfer.view"]))
):
    """Get a specific transfer by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("stock_transfers").select(
        "*, "
        "from_store:shops!stock_transfers_from_store_id_fkey(name), "
        "to_store:shops!stock_transfers_to_store_id_fkey(name)"
    ).eq("id", str(transfer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    row = result.data[0]
    row["from_store_name"] = row.get("from_store", {}).get("name") if row.get("from_store") else None
    row["to_store_name"] = row.get("to_store", {}).get("name") if row.get("to_store") else None
    row.pop("from_store", None)
    row.pop("to_store", None)
    
    return row


@router.post("/{transfer_id}/receive", response_model=StockTransfer)
async def receive_transfer(
    transfer_id: UUID,
    current_user: dict = Depends(require_permission(["inventory.transfer.receive"]))
):
    """
    Mark a transfer as received by the destination store.
    
    Requirements:
    - Transfer must be in SENT status
    - User must be assigned to the destination store (or have approve permission)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    user_id = current_user["user_id"]
    user_stores = current_user.get("store_ids", [])
    permissions = current_user.get("permissions", [])
    
    # Get transfer
    result = supabase.table("stock_transfers").select("*").eq("id", str(transfer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    transfer = result.data[0]
    
    # Validate status
    if transfer["status"] != "SENT":
        raise HTTPException(status_code=400, detail=f"Cannot receive transfer in {transfer['status']} status")
    
    # Validate store access (receiver must be at destination store or have approve permission)
    can_approve = "inventory.transfer.approve" in permissions
    if not can_approve and transfer["to_store_id"] not in user_stores:
        raise HTTPException(status_code=403, detail="You can only receive transfers for your assigned store")
    
    # Update transfer
    update_result = supabase.table("stock_transfers").update({
        "status": "RECEIVED",
        "received_by": user_id,
        "received_at": datetime.utcnow().isoformat()
    }).eq("id", str(transfer_id)).execute()
    
    return update_result.data[0]


@router.post("/{transfer_id}/approve", response_model=StockTransfer)
async def approve_transfer(
    transfer_id: UUID,
    current_user: dict = Depends(require_permission(["inventory.transfer.approve"]))
):
    """
    Approve a transfer and update inventory.
    
    Requirements:
    - Transfer must be in SENT or RECEIVED status
    - Inventory ledger will be updated (debit sender, credit receiver)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    user_id = current_user["user_id"]
    
    # Get transfer
    result = supabase.table("stock_transfers").select("*").eq("id", str(transfer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    transfer = result.data[0]
    
    # Validate status
    if transfer["status"] not in ["SENT", "RECEIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve transfer in {transfer['status']} status")
    
    # Re-validate stock availability
    stock_check = supabase.rpc("validate_stock_available", {
        "p_store_id": transfer["from_store_id"],
        "p_bird_type": transfer["bird_type"],
        "p_inventory_type": transfer["inventory_type"],
        "p_required_qty": float(transfer["weight_kg"])
    }).execute()
    
    if not stock_check.data:
        raise HTTPException(status_code=400, detail="Sender store no longer has sufficient stock")
    
    # Atomic status update and inventory ledger creation
    result = supabase.rpc("process_stock_transfer_approval", {
        "p_transfer_id": str(transfer_id),
        "p_user_id": user_id
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to process transfer approval")
        
    # Refresh transfer data to return
    result = supabase.table("stock_transfers").select("*").eq("id", str(transfer_id)).execute()
    return result.data[0]


@router.post("/{transfer_id}/reject", response_model=StockTransfer)
async def reject_transfer(
    transfer_id: UUID,
    rejection: TransferReject,
    current_user: dict = Depends(require_permission(["inventory.transfer.receive"]))
):
    """
    Reject a transfer.
    
    Requirements:
    - Transfer must be in SENT or RECEIVED status
    - Inventory is NOT affected
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    user_id = current_user["user_id"]
    user_stores = current_user.get("store_ids", [])
    permissions = current_user.get("permissions", [])
    
    # Get transfer
    result = supabase.table("stock_transfers").select("*").eq("id", str(transfer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    transfer = result.data[0]
    
    # Validate status
    if transfer["status"] not in ["SENT", "RECEIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject transfer in {transfer['status']} status")
    
    # Validate access (receiver or admin can reject)
    can_approve = "inventory.transfer.approve" in permissions
    if not can_approve and transfer["to_store_id"] not in user_stores:
        raise HTTPException(status_code=403, detail="You can only reject transfers for your assigned store")
    
    # Update transfer
    update_result = supabase.table("stock_transfers").update({
        "status": "REJECTED",
        "rejection_reason": rejection.rejection_reason
    }).eq("id", str(transfer_id)).execute()
    
    return update_result.data[0]
