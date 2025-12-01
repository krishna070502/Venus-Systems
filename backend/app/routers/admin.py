"""
Admin Router
============
Admin-specific endpoints for managing users, roles, and system settings.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from typing import List, Dict
import logging
from datetime import datetime, timezone

from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.services.supabase_client import supabase_client
from app.dependencies.rbac import require_admin, require_permission
from app.dependencies.auth import get_current_user
from app.models.user import UserProfile
from app.models.role import Role

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# USER MANAGEMENT
# =============================================================================

@router.get(
    "/users",
    response_model=List[Dict],
    dependencies=[Depends(require_admin)]
)
async def admin_get_all_users(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all users with their roles (Admin only)"""
    user_service = UserService()
    role_service = RoleService()
    
    users = await user_service.get_all_users(limit=limit, offset=offset)
    
    # Enrich with roles
    for user in users:
        roles = await role_service.get_user_roles(user["id"])
        user["roles"] = [role["name"] for role in roles]
    
    return users


@router.post(
    "/users/{user_id}/roles/{role_id}",
    dependencies=[Depends(require_admin)]
)
async def admin_assign_role(
    user_id: str,
    role_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Assign a role to a user (Admin only)"""
    from app.services.audit_service import audit_logger
    
    role_service = RoleService()
    
    # Verify user exists
    user_service = UserService()
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify role exists
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    success = await role_service.assign_role_to_user(user_id, role_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign role"
        )
    
    # Audit log
    await audit_logger.log_action(
        user_id=current_user["id"],
        action="ASSIGN_ROLE",
        resource_type="user",
        resource_id=user_id,
        changes={"role_id": role_id},
        metadata={"role_name": role["name"], "user_email": user.get("email")}
    )
    
    return {"message": f"Role {role['name']} assigned to user successfully"}


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    dependencies=[Depends(require_admin)]
)
async def admin_remove_role(
    user_id: str,
    role_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Remove a role from a user (Admin only)"""
    from app.services.audit_service import audit_logger
    
    role_service = RoleService()
    
    # Get role info before removal
    role = await role_service.get_role_by_id(role_id)
    
    success = await role_service.remove_role_from_user(user_id, role_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove role"
        )
    
    # Audit log
    await audit_logger.log_action(
        user_id=current_user["id"],
        action="REMOVE_ROLE",
        resource_type="user",
        resource_id=user_id,
        changes={"role_id": role_id},
        metadata={"role_name": role.get("name") if role else None}
    )
    
    return {"message": "Role removed from user successfully"}


# =============================================================================
# ROLE MANAGEMENT
# =============================================================================

@router.get(
    "/roles",
    response_model=List[Dict],
    dependencies=[Depends(require_admin)]
)
async def admin_get_all_roles():
    """Get all roles with permissions (Admin only)"""
    role_service = RoleService()
    
    roles = await role_service.get_all_roles()
    
    # Enrich with permissions
    for role in roles:
        permissions = await role_service.get_role_permissions(role["id"])
        role["permissions"] = permissions
    
    return roles


# =============================================================================
# SYSTEM SETTINGS
# =============================================================================

@router.get(
    "/settings",
    dependencies=[Depends(require_admin)]
)
async def admin_get_settings():
    """Get system settings (Admin only)"""
    try:
        result = supabase_client.table("system_settings")\
            .select("*")\
            .execute()
        
        settings_list = result.data if result.data else []
        
        # Convert to a dictionary for easier use
        settings_dict = {}
        for setting in settings_list:
            key = setting["key"]
            value = setting["value"]
            value_type = setting.get("value_type", "string")
            
            # Convert value based on type
            if value_type == "boolean":
                settings_dict[key] = value.lower() == "true"
            elif value_type == "number":
                settings_dict[key] = float(value) if "." in value else int(value)
            elif value_type == "json":
                import json
                settings_dict[key] = json.loads(value)
            else:
                settings_dict[key] = value
        
        return {
            "message": "System settings retrieved",
            "settings": settings_dict,
            "raw": settings_list  # Include raw for descriptions
        }
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        return {
            "message": "System settings endpoint",
            "settings": {
                "maintenance_mode": False,
                "registration_enabled": True,
                "app_name": "Venus Chicken",
                "api_version": "1.0.0"
            }
        }


@router.put(
    "/settings",
    dependencies=[Depends(require_admin)]
)
async def admin_update_settings(
    settings: Dict,
    current_user: Dict = Depends(get_current_user)
):
    """Update system settings (Admin only)"""
    from app.services.audit_service import audit_logger
    
    try:
        updated_keys = []
        
        for key, value in settings.items():
            # Convert value to string for storage
            if isinstance(value, bool):
                str_value = "true" if value else "false"
                value_type = "boolean"
            elif isinstance(value, (int, float)):
                str_value = str(value)
                value_type = "number"
            elif isinstance(value, dict):
                import json
                str_value = json.dumps(value)
                value_type = "json"
            else:
                str_value = str(value)
                value_type = "string"
            
            # Upsert the setting
            supabase_client.table("system_settings")\
                .upsert({
                    "key": key,
                    "value": str_value,
                    "value_type": value_type,
                    "updated_by": current_user["id"]
                })\
                .execute()
            
            updated_keys.append(key)
        
        # Audit log
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="UPDATE_SETTINGS",
            resource_type="system_settings",
            resource_id="system",
            changes=settings,
            metadata={"updated_keys": updated_keys}
        )
        
        logger.info(f"Settings updated by {current_user['id']}: {updated_keys}")
        
        return {
            "message": "Settings updated successfully",
            "updated_keys": updated_keys
        }
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )


@router.get(
    "/settings/{key}",
    dependencies=[Depends(require_admin)]
)
async def admin_get_setting(key: str):
    """Get a specific system setting (Admin only)"""
    try:
        result = supabase_client.table("system_settings")\
            .select("*")\
            .eq("key", key)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{key}' not found"
            )
        
        setting = result.data
        value = setting["value"]
        value_type = setting.get("value_type", "string")
        
        # Convert value based on type
        if value_type == "boolean":
            value = value.lower() == "true"
        elif value_type == "number":
            value = float(value) if "." in value else int(value)
        elif value_type == "json":
            import json
            value = json.loads(value)
        
        return {
            "key": key,
            "value": value,
            "description": setting.get("description"),
            "updated_at": setting.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching setting {key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch setting: {str(e)}"
        )


# =============================================================================
# SYSTEM LOGS
# =============================================================================

@router.get(
    "/logs",
    dependencies=[Depends(require_permission(["system.logs"]))]
)
async def admin_get_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get audit logs (requires system.logs permission)"""
    try:
        # Fetch from audit_logs table
        result = supabase_client.table("audit_logs")\
            .select("*")\
            .order("timestamp", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        logs = result.data if result.data else []
        
        return {
            "logs": logs,
            "total": len(logs),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error fetching audit logs: {str(e)}")
        # Return empty if table doesn't exist yet
        return {
            "logs": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }


# =============================================================================
# STATISTICS
# =============================================================================

@router.get(
    "/stats",
    dependencies=[Depends(require_permission(["system.admin"]))]
)
async def admin_get_stats():
    """Get system statistics (requires system.admin permission)"""
    user_service = UserService()
    role_service = RoleService()
    
    users = await user_service.get_all_users(limit=10000)
    roles = await role_service.get_all_roles()
    permissions = await role_service.get_all_permissions()
    
    # Get active sessions count - count all users who have signed in
    try:
        # Simply count all users in profiles table as active sessions
        # In a real app, you'd track actual sessions in a separate table
        sessions_response = supabase_client.table('profiles').select(
            'id', count='exact'
        ).execute()
        active_sessions_count = sessions_response.count or 0
    except Exception as e:
        logger.warning(f"Could not fetch sessions count: {e}")
        active_sessions_count = 0
    
    return {
        "total_users": len(users),
        "total_roles": len(roles),
        "total_permissions": len(permissions),
        "active_sessions": active_sessions_count
    }


@router.get(
    "/sessions",
    dependencies=[Depends(require_admin)]
)
async def get_active_sessions(request: Request):
    """Get all active sessions with user and device information"""
    try:
        # Try to get sessions from user_sessions table if it exists
        try:
            sessions_response = supabase_client.table('user_sessions').select(
                'user_id, ip_address, user_agent, device_type, browser, location, last_activity_at, created_at'
            ).order('last_activity_at', desc=True).limit(100).execute()
            
            # Enrich with user profile data
            sessions = []
            for session in sessions_response.data:
                # Get user profile
                profile = supabase_client.table('profiles').select(
                    'full_name, email'
                ).eq('id', session['user_id']).single().execute()
                
                sessions.append({
                    "user_id": session["user_id"],
                    "email": profile.data.get('email') if profile.data else 'Unknown',
                    "full_name": profile.data.get('full_name') if profile.data else None,
                    "last_sign_in_at": session.get("last_activity_at"),
                    "created_at": session.get("created_at"),
                    "ip_address": session.get("ip_address"),
                    "user_agent": session.get("user_agent"),
                    "device_type": session.get("device_type"),
                    "browser": session.get("browser"),
                    "location": session.get("location")
                })
            
            if sessions:
                return {
                    "sessions": sessions,
                    "total": len(sessions)
                }
        except Exception as e:
            logger.debug(f"user_sessions table not available: {e}")
        
        # Fallback: Get all users with their profile info
        users_response = supabase_client.table('profiles').select(
            'id, full_name, email, created_at'
        ).order('created_at', desc=True).limit(50).execute()
        
        sessions = []
        for user in users_response.data:
            sessions.append({
                "user_id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name"),
                "last_sign_in_at": user.get("created_at"),
                "created_at": user.get("created_at"),
                "ip_address": None,
                "user_agent": None,
                "device_type": None,
                "browser": None,
                "location": None
            })
        
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sessions: {str(e)}"
        )
