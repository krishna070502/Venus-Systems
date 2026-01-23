from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date, timedelta, datetime
from uuid import UUID
from decimal import Decimal
from collections import defaultdict

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.purchases import (
    PurchaseCreate, PurchaseCommit, Purchase, PurchaseWithSupplier,
    PurchaseAnalyticsResponse, PurchaseTrendItem, SupplierSpendItem, BirdTypeSpendItem
)
from app.models.poultry_retail.enums import PurchaseStatus, BirdType
from app.routers.poultry_retail.utils import validate_store_access

router = APIRouter(prefix="/purchases", tags=["Purchases"])


@router.get("/analytics", response_model=PurchaseAnalyticsResponse)
async def get_purchase_analytics(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["purchasereport.view"]))
):
    """
    Get comprehensive purchase and procurement analytics.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Defaults to last 30 days
    end_date = to_date or date.today()
    start_date = from_date or (end_date - timedelta(days=30))
    
    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat()
    
    # Base query for purchases (only COMMITTED ones for analytics)
    query = supabase.table("purchases").select(
        "*, suppliers(name)"
    ).eq("status", "COMMITTED").gte("created_at", start_iso).lte("created_at", end_iso)
    
    if x_store_id:
        if not validate_store_access(x_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied to this store")
        query = query.eq("store_id", x_store_id)
    
    result = query.execute()
    all_purchases = result.data
    
    # 1. KPIs
    total_spend = sum(Decimal(str(p["total_amount"])) for p in all_purchases)
    total_weight = sum(Decimal(str(p["total_weight"])) for p in all_purchases)
    total_birds = sum(int(p["bird_count"]) for p in all_purchases)
    avg_price = (total_spend / total_weight) if total_weight > 0 else Decimal("0")
    
    kpis = {
        "total_spend": float(total_spend),
        "total_weight": float(total_weight),
        "total_bird_count": total_birds,
        "avg_price_per_kg": float(avg_price),
        "purchase_count": len(all_purchases)
    }
    
    # 2. Trends (Grouped by Date)
    trends_map = defaultdict(lambda: {"spend": Decimal("0"), "weight": Decimal("0"), "birds": 0})
    for p in all_purchases:
        dt = p["created_at"][:10]  # Extract date YYYY-MM-DD
        trends_map[dt]["spend"] += Decimal(str(p["total_amount"]))
        trends_map[dt]["weight"] += Decimal(str(p["total_weight"]))
        trends_map[dt]["birds"] += int(p["bird_count"])
        
    trends = []
    for d, v in sorted(trends_map.items()):
        trends.append(PurchaseTrendItem(
            date=d,
            spend=v["spend"],
            weight=v["weight"],
            bird_count=v["birds"]
        ))
    
    # 3. Supplier Breakdown
    supplier_map = defaultdict(lambda: {"spend": Decimal("0"), "weight": Decimal("0"), "count": 0, "name": "Unknown"})
    for p in all_purchases:
        sid = p["supplier_id"]
        sname = p.get("suppliers", {}).get("name", "Unknown") if p.get("suppliers") else "Unknown"
        supplier_map[sid]["spend"] += Decimal(str(p["total_amount"]))
        supplier_map[sid]["weight"] += Decimal(str(p["total_weight"]))
        supplier_map[sid]["count"] += 1
        supplier_map[sid]["name"] = sname
        
    suppliers_list = []
    for sid, v in supplier_map.items():
        suppliers_list.append(SupplierSpendItem(
            supplier_name=v["name"],
            amount=v["spend"],
            weight=v["weight"],
            count=v["count"]
        ))
    
    # 4. Bird Type Distribution
    bird_map = defaultdict(lambda: {"spend": Decimal("0"), "weight": Decimal("0")})
    for p in all_purchases:
        bt = p["bird_type"]
        bird_map[bt]["spend"] += Decimal(str(p["total_amount"]))
        bird_map[bt]["weight"] += Decimal(str(p["total_weight"]))
        
    bird_types_list = []
    for bt, v in bird_map.items():
        bird_types_list.append(BirdTypeSpendItem(
            bird_type=bt,
            amount=v["spend"],
            weight=v["weight"]
        ))
        
    return PurchaseAnalyticsResponse(
        kpis=kpis,
        trends=trends,
        suppliers=suppliers_list,
        bird_types=bird_types_list
    )




@router.get("", response_model=list[PurchaseWithSupplier])
async def list_purchases(
    x_store_id: int = Header(..., description="Store ID for context"),
    status: Optional[PurchaseStatus] = None,
    bird_type: Optional[BirdType] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["purchases.view"]))
):
    """
    List purchases for a store with optional filters.
    
    Requires X-Store-ID header.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Join with suppliers to get supplier name
    query = supabase.table("purchases").select(
        "*, suppliers!inner(name, phone)"
    ).eq("store_id", x_store_id)
    
    if status:
        query = query.eq("status", status.value)
    
    if bird_type:
        query = query.eq("bird_type", bird_type.value)
    
    if from_date:
        query = query.gte("created_at", from_date.isoformat())
    
    if to_date:
        query = query.lte("created_at", to_date.isoformat())
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform result to include supplier name
    purchases = []
    for row in result.data:
        supplier_data = row.pop("suppliers", {})
        row["supplier_name"] = supplier_data.get("name", "Unknown")
        row["supplier_contact"] = supplier_data.get("phone")
        purchases.append(row)
    
    return purchases



@router.get("/{purchase_id}", response_model=PurchaseWithSupplier)
async def get_purchase(
    purchase_id: UUID,
    current_user: dict = Depends(require_permission(["purchases.view"]))
):
    """Get purchase by ID."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("purchases").select(
        "*, suppliers!inner(name, contact_name)"
    ).eq("id", str(purchase_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    row = result.data[0]
    
    # Check store access
    if not validate_store_access(row["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supplier_data = row.pop("suppliers", {})
    row["supplier_name"] = supplier_data.get("name", "Unknown")
    row["supplier_contact"] = supplier_data.get("contact_name")
    
    return row


@router.post("", response_model=Purchase, status_code=201)
async def create_purchase(
    purchase: PurchaseCreate,
    current_user: dict = Depends(require_permission(["purchases.create"]))
):
    """
    Create a new purchase order (DRAFT status).
    
    The purchase must be committed to add to inventory.
    """
    from app.config.database import get_supabase
    
    if not validate_store_access(purchase.store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Check store is active
    store_check = supabase.rpc("check_store_active", {"p_store_id": purchase.store_id}).execute()
    if not store_check.data:
        raise HTTPException(status_code=400, detail="Store is in maintenance mode")
    
    # Verify supplier exists and is active
    supplier_check = supabase.table("suppliers").select("id, status").eq(
        "id", str(purchase.supplier_id)
    ).execute()
    
    if not supplier_check.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    if supplier_check.data[0]["status"] != "ACTIVE":
        raise HTTPException(status_code=400, detail="Supplier is inactive")
    
    data = purchase.model_dump()
    data["supplier_id"] = str(data["supplier_id"])
    data["total_weight"] = str(data["total_weight"])
    data["price_per_kg"] = str(data["price_per_kg"])
    data["created_by"] = current_user["user_id"]
    data["bird_type"] = data["bird_type"].value if hasattr(data["bird_type"], "value") else data["bird_type"]
    
    result = supabase.table("purchases").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create purchase")
    
    return result.data[0]


@router.post("/{purchase_id}/commit", response_model=Purchase)
async def commit_purchase(
    purchase_id: UUID,
    commit_data: PurchaseCommit,
    current_user: dict = Depends(require_permission(["purchases.commit"]))
):
    """
    Commit a purchase to inventory.
    
    This action:
    1. Changes status to COMMITTED
    2. Triggers inventory ledger credit for LIVE birds
    3. Cannot be undone
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get current purchase
    existing = supabase.table("purchases").select("*").eq("id", str(purchase_id)).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    purchase = existing.data[0]
    
    # Validate store access
    if not validate_store_access(purchase["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check status
    if purchase["status"] != "DRAFT":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot commit purchase with status {purchase['status']}"
        )
    
    # Check store is active
    store_check = supabase.rpc("check_store_active", {"p_store_id": purchase["store_id"]}).execute()
    if not store_check.data:
        raise HTTPException(status_code=400, detail="Store is in maintenance mode")
    
    # Update status to COMMITTED (trigger will create ledger entry)
    update_data = {
        "status": "COMMITTED",
        "committed_by": current_user["user_id"]
    }
    
    if commit_data.notes:
        update_data["notes"] = (purchase.get("notes", "") or "") + "\n" + commit_data.notes
    
    result = supabase.table("purchases").update(update_data).eq("id", str(purchase_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to commit purchase")
    
    return result.data[0]


@router.post("/{purchase_id}/cancel", response_model=Purchase)
async def cancel_purchase(
    purchase_id: UUID,
    current_user: dict = Depends(require_permission(["purchases.cancel"]))
):
    """
    Cancel a draft purchase.
    
    Only DRAFT purchases can be cancelled.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Get current purchase
    existing = supabase.table("purchases").select("*").eq("id", str(purchase_id)).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    purchase = existing.data[0]
    
    # Validate store access
    if not validate_store_access(purchase["store_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    # Check status
    if purchase["status"] != "DRAFT":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel purchase with status {purchase['status']}"
        )
    
    # Update status to CANCELLED
    result = supabase.table("purchases").update(
        {"status": "CANCELLED"}
    ).eq("id", str(purchase_id)).execute()
    
    return result.data[0]
