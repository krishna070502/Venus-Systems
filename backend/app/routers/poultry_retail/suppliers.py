"""
Suppliers Router for PoultryRetail-Core
=======================================
API endpoints for supplier management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.suppliers import (
    SupplierCreate, SupplierUpdate, Supplier
)
from app.models.poultry_retail.enums import SupplierStatus

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=list[Supplier])
async def list_suppliers(
    status: Optional[SupplierStatus] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["suppliers.view"]))
):
    """
    List all suppliers with optional filters.
    
    - **status**: Filter by supplier status (ACTIVE/INACTIVE)
    - **search**: Search by name or contact
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("suppliers").select("*")
    
    if status:
        query = query.eq("status", status.value)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,contact_name.ilike.%{search}%")
    
    query = query.order("name").range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return result.data


@router.get("/{supplier_id}", response_model=Supplier)
async def get_supplier(
    supplier_id: UUID,
    current_user: dict = Depends(require_permission(["suppliers.view"]))
):
    """Get supplier by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("suppliers").select("*").eq("id", str(supplier_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return result.data[0]


@router.post("", response_model=Supplier, status_code=201)
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(require_permission(["suppliers.create"]))
):
    """Create a new supplier."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    data = supplier.model_dump()
    data["created_by"] = current_user["user_id"]
    
    result = supabase.table("suppliers").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create supplier")
    
    return result.data[0]


@router.patch("/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: UUID,
    supplier: SupplierUpdate,
    current_user: dict = Depends(require_permission(["suppliers.edit"]))
):
    """Update supplier details."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check supplier exists
    existing = supabase.table("suppliers").select("id").eq("id", str(supplier_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("suppliers").update(update_data).eq("id", str(supplier_id)).execute()
    
    return result.data[0]


@router.delete("/{supplier_id}", status_code=204)
async def deactivate_supplier(
    supplier_id: UUID,
    current_user: dict = Depends(require_permission(["suppliers.delete"]))
):
    """Deactivate a supplier (soft delete)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Soft delete by setting status to INACTIVE
    result = supabase.table("suppliers").update(
        {"status": "INACTIVE"}
    ).eq("id", str(supplier_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return None
