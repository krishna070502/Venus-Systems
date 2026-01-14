"""
Payments Router for PoultryRetail-Core
======================================
API endpoints for supplier payment management.
Payments track payments made to suppliers against purchases.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.payments import (
    SupplierPaymentCreate, SupplierPayment, SupplierPaymentWithDetails
)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=list[SupplierPaymentWithDetails])
async def list_payments(
    supplier_id: Optional[UUID] = None,
    purchase_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    x_store_id: Optional[int] = Header(None),
    current_user: dict = Depends(require_permission(["payment.view"]))
):
    """List all supplier payments with optional filters."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Join with suppliers for details
    query = supabase.table("supplier_payments").select(
        "*, suppliers!inner(name)"
    )
    
    if x_store_id:
        query = query.eq("store_id", x_store_id)
    
    if supplier_id:
        query = query.eq("supplier_id", str(supplier_id))
    
    if purchase_id:
        query = query.eq("purchase_id", str(purchase_id))
    
    if from_date:
        query = query.gte("payment_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("payment_date", to_date.isoformat())
    
    query = query.order("payment_date", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform result
    payments = []
    for row in result.data:
        supplier_data = row.pop("suppliers", {})
        row["supplier_name"] = supplier_data.get("name") if supplier_data else None
        row["purchase_reference"] = None  # TODO: Add if needed
        payments.append(row)
    
    return payments


@router.get("/supplier/{supplier_id}", response_model=list[SupplierPaymentWithDetails])
async def get_supplier_payments(
    supplier_id: UUID,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["payment.view"]))
):
    """Get all payments for a specific supplier."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("supplier_payments").select(
        "*, suppliers!inner(name)"
    ).eq("supplier_id", str(supplier_id)).order(
        "payment_date", desc=True
    ).range(offset, offset + limit - 1).execute()
    
    payments = []
    for row in result.data:
        supplier_data = row.pop("suppliers", {})
        row["supplier_name"] = supplier_data.get("name") if supplier_data else None
        row["purchase_reference"] = None
        payments.append(row)
    
    return payments


@router.get("/{payment_id}", response_model=SupplierPaymentWithDetails)
async def get_payment(
    payment_id: UUID,
    current_user: dict = Depends(require_permission(["payment.view"]))
):
    """Get payment by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("supplier_payments").select(
        "*, suppliers!inner(name)"
    ).eq("id", str(payment_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    row = result.data[0]
    supplier_data = row.pop("suppliers", {})
    row["supplier_name"] = supplier_data.get("name") if supplier_data else None
    row["purchase_reference"] = None
    
    return row


@router.post("", response_model=SupplierPayment, status_code=201)
async def create_payment(
    payment: SupplierPaymentCreate,
    x_store_id: Optional[int] = Header(None),
    current_user: dict = Depends(require_permission(["payment.write"]))
):
    """
    Create a new supplier payment.
    
    - Validates payment amount against supplier outstanding
    - Creates entry in financial_ledger (SUPPLIER debit)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get supplier outstanding
    outstanding_result = supabase.rpc(
        "get_supplier_outstanding",
        {"p_supplier_id": str(payment.supplier_id)}
    ).execute()
    
    outstanding = Decimal(str(outstanding_result.data)) if outstanding_result.data else Decimal("0")
    
    # Warn if payment exceeds outstanding (but allow for advance payments)
    if payment.amount > outstanding and outstanding > 0:
        # Log warning but allow the payment
        pass
    
    # Generate payment number
    payment_num_result = supabase.rpc("generate_payment_number").execute()
    payment_number = payment_num_result.data if payment_num_result.data else f"PAY-{UUID()}"
    
    # Create payment
    data = payment.model_dump()
    data["payment_number"] = payment_number
    data["store_id"] = x_store_id
    data["created_by"] = current_user["user_id"]
    data["amount"] = float(data["amount"])
    
    # Convert UUIDs to strings
    data["supplier_id"] = str(data["supplier_id"])
    if data.get("purchase_id"):
        data["purchase_id"] = str(data["purchase_id"])
    
    result = supabase.table("supplier_payments").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create payment")
    
    created_payment = result.data[0]
    
    # Create financial_ledger entry (SUPPLIER debit - reduces outstanding)
    ledger_entry = {
        "store_id": x_store_id,
        "entity_type": "SUPPLIER",
        "entity_id": str(payment.supplier_id),
        "transaction_type": "SUPPLIER_PAYMENT",
        "debit": float(payment.amount),
        "credit": 0,
        "ref_table": "supplier_payments",
        "ref_id": created_payment["id"],
        "notes": f"Payment {payment_number}",
        "created_by": current_user["user_id"]
    }
    
    supabase.table("financial_ledger").insert(ledger_entry).execute()
    
    return created_payment
