"""
Role-Based Access Control Dependencies
=======================================
FastAPI dependencies for role and permission checking.
"""

from fastapi import Depends, HTTPException, status
from typing import List, Callable
import logging

from app.dependencies.auth import get_current_user
from app.services.role_service import RoleService

logger = logging.getLogger(__name__)


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory to require specific roles.
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(["Admin"]))])
        
    Args:
        allowed_roles: List of role names that are allowed
        
    Returns:
        Dependency function
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_id = current_user.get("id")
        
        # Get user roles
        role_service = RoleService()
        user_roles = await role_service.get_user_roles(user_id)
        user_role_names = [role["name"] for role in user_roles]
        
        # Check if user has any of the allowed roles
        has_role = any(role in allowed_roles for role in user_role_names)
        
        if not has_role:
            logger.warning(
                f"User {user_id} attempted to access resource requiring roles {allowed_roles}. "
                f"User has roles: {user_role_names}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        
        # Enrich user object with roles and store_ids for downstream validation
        current_user["roles"] = user_role_names
        current_user["store_ids"] = await role_service.get_user_store_ids(user_id)
        current_user["user_id"] = user_id  # Added for compatibility with poultry routers
        
        logger.info(f"Enriched role user {user_id}: roles={len(user_role_names)}, stores={len(current_user['store_ids'])}")
        
        return current_user
    
    return role_checker


def require_permission(required_permissions: List[str]) -> Callable:
    """
    Dependency factory to require specific permissions.
    
    Usage:
        @router.get("/users", dependencies=[Depends(require_permission(["users.read"]))])
        
    Args:
        required_permissions: List of permission keys that are required
        
    Returns:
        Dependency function
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_id = current_user.get("id")
        
        # Get user permissions
        role_service = RoleService()
        user_permissions = await role_service.get_user_permissions(user_id)
        
        # DEBUG: Log what permissions the user has
        logger.info(f"User {user_id} has permissions: {user_permissions}")
        logger.info(f"Required permissions: {required_permissions}")
        
        # Check if user has all required permissions
        has_all_permissions = all(perm in user_permissions for perm in required_permissions)
        
        if not has_all_permissions:
            missing_permissions = [perm for perm in required_permissions if perm not in user_permissions]
            logger.warning(
                f"User {user_id} attempted to access resource requiring permissions {required_permissions}. "
                f"Missing: {missing_permissions}. User has: {user_permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(required_permissions)}"
            )
        
        # Enrich user object with roles and store_ids for downstream validation (e.g. validate_store_access)
        user_roles = await role_service.get_user_roles(user_id)
        current_user["roles"] = [role["name"] for role in user_roles]
        current_user["store_ids"] = await role_service.get_user_store_ids(user_id)
        current_user["user_id"] = user_id  # Added for compatibility with poultry routers
        
        logger.info(f"Enriched perm user {user_id}: roles={current_user['roles']}, stores={current_user['store_ids']}")
        
        return current_user
    
    return permission_checker


# Convenience dependencies for common roles
require_admin = require_role(["Admin"])
require_admin_or_manager = require_role(["Admin", "Manager"])
