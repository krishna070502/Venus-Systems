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
    store_id: Optional[int]
    entity_type: str
    entity_id: UUID
    transaction_type: str
    debit: Decimal
    credit: Decimal
    notes: Optional[str]
    ref_table: Optional[str]
    ref_id: Optional[UUID]
    created_at: datetime


class EnrichedLedgerEntry(LedgerEntry):
    """Ledger entry with entity name and phone"""
    entity_name: str = "Unknown"
    entity_phone: Optional[str] = None


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
    store_id: Optional[int] = None,
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
        ledger_query = supabase.table("financial_ledger").select(
            "debit, credit"
        ).eq("entity_type", "SUPPLIER").eq("entity_id", supplier_id)
        
        if store_id:
            ledger_query = ledger_query.eq("store_id", store_id)
            
        ledger_result = ledger_query.execute()
        
        # If filtering by store, skip partners with no activity in that store
        if store_id and not ledger_result.data:
            continue
        
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
    store_id: Optional[int] = None,
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
        ledger_query = supabase.table("financial_ledger").select(
            "debit, credit"
        ).eq("entity_type", "CUSTOMER").eq("entity_id", customer_id)
        
        if store_id:
            ledger_query = ledger_query.eq("store_id", store_id)
            
        ledger_result = ledger_query.execute()

        # If filtering by store, skip partners with no activity in that store
        if store_id and not ledger_result.data:
            continue
        
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


@router.get("/all", response_model=list[EnrichedLedgerEntry])
async def get_all_ledger_entries(
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    entity_type: Optional[str] = None,
    transaction_type: Optional[str] = None,
    store_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission(["ledger.view"]))
):
    """
    Get all financial ledger entries with filters and enriched entity data.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("financial_ledger").select("*")
    
    # Apply filters
    if from_date:
        query = query.gte("created_at", from_date)
    if to_date:
        query = query.lte("created_at", to_date)
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if transaction_type:
        query = query.eq("transaction_type", transaction_type)
    if store_id:
        query = query.eq("store_id", store_id)
    if search:
        # Search customers
        cust_matches = supabase.table("customers").select("id").ilike("name", f"%{search}%").execute()
        cust_ids = [c["id"] for c in cust_matches.data]
        
        # Search suppliers
        supp_matches = supabase.table("suppliers").select("id").ilike("name", f"%{search}%").execute()
        supp_ids = [s["id"] for s in supp_matches.data]
        
        all_match_ids = cust_ids + supp_ids
        if all_match_ids:
            query = query.in_("entity_id", all_match_ids)
        else:
            # If search is provided but no entities match, search in notes
            query = query.ilike("notes", f"%{search}%")

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    ledger_entries = result.data
    
    if not ledger_entries:
        return []

    # Enrich with entity names
    customer_ids = {e["entity_id"] for e in ledger_entries if e["entity_type"] == "CUSTOMER"}
    supplier_ids = {e["entity_id"] for e in ledger_entries if e["entity_type"] == "SUPPLIER"}
    
    entity_map = {}
    
    if customer_ids:
        customers = supabase.table("customers").select("id, name, phone").in_("id", list(customer_ids)).execute()
        for c in customers.data:
            entity_map[c["id"]] = {"name": c["name"], "phone": c["phone"]}
            
    if supplier_ids:
        suppliers = supabase.table("suppliers").select("id, name, phone").in_("id", list(supplier_ids)).execute()
        for s in suppliers.data:
            entity_map[s["id"]] = {"name": s["name"], "phone": s["phone"]}
            
    # Map back to results
    enriched_results = []
    for entry in ledger_entries:
        entity_info = entity_map.get(entry["entity_id"], {"name": "Unknown", "phone": None})
        enriched_results.append({
            **entry,
            "entity_name": entity_info["name"],
            "entity_phone": entity_info["phone"]
        })
        
    return enriched_results
