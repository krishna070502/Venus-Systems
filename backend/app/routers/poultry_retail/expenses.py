"""
Expenses Router for PoultryRetail-Core
======================================
API endpoints for viewing settlement expenses with bill receipts.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional, List
from datetime import date, datetime, timedelta
from uuid import UUID
from pydantic import BaseModel
from decimal import Decimal

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.enums import SettlementStatus, ExpenseStatus
from app.models.poultry_retail.settlements import (
    ExpenseAnalyticsResponse, 
    ExpenseTrendItem, 
    ExpenseCategoryItem
)
from app.routers.poultry_retail.utils import has_allstores_permission, validate_store_access


router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/analytics", response_model=ExpenseAnalyticsResponse)
async def get_expense_analytics(
    x_store_id: Optional[int] = Header(None, description="Store ID for context (optional for admin)"),
    store_id: Optional[int] = Query(None, description="Filter by specific store"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    current_user: dict = Depends(require_permission(["expensereport.view"]))
):
    """
    Get comprehensive expense analytics.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # 1. Store Validation
    target_store_id = store_id or x_store_id
    if target_store_id:
        if not validate_store_access(target_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # 2. Date Range Setup
    if not to_date:
        to_date = date.today()
    if not from_date:
        from_date = to_date - timedelta(days=30)
        
    # 3. Fetch Data
    # Fetch data from daily_settlements where expense_amount > 0
    query = supabase.table("daily_settlements").select(
        "settlement_date, expense_amount, expense_notes, expense_status"
    ).gte("settlement_date", from_date.isoformat()).lte("settlement_date", to_date.isoformat()).gt("expense_amount", 0)
    
    if target_store_id:
        query = query.eq("store_id", target_store_id)
    else:
        # If no store specified, filter by user access
        can_see_all = has_allstores_permission(current_user)
        user_store_ids = current_user.get("store_ids", [])
        if not can_see_all:
            if not user_store_ids:
                return ExpenseAnalyticsResponse(kpis={}, trends=[], categories=[], top_expenses=[])
            query = query.in_("store_id", user_store_ids)
            
    result = query.execute()
    data = result.data or []
    
    # 4. Aggregation Logic
    total_expense = Decimal("0.00")
    approved_expense = Decimal("0.00")
    pending_expense = Decimal("0.00")
    
    daily_totals = {}
    category_totals = {
        "Salary": Decimal("0.00"),
        "Rent": Decimal("0.00"),
        "Utilities": Decimal("0.00"),
        "Maintenance": Decimal("0.00"),
        "Transport": Decimal("0.00"),
        "Others": Decimal("0.00")
    }
    
    # Simple keyword mapping for categorization
    keyword_map = {
        "Salary": ["salary", "wage", "staff", "payment", "worker", "daily"],
        "Rent": ["rent", "shop", "building"],
        "Utilities": ["electricity", "water", "bill", "power", "current", "eb"],
        "Maintenance": ["repair", "maintenance", "fix", "service", "cleaning"],
        "Transport": ["fuel", "diesel", "petrol", "transport", "freight", "auto", "delivery"]
    }
    
    all_expenses = []
    
    for row in data:
        amount = Decimal(str(row["expense_amount"]))
        dt_str = row["settlement_date"]
        notes = (row.get("expense_notes") or "").lower()
        status = row.get("expense_status", "SUBMITTED")
        
        total_expense += amount
        if status == "APPROVED":
            approved_expense += amount
        elif status == "SUBMITTED":
            pending_expense += amount
            
        # Daily trend
        daily_totals[dt_str] = daily_totals.get(dt_str, Decimal("0.00")) + amount
        
        # Category breakdown
        found_cat = False
        for cat, keywords in keyword_map.items():
            if any(k in notes for k in keywords):
                category_totals[cat] += amount
                found_cat = True
                break
        if not found_cat:
            category_totals["Others"] += amount
            
        all_expenses.append({
            "date": dt_str,
            "amount": float(amount),
            "notes": row["expense_notes"],
            "status": status
        })
        
    # 5. Format Responses
    # Trends
    trends = []
    curr_date = from_date
    while curr_date <= to_date:
        d_str = curr_date.isoformat()
        trends.append(ExpenseTrendItem(
            date=d_str,
            amount=daily_totals.get(d_str, Decimal("0.00"))
        ))
        curr_date += timedelta(days=1)
        
    # Categories
    categories = []
    if total_expense > 0:
        for cat, amt in category_totals.items():
            if amt > 0:
                percentage = (amt / total_expense * 100)
                categories.append(ExpenseCategoryItem(
                    category=cat,
                    amount=amt,
                    percentage=percentage
                ))
            
    # KPI Calculations
    num_days = (to_date - from_date).days + 1
    avg_daily = total_expense / num_days if num_days > 0 else 0
    
    kpis = {
        "total_expense": float(total_expense),
        "approved_expense": float(approved_expense),
        "pending_expense": float(pending_expense),
        "avg_daily_expense": float(avg_daily),
        "expense_count": len(data)
    }
    
    # Top Expenses
    top_expenses_list = sorted(all_expenses, key=lambda x: x["amount"], reverse=True)[:10]
    
    return ExpenseAnalyticsResponse(
        kpis=kpis,
        trends=trends,
        categories=categories,
        top_expenses=top_expenses_list
    )


class ExpenseItem(BaseModel):
    """Individual expense record from a settlement"""
    id: UUID  # Settlement ID
    store_id: int
    store_name: Optional[str] = None
    settlement_date: date
    expense_amount: Decimal
    expense_notes: Optional[str] = None
    expense_receipts: Optional[List[str]] = None
    status: str  # Settlement status
    expense_status: str  # Granular expense status
    submitted_by: Optional[UUID] = None
    submitted_at: Optional[str] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseListResponse(BaseModel):
    """Response model for expenses list"""
    items: List[ExpenseItem]
    total: int
    page: int
    page_size: int




@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    x_store_id: Optional[int] = Header(None, description="Store ID for context (optional for admin)"),
    store_id: Optional[int] = Query(None, description="Filter by specific store"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    status: Optional[str] = Query(None, description="Filter by settlement status"),
    expense_status: Optional[str] = Query(None, description="Filter by granular expense status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: dict = Depends(require_permission(["expense.read"]))
):
    """
    List expenses from settlements.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Determine which stores the user can access
    can_see_all = has_allstores_permission(current_user)
    user_store_ids = current_user.get("store_ids", [])
    
    # Build query
    query = supabase.table("daily_settlements").select(
        "id, store_id, settlement_date, expense_amount, expense_notes, expense_receipts, "
        "status, expense_status, submitted_by, submitted_at, approved_by, approved_at, "
        "shops:store_id(name)"
    ).gt("expense_amount", 0)
    
    # Apply store filter
    filter_store_id = store_id or x_store_id
    
    if filter_store_id:
        if not validate_store_access(filter_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
        query = query.eq("store_id", filter_store_id)
    elif not can_see_all:
        if not user_store_ids:
            return ExpenseListResponse(items=[], total=0, page=page, page_size=page_size)
        query = query.in_("store_id", user_store_ids)
    
    if from_date:
        query = query.gte("settlement_date", from_date.isoformat())
    if to_date:
        query = query.lte("settlement_date", to_date.isoformat())
    if status:
        query = query.eq("status", status)
    if expense_status:
        query = query.eq("expense_status", expense_status)
    
    # Get total count
    count_result = query.execute()
    total = len(count_result.data)
    
    # Apply pagination and ordering
    offset = (page - 1) * page_size
    query = query.order("settlement_date", desc=True).range(offset, offset + page_size - 1)
    result = query.execute()
    
    # Transform results
    items = []
    for row in result.data:
        store_name = None
        if row.get("shops"):
            store_name = row["shops"].get("name") if isinstance(row["shops"], dict) else None
        
        items.append(ExpenseItem(
            id=row["id"],
            store_id=row["store_id"],
            store_name=store_name,
            settlement_date=row["settlement_date"],
            expense_amount=row["expense_amount"],
            expense_notes=row.get("expense_notes"),
            expense_receipts=row.get("expense_receipts"),
            status=row["status"],
            expense_status=row.get("expense_status", "SUBMITTED"),
            submitted_by=row.get("submitted_by"),
            submitted_at=row.get("submitted_at"),
            approved_by=row.get("approved_by"),
            approved_at=row.get("approved_at")
        ))
    
    return ExpenseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/{expense_id}/approve", response_model=ExpenseItem)
async def approve_expense(
    expense_id: UUID,
    current_user: dict = Depends(require_permission(["expense.approve"]))
):
    """Approve a store expense."""
    from app.config.database import get_supabase
    from datetime import datetime
    
    supabase = get_supabase()
    
    # Check if exists
    check = supabase.table("daily_settlements").select("id").eq("id", str(expense_id)).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    result = supabase.table("daily_settlements").update({
        "expense_status": "APPROVED",
        "approved_by": current_user["id"],
        "approved_at": datetime.utcnow().isoformat()
    }).eq("id", str(expense_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to approve expense")
        
    return await get_expense(expense_id, current_user)


@router.post("/{expense_id}/reject", response_model=ExpenseItem)
async def reject_expense(
    expense_id: UUID,
    current_user: dict = Depends(require_permission(["expense.approve"]))
):
    """Reject a store expense."""
    from app.config.database import get_supabase
    from datetime import datetime
    
    supabase = get_supabase()
    
    # Check if exists
    check = supabase.table("daily_settlements").select("id").eq("id", str(expense_id)).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    result = supabase.table("daily_settlements").update({
        "expense_status": "REJECTED",
        "approved_by": current_user["id"],
        "approved_at": datetime.utcnow().isoformat()
    }).eq("id", str(expense_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to reject expense")
        
    return await get_expense(expense_id, current_user)


@router.get("/{expense_id}")
async def get_expense(
    expense_id: UUID,
    current_user: dict = Depends(require_permission(["expense.read"]))
):
    """Get a single expense record with full details."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("daily_settlements").select(
        "id, store_id, settlement_date, expense_amount, expense_notes, expense_receipts, "
        "status, expense_status, submitted_by, submitted_at, approved_by, approved_at, "
        "shops:store_id(name)"
    ).eq("id", str(expense_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    row = result.data[0]
    
    # Check access
    if not validate_store_access(row["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this expense")
    
    store_name = None
    if row.get("shops"):
        store_name = row["shops"].get("name") if isinstance(row["shops"], dict) else None
    
    return ExpenseItem(
        id=row["id"],
        store_id=row["store_id"],
        store_name=store_name,
        settlement_date=row["settlement_date"],
        expense_amount=row["expense_amount"],
        expense_notes=row.get("expense_notes"),
        expense_receipts=row.get("expense_receipts"),
        status=row["status"],
        expense_status=row.get("expense_status", "SUBMITTED"),
        submitted_by=row.get("submitted_by"),
        submitted_at=row.get("submitted_at"),
        approved_by=row.get("approved_by"),
        approved_at=row.get("approved_at")
    )
