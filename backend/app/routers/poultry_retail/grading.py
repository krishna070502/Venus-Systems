"""
Staff Grading Router for PoultryRetail-Core
============================================
API endpoints for staff grading, performance snapshots, and incentive management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional, List
from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel
from enum import Enum

from app.dependencies.rbac import require_permission


class StaffGrade(str, Enum):
    A_PLUS = "A_PLUS"
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"


class GradingConfigUpdate(BaseModel):
    config_value: Decimal
    store_id: Optional[int] = None  # None = global


class MonthlyPerformance(BaseModel):
    id: UUID
    user_id: UUID
    store_id: int
    year: int
    month: int
    total_points: int
    total_weight_handled: Decimal
    normalized_score: Decimal
    positive_variance_kg: Decimal
    negative_variance_kg: Decimal
    zero_variance_days: int
    grade: StaffGrade
    bonus_amount: Decimal
    penalty_amount: Decimal
    net_incentive: Decimal
    is_locked: bool

    class Config:
        from_attributes = True


class PerformanceWithUser(MonthlyPerformance):
    user_email: str
    user_name: Optional[str] = None


class GradeThresholds(BaseModel):
    A_PLUS_min: Decimal
    A_min: Decimal
    B_min: Decimal
    C_min: Decimal
    D_min: Decimal


class BonusRates(BaseModel):
    A_PLUS: Decimal
    A: Decimal
    B: Decimal
    C: Decimal
    D: Decimal
    E: Decimal


class PenaltyRates(BaseModel):
    C: Decimal
    D: Decimal
    E: Decimal


class GradingConfig(BaseModel):
    thresholds: GradeThresholds
    bonus_rates: BonusRates
    penalty_rates: PenaltyRates
    bonus_cap: Decimal
    penalty_cap: Decimal


router = APIRouter(prefix="/grading", tags=["Staff Grading"])


def validate_store_access(store_id: int, user: dict) -> bool:
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


# =============================================================================
# CONFIGURATION ENDPOINTS
# =============================================================================

@router.get("/config", response_model=GradingConfig)
async def get_grading_config(
    store_id: Optional[int] = Query(None, description="Store ID for store-specific config"),
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get all grading configuration (thresholds, bonus rates, penalty rates)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    def get_config(key: str) -> Decimal:
        result = supabase.rpc("get_grading_config", {
            "p_key": key,
            "p_store_id": store_id
        }).execute()
        return Decimal(str(result.data)) if result.data else Decimal("0")
    
    return GradingConfig(
        thresholds=GradeThresholds(
            A_PLUS_min=get_config("GRADE_A_PLUS_MIN"),
            A_min=get_config("GRADE_A_MIN"),
            B_min=get_config("GRADE_B_MIN"),
            C_min=get_config("GRADE_C_MIN"),
            D_min=get_config("GRADE_D_MIN")
        ),
        bonus_rates=BonusRates(
            A_PLUS=get_config("BONUS_RATE_A_PLUS"),
            A=get_config("BONUS_RATE_A"),
            B=get_config("BONUS_RATE_B"),
            C=get_config("BONUS_RATE_C"),
            D=get_config("BONUS_RATE_D"),
            E=get_config("BONUS_RATE_E")
        ),
        penalty_rates=PenaltyRates(
            C=get_config("PENALTY_RATE_C"),
            D=get_config("PENALTY_RATE_D"),
            E=get_config("PENALTY_RATE_E")
        ),
        bonus_cap=get_config("BONUS_CAP_MONTHLY"),
        penalty_cap=get_config("PENALTY_CAP_MONTHLY")
    )


@router.patch("/config/{config_key}")
async def update_grading_config(
    config_key: str,
    update: GradingConfigUpdate,
    current_user: dict = Depends(require_permission(["staffgrading.config"]))
):
    """Update a grading configuration value."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check if store-specific or global
    if update.store_id:
        # Create store-specific config
        result = supabase.table("staff_grading_config").upsert({
            "config_key": config_key,
            "config_value": str(update.config_value),
            "config_type": _get_config_type(config_key),
            "store_id": update.store_id
        }, on_conflict="config_key,store_id").execute()
    else:
        # Update global config
        result = supabase.table("staff_grading_config").update({
            "config_value": str(update.config_value)
        }).eq("config_key", config_key).is_("store_id", None).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Config key not found")
    
    return {"message": f"Updated {config_key} to {update.config_value}"}


def _get_config_type(key: str) -> str:
    if key.startswith("GRADE_"):
        return "GRADE_THRESHOLD"
    elif key.startswith("BONUS_"):
        return "BONUS_RATE"
    elif key.startswith("PENALTY_"):
        return "PENALTY_RATE"
    return "SYSTEM"


@router.get("/reason-codes")
async def get_reason_codes(
    category: Optional[str] = Query(None),
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get all point reason codes."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    query = supabase.table("staff_points_reason_codes").select("*")
    
    if category:
        query = query.eq("category", category)
    
    result = query.order("category").execute()
    
    return result.data


@router.patch("/reason-codes/{code}")
async def update_reason_code(
    code: str,
    points_value: int,
    current_user: dict = Depends(require_permission(["staffgrading.config"]))
):
    """Update points value for a reason code."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Check if configurable
    existing = supabase.table("staff_points_reason_codes").select(
        "is_configurable"
    ).eq("code", code).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reason code not found")
    
    if not existing.data[0]["is_configurable"]:
        raise HTTPException(status_code=400, detail="This reason code is not configurable")
    
    result = supabase.table("staff_points_reason_codes").update({
        "points_value": points_value
    }).eq("code", code).execute()
    
    return {"message": f"Updated {code} to {points_value} points"}


# =============================================================================
# MONTHLY PERFORMANCE ENDPOINTS
# =============================================================================

@router.post("/performance/generate")
async def generate_monthly_performance(
    store_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(require_permission(["staffgrading.generate"]))
):
    """Generate monthly performance snapshots for all staff in a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    result = supabase.rpc("generate_monthly_performance", {
        "p_store_id": store_id,
        "p_year": year,
        "p_month": month
    }).execute()
    
    return {
        "message": f"Generated performance snapshots",
        "records_processed": result.data,
        "period": f"{year}-{month:02d}"
    }


@router.get("/performance", response_model=List[PerformanceWithUser])
async def get_monthly_performance(
    x_store_id: int = Header(..., description="Store ID"),
    year: int = Query(...),
    month: int = Query(...),
    grade: Optional[StaffGrade] = None,
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get monthly performance for all staff in a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    # Query performance data
    query = supabase.table("staff_monthly_performance").select(
        "*"
    ).eq("store_id", x_store_id).eq("year", year).eq("month", month)
    
    if grade:
        query = query.eq("grade", grade.value)
    
    result = query.order("normalized_score", desc=True).execute()
    
    # Get user info for each performance record
    performances = []
    for row in result.data:
        # Fetch profile info separately
        profile_result = supabase.table("profiles").select(
            "email, full_name"
        ).eq("id", row["user_id"]).execute()
        
        profile = profile_result.data[0] if profile_result.data else {}
        
        performances.append(PerformanceWithUser(
            **row,
            user_email=profile.get("email", ""),
            user_name=profile.get("full_name")
        ))
    
    return performances


@router.get("/performance/me", response_model=List[MonthlyPerformance])
async def get_my_performance(
    year: Optional[int] = None,
    current_user: dict = Depends(require_permission(["staffpoints.view"]))
):
    """Get my own monthly performance history."""
    from app.config.database import get_supabase
    from datetime import datetime
    
    supabase = get_supabase()
    
    query = supabase.table("staff_monthly_performance").select("*").eq(
        "user_id", current_user["user_id"]
    )
    
    if year:
        query = query.eq("year", year)
    
    result = query.order("year", desc=True).order("month", desc=True).execute()
    
    return result.data


@router.post("/performance/lock")
async def lock_monthly_performance(
    store_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(require_permission(["staffgrading.lock"]))
):
    """Lock monthly performance records (makes them immutable)."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.rpc("lock_monthly_performance", {
        "p_store_id": store_id,
        "p_year": year,
        "p_month": month
    }).execute()
    
    return {
        "message": "Monthly performance locked",
        "records_locked": result.data,
        "period": f"{year}-{month:02d}"
    }


# =============================================================================
# GRADE SUMMARY ENDPOINTS
# =============================================================================

@router.get("/summary/store")
async def get_store_grade_summary(
    x_store_id: int = Header(...),
    year: int = Query(...),
    month: int = Query(...),
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get grade distribution summary for a store."""
    from app.config.database import get_supabase
    
    if not validate_store_access(x_store_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this store")
    
    supabase = get_supabase()
    
    result = supabase.table("staff_monthly_performance").select(
        "grade, bonus_amount, penalty_amount"
    ).eq("store_id", x_store_id).eq("year", year).eq("month", month).execute()
    
    # Aggregate by grade
    grade_counts = {"A_PLUS": 0, "A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    total_bonus = Decimal("0")
    total_penalty = Decimal("0")
    
    for row in result.data:
        grade_counts[row["grade"]] += 1
        total_bonus += Decimal(str(row["bonus_amount"]))
        total_penalty += Decimal(str(row["penalty_amount"]))
    
    return {
        "store_id": x_store_id,
        "period": f"{year}-{month:02d}",
        "total_staff": len(result.data),
        "grade_distribution": grade_counts,
        "total_bonus": float(total_bonus),
        "total_penalty": float(total_penalty),
        "net_cost": float(total_bonus - total_penalty)
    }


@router.get("/summary/user/{user_id}")
async def get_user_grade_history(
    user_id: UUID,
    limit: int = Query(default=12, le=24),
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get grade history for a specific user."""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    result = supabase.table("staff_monthly_performance").select(
        "year, month, store_id, grade, normalized_score, total_points, "
        "total_weight_handled, bonus_amount, penalty_amount"
    ).eq("user_id", str(user_id)).order(
        "year", desc=True
    ).order("month", desc=True).limit(limit).execute()
    
    return {
        "user_id": str(user_id),
        "history": result.data
    }


# =============================================================================
# FRAUD DETECTION ENDPOINTS
# =============================================================================

@router.get("/fraud-flags")
async def get_fraud_flags(
    x_store_id: Optional[int] = Header(None),
    current_user: dict = Depends(require_permission(["staffgrading.view"]))
):
    """Get users with fraud flags or at-risk grades."""
    from app.config.database import get_supabase
    from datetime import datetime
    
    supabase = get_supabase()
    
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    query = supabase.table("staff_monthly_performance").select(
        "*"
    ).eq("year", current_year).eq("month", current_month)
    
    if x_store_id:
        if not validate_store_access(x_store_id, current_user):
            raise HTTPException(status_code=403, detail="Access denied")
        query = query.eq("store_id", x_store_id)
    
    # Get E grades or fraud flagged
    query = query.or_("grade.eq.E,grade.eq.D,has_fraud_flag.eq.true")
    
    result = query.execute()
    
    at_risk = []
    for row in result.data:
        # Fetch profile info separately
        profile_result = supabase.table("profiles").select(
            "email, full_name"
        ).eq("id", row["user_id"]).execute()
        
        profile = profile_result.data[0] if profile_result.data else {}
        
        at_risk.append({
            **row,
            "user_email": profile.get("email"),
            "user_name": profile.get("full_name"),
            "risk_level": "HIGH" if row["grade"] == "E" or row.get("has_fraud_flag") else "MEDIUM"
        })
    
    return {
        "period": f"{current_year}-{current_month:02d}",
        "at_risk_count": len(at_risk),
        "users": at_risk
    }
