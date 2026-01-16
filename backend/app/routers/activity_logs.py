"""
Activity Logs Router
====================
API endpoints for viewing and auditing system activity logs.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional
import logging
from datetime import datetime, date

from app.services.supabase_client import supabase_client
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/",
    dependencies=[Depends(require_permission(["system.logs"]))]
)
async def get_activity_logs(
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    log_status: Optional[str] = Query(None, alias="status"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(50, le=200),
    offset: int = 0
):
    """
    Get activity logs with joined user profiles.
    """
    try:
        logger.info("Fetching activity logs with profile info")
        # Restore the join
        query = supabase_client.table("app_activity_logs").select("*, profiles!user_id(full_name, email)")
        
        if user_id:
            query = query.eq("user_id", user_id)
        if event_type:
            query = query.eq("event_type", event_type)
        if log_status:
            query = query.eq("status", log_status)
            
        response = query.order("timestamp", desc=True).limit(limit).execute()
        
        logs = response.data if response.data else []
        logger.info(f"Fetched {len(logs)} activity logs with profile data")
        return logs
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch activity logs: {str(e)}"
        )

@router.get(
    "/stats",
    dependencies=[Depends(require_permission(["system.logs"]))]
)
async def get_activity_stats():
    """Get aggregated activity statistics for the dashboard."""
    try:
        # Get count by event type
        # In a real app, this might be a more complex RPC or separate service call
        response = supabase_client.table("app_activity_logs").select("event_type", count="exact").execute()
        
        # This is a simplified stats response
        return {
            "total_logs": response.count if hasattr(response, 'count') else len(response.data),
            "summary": response.data
        }
    except Exception as e:
        logger.error(f"Error fetching activity stats: {e}")
        return {"error": str(e)}
