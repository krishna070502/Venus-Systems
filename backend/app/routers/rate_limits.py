"""
Rate Limits Router
==================
API endpoints for managing rate limit configurations.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging

from app.services.supabase_client import supabase_client
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission
from app.services.role_service import RoleService
from app.utils.field_filter import filter_fields, filter_fields_list
from app.middleware.rate_limiter import rate_limit_config_cache

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class RateLimitConfigBase(BaseModel):
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    enabled: bool = True


class RateLimitConfigCreate(RateLimitConfigBase):
    role_id: int


class RateLimitConfigUpdate(BaseModel):
    requests_per_minute: Optional[int] = None
    requests_per_hour: Optional[int] = None
    enabled: Optional[bool] = None


# Field-level permission configuration
RATE_LIMIT_FIELD_CONFIG = {
    "role_name": "ratelimits.field.role",
    "requests_per_minute": "ratelimits.field.rpm",
    "requests_per_hour": "ratelimits.field.rph",
    "enabled": "ratelimits.field.enabled",
}

ALWAYS_INCLUDE = {"id", "role_id"}


@router.get(
    "/",
    dependencies=[Depends(require_permission(["ratelimits.read"]))]
)
async def get_all_rate_limit_configs(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all rate limit configurations with role information.
    Fields filtered based on user's field-level permissions.
    """
    role_service = RoleService()
    
    try:
        # Fetch rate limit configs
        response = supabase_client.table('rate_limit_configs').select('*').order('role_id').execute()
        configs = response.data if response.data else []
        
        # Enrich with role names
        for config in configs:
            role = await role_service.get_role_by_id(config['role_id'])
            config['role_name'] = role['name'] if role else 'Unknown'
        
        # Get user's permissions for field filtering
        user_permissions = await role_service.get_user_permissions(current_user["id"])
        
        return filter_fields_list(configs, user_permissions, RATE_LIMIT_FIELD_CONFIG, ALWAYS_INCLUDE)
        
    except Exception as e:
        logger.error(f"Error fetching rate limit configs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch rate limit configs: {str(e)}"
        )


@router.get(
    "/{config_id}",
    dependencies=[Depends(require_permission(["ratelimits.read"]))]
)
async def get_rate_limit_config(
    config_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific rate limit configuration"""
    role_service = RoleService()
    
    try:
        response = supabase_client.table('rate_limit_configs').select('*').eq('id', config_id).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate limit config not found"
            )
        
        config = response.data
        
        # Add role name
        role = await role_service.get_role_by_id(config['role_id'])
        config['role_name'] = role['name'] if role else 'Unknown'
        
        # Get user's permissions for field filtering
        user_permissions = await role_service.get_user_permissions(current_user["id"])
        
        return filter_fields(config, user_permissions, RATE_LIMIT_FIELD_CONFIG, ALWAYS_INCLUDE)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching rate limit config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch rate limit config: {str(e)}"
        )


@router.put(
    "/{config_id}",
    dependencies=[Depends(require_permission(["ratelimits.write"]))]
)
async def update_rate_limit_config(
    config_id: int,
    config_data: RateLimitConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a rate limit configuration"""
    from app.services.audit_service import audit_logger
    
    try:
        # Check if config exists
        existing = supabase_client.table('rate_limit_configs').select('*').eq('id', config_id).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate limit config not found"
            )
        
        # Build update data
        update_data = {k: v for k, v in config_data.dict().items() if v is not None}
        
        if not update_data:
            return existing.data
        
        response = supabase_client.table('rate_limit_configs').update(update_data).eq('id', config_id).execute()
        
        if response.data:
            # Invalidate cache so new limits take effect
            rate_limit_config_cache.invalidate()
            
            # Audit log
            await audit_logger.log_action(
                user_id=current_user["id"],
                action="UPDATE_RATE_LIMIT",
                resource_type="rate_limit_config",
                resource_id=str(config_id),
                changes=update_data,
                metadata={"role_id": existing.data['role_id']}
            )
            
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update rate limit config"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rate limit config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update rate limit config: {str(e)}"
        )


@router.post(
    "/{config_id}/toggle",
    dependencies=[Depends(require_permission(["ratelimits.write"]))]
)
async def toggle_rate_limit(
    config_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Toggle rate limiting on/off for a role"""
    from app.services.audit_service import audit_logger
    
    try:
        # Get current state
        existing = supabase_client.table('rate_limit_configs').select('enabled, role_id').eq('id', config_id).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate limit config not found"
            )
        
        new_state = not existing.data['enabled']
        
        response = supabase_client.table('rate_limit_configs').update({'enabled': new_state}).eq('id', config_id).execute()
        
        if response.data:
            # Invalidate cache
            rate_limit_config_cache.invalidate()
            
            # Audit log
            await audit_logger.log_action(
                user_id=current_user["id"],
                action="TOGGLE_RATE_LIMIT",
                resource_type="rate_limit_config",
                resource_id=str(config_id),
                changes={"enabled": new_state},
                metadata={"role_id": existing.data['role_id']}
            )
            
            return {
                "message": f"Rate limiting {'enabled' if new_state else 'disabled'}",
                "enabled": new_state
            }
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to toggle rate limit"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling rate limit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle rate limit: {str(e)}"
        )
