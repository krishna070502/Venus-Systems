"""
Sales Router for PoultryRetail-Core
===================================
API endpoints for POS and bulk sales.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date, datetime, timedelta
from uuid import UUID, uuid4
from decimal import Decimal
from collections import defaultdict

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.sales import (
    SaleCreate, Sale, SaleWithItems, SaleItemWithSKU, SaleSummary,
    SalesAnalyticsResponse, SaleTrendItem, PaymentBreakdownItem, SKURankingItem
)
from app.models.poultry_retail.enums import PaymentMethod, SaleType
from app.routers.poultry_retail.utils import validate_store_access

router = APIRouter(prefix="/sales", tags=["Sales"])




@router.get("/analytics", response_model=SalesAnalyticsResponse)
async def get_sales_analytics(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["salesreport.view"]))
):
    """
    Get comprehensive sales analytics for reports.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Defaults to last 30 days
    end_date = to_date or date.today()
    start_date = from_date or (end_date - timedelta(days=30))
    
    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat() + "T23:59:59"
    
    # Base query for sales
    query = supabase.table("sales").select("*").gte("created_at", start_iso).lte("created_at", end_iso)
    
    if x_store_id:
        if not validate_store_access(x_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
        query = query.eq("store_id", x_store_id)
    
    sales_result = query.execute()
    all_sales = sales_result.data
    
    # 1. KPIs
    total_revenue = sum(Decimal(str(s["total_amount"])) for s in all_sales)
    transaction_count = len(all_sales)
    avg_order_value = total_revenue / transaction_count if transaction_count > 0 else Decimal("0")
    
    kpis = {
        "total_revenue": float(total_revenue),
        "transaction_count": transaction_count,
        "avg_order_value": float(avg_order_value),
        "growth": 0  # Dummy for now
    }
    
    # 2. Trends (Grouped by Date)
    trends_map = defaultdict(lambda: {"revenue": Decimal("0"), "count": 0})
    for s in all_sales:
        # Extract date from timestamp
        dt = datetime.fromisoformat(s["created_at"].replace("Z", "+00:00")).date().isoformat()
        trends_map[dt]["revenue"] += Decimal(str(s["total_amount"]))
        trends_map[dt]["count"] += 1
        
    trends = [
        SaleTrendItem(date=d, revenue=v["revenue"], transactions=v["count"])
        for d, v in sorted(trends_map.items())
    ]
    
    # 3. Payment Breakdown
    payment_map = defaultdict(lambda: {"amount": Decimal("0"), "count": 0})
    for s in all_sales:
        method = s["payment_method"]
        payment_map[method]["amount"] += Decimal(str(s["total_amount"]))
        payment_map[method]["count"] += 1
        
    payments = [
        PaymentBreakdownItem(method=m, amount=v["amount"], count=v["count"])
        for m, v in payment_map.items()
    ]
    
    # 4. Top SKUs
    # This requires reaching into sale_items
    sale_ids = [s["id"] for s in all_sales]
    top_skus = []
    
    if sale_ids:
        # Batch query sale items with SKU names
        # Note: We can't use .in_ directly on many values in a single call easily if there are thousands
        # but for a typical report range it should be fine. Or we query by created_at in sale_items.
        
        # Querying sale_items joined with skus
        items_query = supabase.table("sale_items").select(
            "sku_id, weight, total, skus(name, code)"
        ).in_("sale_id", sale_ids)
        
        items_result = items_query.execute()
        all_items = items_result.data
        
        sku_map = defaultdict(lambda: {"revenue": Decimal("0"), "weight": Decimal("0"), "count": 0, "name": "", "code": ""})
        for item in all_items:
            sku_id = item["sku_id"]
            sku_info = item["skus"]
            sku_map[sku_id]["revenue"] += Decimal(str(item["total"]))
            sku_map[sku_id]["weight"] += Decimal(str(item["weight"]))
            sku_map[sku_id]["count"] += 1
            sku_map[sku_id]["name"] = sku_info["name"]
            sku_map[sku_id]["code"] = sku_info["code"]
            
        top_skus = [
            SKURankingItem(
                sku_id=UUID(sid),
                name=v["name"],
                code=v["code"],
                revenue=v["revenue"],
                weight=v["weight"],
                count=v["count"]
            )
            for sid, v in sorted(sku_map.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
        ]
        
    return SalesAnalyticsResponse(
        kpis=kpis,
        trends=trends,
        payments=payments,
        top_skus=top_skus
    )


@router.post("", response_model=Sale, status_code=201)
async def create_sale(
    sale: SaleCreate,
    current_user: dict = Depends(require_permission(["sales.create"]))
):
    """
    Create a new sale atomically.
    
    Uses the create_sale_atomic PostgreSQL function which:
    1. Locks inventory rows with SELECT FOR UPDATE (prevents race conditions)
    2. Validates stock availability for all items
    3. Creates sale and sale_items records
    4. Triggers handle inventory deduction and financial ledger entries
    5. Generates receipt number
    
    This ensures concurrent sales cannot oversell inventory.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(sale.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check bulk sale permission
    if sale.sale_type == SaleType.BULK:
        # Need additional permission check
        pass  # TODO: Add bulk sale permission validation
    
    supabase = get_supabase()
    
    # Generate idempotency key if not provided
    idempotency_key = sale.idempotency_key or uuid4()
    
    # Prepare items for the atomic function (convert Decimal to float for JSON)
    items_json = [
        {
            "sku_id": str(item.sku_id),
            "weight": float(item.weight),
            "price_snapshot": float(item.price_snapshot)
        }
        for item in sale.items
    ]
    
    try:
        # Call the atomic sale creation function
        # This handles: idempotency check, store validation, stock locking,
        # stock validation, receipt generation, sale creation, and item creation
        # All within a single transaction with row-level locking
        result = supabase.rpc("create_sale_atomic", {
            "p_store_id": sale.store_id,
            "p_cashier_id": str(current_user["user_id"]),
            "p_payment_method": sale.payment_method.value,
            "p_sale_type": sale.sale_type.value,
            "p_items": items_json,
            "p_idempotency_key": str(idempotency_key),
            "p_customer_id": str(sale.customer_id) if sale.customer_id else None,
            "p_customer_name": sale.customer_name,
            "p_customer_phone": sale.customer_phone,
            "p_notes": sale.notes
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create sale")
        
        return result.data
        
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        # Extract the actual error message from the exception
        # Supabase exceptions may contain the error in different formats:
        # 1. As a 'message' attribute
        # 2. As a 'details' attribute  
        # 3. In the string representation
        error_message = ""
        
        # Try to get message from exception attributes (Supabase APIError format)
        if hasattr(e, 'message'):
            error_message = str(e.message)
        elif hasattr(e, 'details'):
            error_message = str(e.details)
        elif hasattr(e, 'args') and e.args:
            # PostgreSQL RAISE EXCEPTION messages come through args
            error_message = str(e.args[0]) if e.args else str(e)
        else:
            error_message = str(e)
        
        # Clean up the error message - extract the actual message from PostgreSQL format
        # PostgreSQL errors often look like: '{"code":"P0001","details":null,"hint":null,"message":"..."}'
        if '"message":' in error_message or '"message"' in error_message:
            import json
            try:
                # Try to parse as JSON
                error_data = json.loads(error_message) if error_message.startswith('{') else None
                if error_data and 'message' in error_data:
                    error_message = error_data['message']
            except (json.JSONDecodeError, TypeError):
                # If JSON parsing fails, try regex extraction
                import re
                match = re.search(r'"message"\s*:\s*"([^"]+)"', error_message)
                if match:
                    error_message = match.group(1)
        
        # Map PostgreSQL error messages to appropriate HTTP responses
        error_lower = error_message.lower()
        
        if "maintenance mode" in error_lower:
            raise HTTPException(status_code=400, detail="Store is in maintenance mode")
        elif "sku" in error_lower and "not found" in error_lower:
            raise HTTPException(status_code=404, detail=error_message)
        elif "store" in error_lower and "not found" in error_lower:
            raise HTTPException(status_code=404, detail=error_message)
        elif "insufficient stock" in error_lower:
            # Extract the helpful stock info from the message
            raise HTTPException(status_code=400, detail=error_message)
        elif "not found" in error_lower:
            raise HTTPException(status_code=404, detail=error_message)
        else:
            # Log the full exception for debugging
            import logging
            logging.error(f"Unexpected error in create_sale: {error_message}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Failed to create sale: {error_message}")


@router.get("", response_model=list[SaleWithItems])
async def list_sales(
    x_store_id: int = Header(..., description="Store ID for context"),
    payment_method: Optional[PaymentMethod] = None,
    sale_type: Optional[SaleType] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """List sales for a store with optional filters."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("sales").select("*, items:sale_items(*, skus(name, code, unit))").eq("store_id", x_store_id)
    
    if payment_method:
        query = query.eq("payment_method", payment_method.value)
    
    if sale_type:
        query = query.eq("sale_type", sale_type.value)
    
    if from_date:
        query = query.gte("created_at", from_date.isoformat())
    
    if to_date:
        query = query.lte("created_at", (to_date.isoformat() + "T23:59:59"))
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    sales_with_items = []
    for sale_data in result.data:
        items_data = sale_data.pop("items", [])
        items = []
        for item in items_data:
            sku_info = item.pop("skus", {})
            items.append(SaleItemWithSKU(
                **item,
                sku_name=sku_info.get("name", ""),
                sku_code=sku_info.get("code", ""),
                unit=sku_info.get("unit", "kg")
            ))
        sales_with_items.append(SaleWithItems(**sale_data, items=items))
    
    return sales_with_items


@router.get("/{sale_id}", response_model=SaleWithItems)
async def get_sale(
    sale_id: UUID,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """Get sale with all items."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get sale
    sale_result = supabase.table("sales").select("*").eq("id", str(sale_id)).execute()
    
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    sale = sale_result.data[0]
    
    # Check store access
    if not validate_store_access(sale["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Get sale items with SKU details
    items_result = supabase.table("sale_items").select(
        "*, skus!inner(name, code, unit)"
    ).eq("sale_id", str(sale_id)).execute()
    
    items = []
    for item in items_result.data:
        sku_data = item.pop("skus", {})
        items.append(SaleItemWithSKU(
            **item,
            sku_name=sku_data.get("name", ""),
            sku_code=sku_data.get("code", ""),
            unit=sku_data.get("unit", "kg")
        ))
    
    return SaleWithItems(**sale, items=items)


@router.get("/summary/daily", response_model=SaleSummary)
async def get_daily_summary(
    x_store_id: int = Header(..., description="Store ID for context"),
    summary_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """Get daily sales summary for a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    target_date = summary_date or date.today()
    
    # Get sales for the day
    result = supabase.table("sales").select(
        "total_amount, payment_method"
    ).eq("store_id", x_store_id).gte(
        "created_at", target_date.isoformat()
    ).lt(
        "created_at", (target_date.isoformat() + "T23:59:59")
    ).execute()
    
    total_sales = Decimal("0")
    total_cash = Decimal("0")
    total_upi = Decimal("0")
    total_card = Decimal("0")
    total_bank = Decimal("0")
    
    for sale in result.data:
        amount = Decimal(str(sale["total_amount"]))
        total_sales += amount
        
        if sale["payment_method"] == "CASH":
            total_cash += amount
        elif sale["payment_method"] == "UPI":
            total_upi += amount
        elif sale["payment_method"] == "CARD":
            total_card += amount
        elif sale["payment_method"] == "BANK":
            total_bank += amount
    
    return SaleSummary(
        store_id=x_store_id,
        date=datetime.combine(target_date, datetime.min.time()),
        total_sales=total_sales,
        total_cash=total_cash,
        total_upi=total_upi,
        total_card=total_card,
        total_bank=total_bank,
        sale_count=len(result.data)
    )


@router.get("/summary/global")
async def get_global_summary(
    summary_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["sales.view"]))
):
    """
    Get global sales summary across ALL stores for today.
    Intended for admin dashboard widgets.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    target_date = summary_date or date.today()
    
    # Get sales for the day across ALL stores
    result = supabase.table("sales").select(
        "total_amount, payment_method"
    ).gte(
        "created_at", target_date.isoformat()
    ).lt(
        "created_at", (target_date.isoformat() + "T23:59:59")
    ).execute()
    
    total_sales = Decimal("0")
    total_cash = Decimal("0")
    total_upi = Decimal("0")
    total_card = Decimal("0")
    total_bank = Decimal("0")
    
    for sale in result.data:
        amount = Decimal(str(sale["total_amount"]))
        total_sales += amount
        
        if sale["payment_method"] == "CASH":
            total_cash += amount
        elif sale["payment_method"] == "UPI":
            total_upi += amount
        elif sale["payment_method"] == "CARD":
            total_card += amount
        elif sale["payment_method"] == "BANK":
            total_bank += amount
    
    return {
        "date": target_date.isoformat(),
        "total_sales": float(total_sales),
        "total_cash": float(total_cash),
        "total_upi": float(total_upi),
        "total_card": float(total_card),
        "total_bank": float(total_bank),
        "sale_count": len(result.data)
    }

