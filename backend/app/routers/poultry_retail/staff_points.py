"""
Staff Points Router for PoultryRetail-Core
==========================================
API endpoints for staff performance tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from datetime import date
from uuid import UUID

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.staff_points import (
    StaffPointEntry, StaffPointEntryWithUser, StaffPointSummary,
    StaffPointsCreate, StaffPointsConfig, StaffLeaderboard, StaffLeaderboardResponse,
    StaffPerformanceBreakdown
)

router = APIRouter(prefix="/staff-points", tags=["Staff Points"])


def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


@router.get("/me", response_model=StaffPointSummary)
async def get_my_points(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    current_user: dict = Depends(require_permission(["staffpoints.view"]))
):
    """Get current user's points summary."""
    from app.config.database import get_supabase
    from datetime import datetime
    
    supabase = get_supabase()
    
    user_id = current_user["user_id"]
    today = date.today()
    month_start = today.replace(day=1)
    
    # Get total points
    total_result = supabase.rpc("get_staff_points_balance", {
        "p_user_id": user_id,
        "p_store_id": x_store_id
    }).execute()
    
    # Get this month's points
    month_result = supabase.rpc("get_staff_points_balance", {
        "p_user_id": user_id,
        "p_store_id": x_store_id,
        "p_from_date": month_start.isoformat()
    }).execute()
    
    # Get today's points
    today_result = supabase.rpc("get_staff_points_balance", {
        "p_user_id": user_id,
        "p_store_id": x_store_id,
        "p_from_date": today.isoformat(),
        "p_to_date": today.isoformat()
    }).execute()

    # Get global points and rank
    leaderboard_result = supabase.rpc("get_staff_performance_leaderboard", {
        "p_limit": 1000  # Get all to find rank
    }).execute()
    
    my_rank = None
    my_grade = None
    if leaderboard_result.data:
        for entry in leaderboard_result.data:
            if entry["user_id"] == user_id:
                my_rank = entry["rank"]
                # Get grade from detailed breakdown since leaderboard might not have it yet
                break
    
    # Get grade and breakdown for "me"
    breakdown_res = supabase.rpc("calculate_staff_points", {
        "p_user_id": user_id,
        "p_store_id": x_store_id
    }).execute()
    
    if breakdown_res.data:
        my_grade = breakdown_res.data.get("grade")

    return StaffPointSummary(
        user_id=user_id,
        user_email=current_user.get("email", ""),
        user_name=current_user.get("full_name"),
        total_points=total_result.data or 0,
        points_this_month=month_result.data or 0,
        points_today=today_result.data or 0,
        rank=my_rank,
        grade=my_grade
    )


@router.get("/breakdown", response_model=StaffPerformanceBreakdown)
async def get_performance_breakdown(
    user_id: Optional[UUID] = None,
    x_store_id: Optional[int] = Header(None),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: dict = Depends(require_permission(["staffpoints.view"]))
):
    """Get detailed performance breakdown for a user."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    target_user_id = user_id or current_user["user_id"]
    
    # If viewing someone else, check permissions
    if target_user_id != UUID(current_user["user_id"]):
        # This requires higher permission
        pass # Placeholder for rbac check if needed (require_permission handles base case)

    result = supabase.rpc("calculate_staff_points", {
        "p_user_id": str(target_user_id),
        "p_store_id": x_store_id,
        "p_from_date": from_date.isoformat() if from_date else None,
        "p_to_date": to_date.isoformat() if to_date else None
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Performance data not found")
        
    return result.data


@router.get("/history", response_model=list[StaffPointEntry])
async def get_my_points_history(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["staffpoints.view"]))
):
    """Get current user's points history."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("staff_points").select("*").eq(
        "user_id", current_user["user_id"]
    )
    
    if x_store_id:
        query = query.eq("store_id", x_store_id)
    
    if from_date:
        query = query.gte("effective_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("effective_date", to_date.isoformat())
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return result.data


@router.get("/store", response_model=list[StaffPointEntryWithUser])
async def get_store_points(
    x_store_id: int = Header(..., description="Store ID for context"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: dict = Depends(require_permission(["staffpoints.viewall"]))
):
    """Get all staff points for a store (Manager/Admin)."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    query = supabase.table("staff_points").select(
        "*, profiles!inner(email, full_name)"
    ).eq("store_id", x_store_id)
    
    if from_date:
        query = query.gte("effective_date", from_date.isoformat())
    
    if to_date:
        query = query.lte("effective_date", to_date.isoformat())
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    
    result = query.execute()
    
    # Transform result
    entries = []
    for row in result.data:
        profile = row.pop("profiles", {})
        entries.append(StaffPointEntryWithUser(
            **row,
            user_email=profile.get("email", ""),
            user_name=profile.get("full_name")
        ))
    
    return entries


@router.post("", response_model=StaffPointEntry, status_code=201)
async def create_staff_points(
    points: StaffPointsCreate,
    current_user: dict = Depends(require_permission(["staffpoints.manage"]))
):
    """Manually add/deduct staff points (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Create points entry
    result = supabase.rpc("add_staff_points", {
        "p_user_id": str(points.user_id),
        "p_store_id": points.store_id,
        "p_points": points.points_change,
        "p_reason": points.reason,
        "p_reason_details": points.reason_details,
        "p_effective_date": points.effective_date.isoformat()
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create points entry")
    
    # Get created entry
    entry = supabase.table("staff_points").select("*").eq("id", result.data).execute()
    
    return entry.data[0]


@router.get("/leaderboard", response_model=StaffLeaderboardResponse)
async def get_leaderboard(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    period: str = Query(default="month", pattern="^(week|month|year|all)$"),
    limit: int = Query(default=10, le=50),
    current_user: dict = Depends(require_permission(["staffpoints.viewall"]))
):
    """Get staff leaderboard."""
    from app.config.database import get_supabase
    from datetime import datetime, timedelta
    
    if x_store_id and not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Calculate date range
    today = date.today()
    if period == "week":
        period_start = today - timedelta(days=7)
    elif period == "month":
        period_start = today.replace(day=1)
    elif period == "year":
        period_start = today.replace(month=1, day=1)
    else:
        period_start = None
    
    # Call the new RPC for user-centric leaderboard
    result = supabase.rpc("get_staff_performance_leaderboard", {
        "p_store_id": x_store_id,
        "p_from_date": period_start.isoformat() if period_start else None,
        "p_limit": limit
    }).execute()
    
    # Transform to model
    entries = []
    for row in result.data:
        # Get grade for each leaderboard entry
        grade = "C" # Default
        store_id = None
        store_name = None
        
        try:
            perf = supabase.rpc("calculate_staff_points", {
                "p_user_id": row["user_id"],
                "p_store_id": x_store_id,
                "p_from_date": period_start.isoformat() if period_start else None
            }).execute()
            if perf.data:
                grade = perf.data.get("grade", "C")
        except:
            pass
        
        # Get user's store from their most recent staff_points entry
        try:
            store_result = supabase.table("staff_points").select(
                "store_id, shops(name)"
            ).eq("user_id", row["user_id"]).order("created_at", desc=True).limit(1).execute()
            
            if store_result.data:
                store_id = store_result.data[0].get("store_id")
                shops_data = store_result.data[0].get("shops")
                store_name = shops_data.get("name") if shops_data else None
        except Exception as e:
            print(f"Error getting store for user {row['user_id']}: {e}")
            pass

        entries.append(StaffLeaderboard(
            rank=row["rank"],
            user_id=row["user_id"],
            user_email=row["user_email"],
            user_name=row["user_name"],
            total_points=row["total_points"],
            grade=grade,
            zero_variance_days=0,
            store_id=store_id,
            store_name=store_name
        ))
    
    return StaffLeaderboardResponse(
        period_start=period_start or date(2000, 1, 1),
        period_end=today,
        store_id=x_store_id,
        entries=entries
    )


@router.get("/config", response_model=list[StaffPointsConfig])
async def get_points_config(
    current_user: dict = Depends(require_permission(["staffpoints.view"]))
):
    """Get staff points configuration."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("staff_points_config").select("*").execute()
    
    return result.data


@router.patch("/config/{config_key}", response_model=StaffPointsConfig)
async def update_points_config(
    config_key: str,
    config_value: int,
    current_user: dict = Depends(require_permission(["staffpoints.manage"]))
):
    """Update staff points configuration (Admin only)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("staff_points_config").update({
        "config_value": config_value
    }).eq("config_key", config_key).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Config key not found")
    
    return result.data[0]
