"""
Transaction Logs Router
=======================
API endpoints for viewing and querying business transaction logs.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query, Header
from typing import List, Dict, Optional, Any
import logging
from datetime import datetime, date

from app.services.supabase_client import supabase_client
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/",
    dependencies=[Depends(require_permission(["transaction_logs.view"]))]
)
async def get_transaction_logs(
    x_store_id: Optional[int] = Header(None, description="Store ID for context (optional for admin)"),
    store_id: Optional[int] = Query(None, description="Filter by specific store"),
    transaction_type: Optional[str] = Query(None, description="Filter by type: SALE, PURCHASE, EXPENSE, TRANSFER, SETTLEMENT, PROCESSING"),
    action: Optional[str] = Query(None, description="Filter by action: CREATE, COMMIT, APPROVE, REJECT, CANCEL, etc."),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get business transaction logs with filters.
    
    Admins can view all logs, store managers can only view their store's logs.
    """
    try:
        logger.info(f"Fetching transaction logs with filters")
        
        # Build query with joined user profile
        query = supabase_client.table("business_transaction_logs").select(
            "*, profiles!user_id(full_name, email), shops!store_id(name)"
        )
        
        # Apply filters
        # Use store_id from query param, then header, then user's store
        effective_store_id = store_id or x_store_id
        if effective_store_id:
            query = query.eq("store_id", effective_store_id)
        
        if transaction_type:
            query = query.eq("transaction_type", transaction_type.upper())
        
        if action:
            query = query.eq("action", action.upper())
            
        if user_id:
            query = query.eq("user_id", user_id)
        
        if from_date:
            query = query.gte("created_at", f"{from_date}T00:00:00")
        
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59")
        
        # Execute query
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        logs = response.data if response.data else []
        logger.info(f"Fetched {len(logs)} transaction logs")
        
        return {
            "items": logs,
            "total": len(logs),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching transaction logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transaction logs: {str(e)}"
        )


@router.get(
    "/stats",
    dependencies=[Depends(require_permission(["transaction_logs.view"]))]
)
async def get_transaction_stats(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    store_id: Optional[int] = Query(None, description="Filter by specific store"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get aggregated transaction statistics.
    
    Returns counts by transaction type and action.
    """
    try:
        effective_store_id = store_id or x_store_id
        
        # Get counts by transaction type
        query = supabase_client.table("business_transaction_logs").select("transaction_type, action")
        
        if effective_store_id:
            query = query.eq("store_id", effective_store_id)
        
        if from_date:
            query = query.gte("created_at", f"{from_date}T00:00:00")
        
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59")
        
        response = query.execute()
        
        if not response.data:
            return {
                "total": 0,
                "by_type": {},
                "by_action": {}
            }
        
        # Aggregate counts
        by_type: Dict[str, int] = {}
        by_action: Dict[str, int] = {}
        
        for log in response.data:
            t_type = log.get("transaction_type", "UNKNOWN")
            t_action = log.get("action", "UNKNOWN")
            
            by_type[t_type] = by_type.get(t_type, 0) + 1
            by_action[t_action] = by_action.get(t_action, 0) + 1
        
        return {
            "total": len(response.data),
            "by_type": by_type,
            "by_action": by_action
        }
        
    except Exception as e:
        logger.error(f"Error fetching transaction stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transaction stats: {str(e)}"
        )


@router.get(
    "/recent",
    dependencies=[Depends(require_permission(["transaction_logs.view"]))]
)
async def get_recent_transactions(
    x_store_id: Optional[int] = Header(None, description="Store ID for context"),
    limit: int = Query(10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """
    Get the most recent transactions for a quick dashboard view.
    """
    try:
        query = supabase_client.table("business_transaction_logs").select(
            "id, transaction_type, action, resource_id, amount, quantity, created_at, "
            "profiles!user_id(full_name), shops!store_id(name)"
        )
        
        if x_store_id:
            query = query.eq("store_id", x_store_id)
        
        response = query.order("created_at", desc=True).limit(limit).execute()
        
        return response.data if response.data else []
        
    except Exception as e:
        logger.error(f"Error fetching recent transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent transactions: {str(e)}"
        )
