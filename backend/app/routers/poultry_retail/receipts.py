"""
Receipts Router for PoultryRetail-Core
======================================
API endpoints for receipt (customer payment) management.
Receipts track payments received from customers against sales.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.receipts import (
    ReceiptCreate, Receipt, ReceiptWithDetails
)

router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.get("", response_model=list[ReceiptWithDetails])
async def list_receipts(
    customer_id: Optional[UUID] = None,
    sale_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    x_store_id: Optional[int] = Header(None),
    current_user: dict = Depends(require_permission(["receipt.view"]))
):
    """List all receipts with optional filters."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Join with customers and sales for details
    query = supabase.table("receipts").select(
        "*, customers(name), sales(invoice_number)"
    )
    
    if x_store_id:
        query = query.eq("store_id", x_store_id)
    
    if customer_id:
        query = query.eq("customer_id", str(customer_id))
    
    if sale_id:
        query = query.eq("sale_id", str(sale_id))
    
    if from_date:
        query = query.gte("receipt_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("receipt_date", to_date.isoformat())
    
    query = query.order("receipt_date", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform result
    receipts = []
    for row in result.data:
        customer_data = row.pop("customers", {})
        sales_data = row.pop("sales", {})
        row["customer_name"] = customer_data.get("name") if customer_data else None
        row["sale_invoice"] = sales_data.get("invoice_number") if sales_data else None
        receipts.append(row)
    
    return receipts


@router.get("/{receipt_id}", response_model=ReceiptWithDetails)
async def get_receipt(
    receipt_id: UUID,
    current_user: dict = Depends(require_permission(["receipt.view"]))
):
    """Get receipt by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("receipts").select(
        "*, customers(name), sales(invoice_number)"
    ).eq("id", str(receipt_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    row = result.data[0]
    customer_data = row.pop("customers", {})
    sales_data = row.pop("sales", {})
    row["customer_name"] = customer_data.get("name") if customer_data else None
    row["sale_invoice"] = sales_data.get("invoice_number") if sales_data else None
    
    return row


@router.post("", response_model=Receipt, status_code=201)
async def create_receipt(
    receipt: ReceiptCreate,
    x_store_id: Optional[int] = Header(None),
    current_user: dict = Depends(require_permission(["receipt.write"]))
):
    """
    Create a new receipt (payment from customer).
    
    - Validates receipt amount against sale outstanding (if linked to sale)
    - Creates entry in financial_ledger (CUSTOMER credit)
    - Updates sale payment_status if linked
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Validate sale outstanding if sale_id provided
    if receipt.sale_id:
        sale_outstanding = supabase.rpc(
            "get_sale_outstanding",
            {"p_sale_id": str(receipt.sale_id)}
        ).execute()
        
        outstanding = Decimal(str(sale_outstanding.data)) if sale_outstanding.data else Decimal("0")
        
        if receipt.amount > outstanding:
            raise HTTPException(
                status_code=400, 
                detail=f"Receipt amount ({receipt.amount}) exceeds sale outstanding ({outstanding})"
            )
    
    # Generate receipt number
    receipt_num_result = supabase.rpc("generate_receipt_number").execute()
    receipt_number = receipt_num_result.data if receipt_num_result.data else f"RCP-{UUID()}"
    
    # Create receipt
    data = receipt.model_dump()
    data["receipt_number"] = receipt_number
    data["store_id"] = x_store_id
    data["created_by"] = current_user["user_id"]
    data["amount"] = float(data["amount"])
    
    # Convert UUIDs to strings
    if data.get("sale_id"):
        data["sale_id"] = str(data["sale_id"])
    data["customer_id"] = str(data["customer_id"])
    
    result = supabase.table("receipts").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create receipt")
    
    created_receipt = result.data[0]
    
    # Create financial_ledger entry (CUSTOMER credit)
    ledger_entry = {
        "store_id": x_store_id,
        "entity_type": "CUSTOMER",
        "entity_id": str(receipt.customer_id),
        "transaction_type": "RECEIPT",
        "debit": 0,
        "credit": float(receipt.amount),
        "ref_table": "receipts",
        "ref_id": created_receipt["id"],
        "notes": f"Receipt {receipt_number}",
        "created_by": current_user["user_id"]
    }
    
    supabase.table("financial_ledger").insert(ledger_entry).execute()
    
    # Update sale payment_status if linked
    if receipt.sale_id:
        # Check new outstanding after this receipt
        new_outstanding = supabase.rpc(
            "get_sale_outstanding",
            {"p_sale_id": str(receipt.sale_id)}
        ).execute()
        
        outstanding = Decimal(str(new_outstanding.data)) if new_outstanding.data else Decimal("0")
        
        new_status = "PAID" if outstanding <= 0 else "PARTIAL"
        
        supabase.table("sales").update(
            {"payment_status": new_status}
        ).eq("id", str(receipt.sale_id)).execute()
    
    return created_receipt
