"""
Scheduled Tasks Router for PoultryRetail-Core
==============================================
API endpoints for scheduled/cron tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from datetime import date, timedelta

from app.dependencies.rbac import require_permission

router = APIRouter(prefix="/scheduled-tasks", tags=["Scheduled Tasks"])


@router.post("/daily-checks")
async def run_daily_checks(
    check_date: Optional[date] = None,
    x_cron_secret: str = Header(..., description="Secret key for cron authentication"),
    current_user: dict = Depends(require_permission(["admin"]))
):
    """
    Run daily scheduled checks.
    
    This endpoint is meant to be called by a cron job (GitHub Actions).
    It runs:
    1. check_missed_settlements - Penalize managers who didn't submit settlements
    2. check_repeated_negative_variance - Penalize repeated variance patterns
    
    Expected to run daily around 6:00 AM in the business timezone.
    """
    import os
    from app.config.database import get_supabase
    
    # Verify cron secret
    expected_secret = os.getenv("CRON_SECRET", "your-cron-secret-key")
    if x_cron_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    
    supabase = get_supabase()
    
    # Default to yesterday if no date provided
    target_date = check_date or (date.today() - timedelta(days=1))
    
    results = {
        "check_date": target_date.isoformat(),
        "missed_settlements": [],
        "repeated_variance": []
    }
    
    # 1. Check missed settlements
    try:
        missed_result = supabase.rpc("check_missed_settlements", {
            "p_check_date": target_date.isoformat()
        }).execute()
        
        results["missed_settlements"] = missed_result.data or []
    except Exception as e:
        results["missed_settlements_error"] = str(e)
    
    # 2. Check repeated negative variance
    try:
        variance_result = supabase.rpc("check_repeated_negative_variance", {
            "p_check_date": target_date.isoformat()
        }).execute()
        
        results["repeated_variance"] = variance_result.data or []
    except Exception as e:
        results["repeated_variance_error"] = str(e)
    
    return {
        "status": "completed",
        "results": results
    }


@router.post("/check-missed-settlements")
async def run_missed_settlements_check(
    check_date: Optional[date] = None,
    x_cron_secret: str = Header(..., description="Secret key for cron authentication"),
    current_user: dict = Depends(require_permission(["admin"]))
):
    """Run only the missed settlements check."""
    import os
    from app.config.database import get_supabase
    
    expected_secret = os.getenv("CRON_SECRET", "your-cron-secret-key")
    if x_cron_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    
    supabase = get_supabase()
    target_date = check_date or (date.today() - timedelta(days=1))
    
    result = supabase.rpc("check_missed_settlements", {
        "p_check_date": target_date.isoformat()
    }).execute()
    
    return {
        "status": "completed",
        "check_date": target_date.isoformat(),
        "penalties_applied": result.data or []
    }


@router.post("/check-repeated-variance")
async def run_repeated_variance_check(
    check_date: Optional[date] = None,
    x_cron_secret: str = Header(..., description="Secret key for cron authentication"),
    current_user: dict = Depends(require_permission(["admin"]))
):
    """Run only the repeated variance check."""
    import os
    from app.config.database import get_supabase
    
    expected_secret = os.getenv("CRON_SECRET", "your-cron-secret-key")
    if x_cron_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    
    supabase = get_supabase()
    target_date = check_date or date.today()
    
    result = supabase.rpc("check_repeated_negative_variance", {
        "p_check_date": target_date.isoformat()
    }).execute()
    
    return {
        "status": "completed",
        "check_date": target_date.isoformat(),
        "penalties_applied": result.data or []
    }
