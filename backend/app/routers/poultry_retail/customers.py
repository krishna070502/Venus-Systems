"""
Customers Router for PoultryRetail-Core
=======================================
API endpoints for customer management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.customers import (
    CustomerCreate, CustomerUpdate, Customer, CustomerWithBalance, CustomerStatus
)
from app.models.poultry_retail.ledger import FinancialLedgerEntry

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=list[CustomerWithBalance])
async def list_customers(
    status: Optional[CustomerStatus] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["customer.view"]))
):
    """List all customers with optional filters and computed outstanding balance."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("customers").select("*")
    
    if status:
        query = query.eq("status", status.value)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%,email.ilike.%{search}%")
    
    query = query.order("name").range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Compute outstanding balance for each customer from financial_ledger
    customers = []
    for row in result.data:
        customer_id = row["id"]
        
        # Get outstanding from financial_ledger
        ledger_result = supabase.rpc(
            "get_customer_outstanding",
            {"p_customer_id": customer_id}
        ).execute()
        
        outstanding = Decimal(str(ledger_result.data)) if ledger_result.data else Decimal("0")
        row["outstanding_balance"] = outstanding
        customers.append(row)
    
    return customers


@router.get("/{customer_id}", response_model=CustomerWithBalance)
async def get_customer(
    customer_id: UUID,
    current_user: dict = Depends(require_permission(["customer.view"]))
):
    """Get customer by ID with computed outstanding balance."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("customers").select("*").eq("id", str(customer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = result.data[0]
    
    # Compute outstanding balance
    ledger_result = supabase.rpc(
        "get_customer_outstanding",
        {"p_customer_id": str(customer_id)}
    ).execute()
    
    customer["outstanding_balance"] = Decimal(str(ledger_result.data)) if ledger_result.data else Decimal("0")
    
    return customer


@router.post("", response_model=Customer, status_code=201)
async def create_customer(
    customer: CustomerCreate,
    current_user: dict = Depends(require_permission(["customer.write"]))
):
    """Create a new customer."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    data = customer.model_dump()
    data["created_by"] = current_user["user_id"]
    
    # Convert Decimal to float for JSON serialization
    if "credit_limit" in data:
        data["credit_limit"] = float(data["credit_limit"])
    
    result = supabase.table("customers").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create customer")
    
    return result.data[0]


@router.patch("/{customer_id}", response_model=Customer)
async def update_customer(
    customer_id: UUID,
    customer: CustomerUpdate,
    current_user: dict = Depends(require_permission(["customer.update"]))
):
    """Update customer details."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check customer exists
    existing = supabase.table("customers").select("id").eq("id", str(customer_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Convert Decimal to float
    if "credit_limit" in update_data and update_data["credit_limit"] is not None:
        update_data["credit_limit"] = float(update_data["credit_limit"])
    
    result = supabase.table("customers").update(update_data).eq("id", str(customer_id)).execute()
    
    return result.data[0]


@router.delete("/{customer_id}", status_code=204)
async def deactivate_customer(
    customer_id: UUID,
    current_user: dict = Depends(require_permission(["customer.delete"]))
):
    """Deactivate a customer (soft delete)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("customers").update(
        {"status": "INACTIVE"}
    ).eq("id", str(customer_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return None
@router.get("/{customer_id}/ledger", response_model=list[FinancialLedgerEntry])
async def get_customer_ledger(
    customer_id: UUID,
    current_user: dict = Depends(require_permission(["customer.view"]))
):
    """Get all ledger entries for a customer."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("financial_ledger") \
        .select("*") \
        .eq("entity_type", "CUSTOMER") \
        .eq("entity_id", str(customer_id)) \
        .order("created_at", desc=True) \
        .execute()
    
    return result.data
