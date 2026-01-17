"""
Finance Router for PoultryRetail-Core
=====================================
API endpoints for financial tracking, cashbook, and submissions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.enums import SettlementStatus, ExpenseStatus
from app.routers.poultry_retail.utils import has_allstores_permission

router = APIRouter(prefix="/finance", tags=["Finance"])

class CashbookEntry(BaseModel):
    """Entry representing a store's cash submission for a date"""
    id: UUID
    store_id: int
    store_name: Optional[str] = None
    settlement_date: date
    declared_cash: Decimal
    expense_amount: Decimal
    expense_status: ExpenseStatus
    submit_amount: Decimal
    status: SettlementStatus
    is_estimated: bool
    notes: Optional[str] = None

class CashbookResponse(BaseModel):
    """Response model for cashbook entries"""
    entries: List[CashbookEntry]
    total_cash: Decimal
    total_expenses: Decimal
    total_to_collect: Decimal

@router.get("/cashbook", response_model=CashbookResponse)
async def get_cashbook(
    x_store_id: Optional[int] = Header(None, description="Store ID for context (optional for admin)"),
    store_id: Optional[int] = Query(None, description="Filter by specific store"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    current_user: dict = Depends(require_permission(["cashbook.read"]))
):
    """
    Getaggregated cashbook view for stores.
    """
    from app.config.database import get_supabase
    from decimal import Decimal
    
    supabase = get_supabase()
    
    # Determine which stores the user can access
    can_see_all = has_allstores_permission(current_user)
    user_store_ids = current_user.get("store_ids", [])
    
    # Build query
    query = supabase.table("daily_settlements").select(
        "id, store_id, settlement_date, declared_cash, expense_amount, expense_status, status, "
        "shops:store_id(name)"
    )
    
    # Apply store filter
    filter_store_id = store_id or x_store_id
    if filter_store_id:
        if not can_see_all and filter_store_id not in user_store_ids:
            return CashbookResponse(entries=[], total_cash=0, total_expenses=0, total_to_collect=0)
        query = query.eq("store_id", filter_store_id)
    elif not can_see_all:
        if not user_store_ids:
            return CashbookResponse(entries=[], total_cash=0, total_expenses=0, total_to_collect=0)
        query = query.in_("store_id", user_store_ids)
    
    # Apply date filters
    if from_date:
        query = query.gte("settlement_date", from_date.isoformat())
    if to_date:
        query = query.lte("settlement_date", to_date.isoformat())
    
    # Exclude drafts
    query = query.neq("status", "DRAFT").order("settlement_date", desc=True)
    
    result = query.execute()
    
    entries = []
    total_cash = Decimal("0")
    total_exp = Decimal("0")
    total_collect = Decimal("0")
    
    for row in result.data:
        declared_cash = Decimal(str(row["declared_cash"]))
        expense_amount = Decimal(str(row["expense_amount"]))
        status = row["status"]
        expense_status = row.get("expense_status", "SUBMITTED") # Default to SUBMITTED if not present
        
        is_estimated = (status == "SUBMITTED")
        
        # Logic: Deduct expense ONLY if NOT rejected
        if expense_status == "REJECTED":
            submit_amount = declared_cash
        else:
            submit_amount = declared_cash - expense_amount
            
        entries.append(CashbookEntry(
            id=row["id"],
            store_id=row["store_id"],
            store_name=row["shops"]["name"] if row.get("shops") else f"Store #{row['store_id']}",
            settlement_date=row["settlement_date"],
            declared_cash=declared_cash,
            expense_amount=expense_amount,
            expense_status=ExpenseStatus(expense_status),
            submit_amount=submit_amount,
            status=SettlementStatus(status),
            is_estimated=is_estimated
        ))
        
        total_cash += declared_cash
        total_exp += expense_amount if expense_status != "REJECTED" else 0
        total_collect += submit_amount
        
    return CashbookResponse(
        entries=entries,
        total_cash=total_cash,
        total_expenses=total_exp,
        total_to_collect=total_collect
    )
