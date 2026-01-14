"""
Ledger Router for PoultryRetail-Core
====================================
API endpoints for financial ledger views.
Provides aggregated views of supplier and customer balances.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel
from datetime import datetime

from app.dependencies.rbac import require_permission

router = APIRouter(prefix="/ledger", tags=["Ledger"])


class LedgerEntry(BaseModel):
    """Individual ledger transaction"""
    id: UUID
    transaction_type: str
    debit: Decimal
    credit: Decimal
    notes: Optional[str]
    ref_table: Optional[str]
    ref_id: Optional[UUID]
    created_at: datetime


class EntityBalance(BaseModel):
    """Balance summary for an entity"""
    entity_id: UUID
    entity_name: str
    total_debit: Decimal
    total_credit: Decimal
    outstanding: Decimal


class SupplierLedgerSummary(EntityBalance):
    """Supplier balance with additional details"""
    phone: Optional[str] = None
    total_purchases: Decimal = Decimal("0")
    total_payments: Decimal = Decimal("0")


class CustomerLedgerSummary(EntityBalance):
    """Customer balance with additional details"""
    phone: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    total_sales: Decimal = Decimal("0")
    total_receipts: Decimal = Decimal("0")


@router.get("/suppliers", response_model=list[SupplierLedgerSummary])
async def get_supplier_ledger(
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["ledger.view"]))
):
    """
    Get supplier ledger summary.
    Shows all suppliers with their total purchases, payments, and outstanding balance.
    Outstanding = Total Purchases (credit) - Total Payments (debit)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get all suppliers
    suppliers_result = supabase.table("suppliers").select(
        "id, name, phone"
    ).eq("status", "ACTIVE").order("name").range(offset, offset + limit - 1).execute()
    
    ledger_summaries = []
    
    for supplier in suppliers_result.data:
        supplier_id = supplier["id"]
        
        # Get aggregated ledger data for this supplier
        ledger_result = supabase.table("financial_ledger").select(
            "debit, credit"
        ).eq("entity_type", "SUPPLIER").eq("entity_id", supplier_id).execute()
        
        total_debit = sum(Decimal(str(e["debit"])) for e in ledger_result.data)
        total_credit = sum(Decimal(str(e["credit"])) for e in ledger_result.data)
        
        # For suppliers: Credit = they owe us less, Debit = we paid them
        # Outstanding = Credit - Debit (positive means we owe them)
        outstanding = total_credit - total_debit
        
        ledger_summaries.append({
            "entity_id": supplier_id,
            "entity_name": supplier["name"],
            "phone": supplier.get("phone"),
            "total_debit": total_debit,
            "total_credit": total_credit,
            "outstanding": outstanding,
            "total_purchases": total_credit,  # Purchases add to credit (what we owe)
            "total_payments": total_debit,    # Payments add to debit (what we paid)
        })
    
    # Sort by outstanding (highest first)
    ledger_summaries.sort(key=lambda x: x["outstanding"], reverse=True)
    
    return ledger_summaries


@router.get("/suppliers/{supplier_id}", response_model=list[LedgerEntry])
async def get_supplier_ledger_detail(
    supplier_id: UUID,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["ledger.view"]))
):
    """Get detailed ledger entries for a specific supplier."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("financial_ledger").select("*").eq(
        "entity_type", "SUPPLIER"
    ).eq("entity_id", str(supplier_id)).order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1).execute()
    
    return result.data


@router.get("/customers", response_model=list[CustomerLedgerSummary])
async def get_customer_ledger(
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["ledger.view"]))
):
    """
    Get customer ledger summary.
    Shows all customers with their total sales, receipts, and outstanding balance.
    Outstanding = Total Sales (debit) - Total Receipts (credit)
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get all active customers
    customers_result = supabase.table("customers").select(
        "id, name, phone, credit_limit"
    ).eq("status", "ACTIVE").order("name").range(offset, offset + limit - 1).execute()
    
    ledger_summaries = []
    
    for customer in customers_result.data:
        customer_id = customer["id"]
        
        # Get aggregated ledger data for this customer
        ledger_result = supabase.table("financial_ledger").select(
            "debit, credit"
        ).eq("entity_type", "CUSTOMER").eq("entity_id", customer_id).execute()
        
        total_debit = sum(Decimal(str(e["debit"])) for e in ledger_result.data)
        total_credit = sum(Decimal(str(e["credit"])) for e in ledger_result.data)
        
        # For customers: Debit = they owe us (sales), Credit = they paid us (receipts)
        # Outstanding = Debit - Credit (positive means they owe us)
        outstanding = total_debit - total_credit
        
        ledger_summaries.append({
            "entity_id": customer_id,
            "entity_name": customer["name"],
            "phone": customer.get("phone"),
            "credit_limit": Decimal(str(customer.get("credit_limit", 0))),
            "total_debit": total_debit,
            "total_credit": total_credit,
            "outstanding": outstanding,
            "total_sales": total_debit,      # Sales add to debit (what they owe)
            "total_receipts": total_credit,  # Receipts add to credit (what they paid)
        })
    
    # Sort by outstanding (highest first)
    ledger_summaries.sort(key=lambda x: x["outstanding"], reverse=True)
    
    return ledger_summaries


@router.get("/customers/{customer_id}", response_model=list[LedgerEntry])
async def get_customer_ledger_detail(
    customer_id: UUID,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["ledger.view"]))
):
    """Get detailed ledger entries for a specific customer."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("financial_ledger").select("*").eq(
        "entity_type", "CUSTOMER"
    ).eq("entity_id", str(customer_id)).order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1).execute()
    
    return result.data
