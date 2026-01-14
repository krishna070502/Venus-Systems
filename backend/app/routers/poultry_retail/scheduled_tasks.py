"""
Scheduled Tasks Router for PoultryRetail-Core
==============================================
API endpoints for scheduled/cron tasks.
Uses CRON_SECRET + Service Role Key for authentication.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import date, timedelta
import os

from app.config.database import get_supabase

router = APIRouter(prefix="/scheduled-tasks", tags=["Scheduled Tasks"])


def verify_cron_auth(cron_secret: str, authorization: str):
    """
    Verify cron authentication using:
    1. CRON_SECRET header
    2. Service Role Key via Authorization header
    """
    expected_secret = os.getenv("CRON_SECRET")
    service_role_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not expected_secret:
        raise HTTPException(status_code=500, detail="CRON_SECRET not configured")
    
    if cron_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    
    # Verify service role key if provided
    if service_role_key:
        expected_auth = f"Bearer {service_role_key}"
        if authorization != expected_auth:
            raise HTTPException(status_code=401, detail="Invalid service role key")


@router.post("/daily-checks")
async def run_daily_checks(
    check_date: Optional[date] = None,
    x_cron_secret: str = Header(..., description="Secret key for cron authentication"),
    authorization: str = Header(..., description="Bearer token with service role key")
):
    """
    Run daily scheduled checks.
    
    This endpoint is meant to be called by a cron job (GitHub Actions).
    It runs:
    1. check_missed_settlements - Penalize managers who didn't submit settlements
    2. check_repeated_negative_variance - Penalize repeated variance patterns
    
    Expected to run daily around 6:00 AM in the business timezone.
    
    Authentication:
    - X-Cron-Secret: Your CRON_SECRET value
    - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
    """
    verify_cron_auth(x_cron_secret, authorization)
    
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
    authorization: str = Header(..., description="Bearer token with service role key")
):
    """Run only the missed settlements check."""
    verify_cron_auth(x_cron_secret, authorization)
    
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
    authorization: str = Header(..., description="Bearer token with service role key")
):
    """Run only the repeated variance check."""
    verify_cron_auth(x_cron_secret, authorization)
    
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
