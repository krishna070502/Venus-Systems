"""
Users Router
============
Endpoints for user management.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict
import logging

from app.models.user import UserUpdate, UserProfile
from app.services.user_service import UserService
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user's profile with roles and permissions
    
    Returns the authenticated user's complete profile including:
    - User details (id, email, full_name, etc.)
    - Assigned roles (list of role names)
    - All permissions (list of permission keys)
    
    The permissions array contains ALL permissions the user has access to,
    which is used by the frontend to:
    - Filter navigation items
    - Protect page routes with PermissionGuard
    - Display dynamic feature cards on the landing page
    - Show available features based on user access
    
    **Dynamic Permission Display:**
    - Permissions in the frontend featureMap show as clickable feature cards
    - Other permissions automatically appear in "Additional Permissions" section
    - New permissions appear automatically without code changes
    
    **Example Response:**
    ```json
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "roles": ["Admin", "Manager"],
      "permissions": [
        "systemdashboard.view",
        "users.read",
        "users.write",
        "roles.read",
        "permissions.read",
        "system.settings",
        "system.logs",
        "system.docs",
        "system.status",
        "test.run"
      ]
    }
    ```
    """
    from app.services.role_service import RoleService
    
    user_service = UserService()
    role_service = RoleService()
    
    profile = await user_service.get_user_by_id(current_user["id"])
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Add roles to profile
    roles = await role_service.get_user_roles(current_user["id"])
    profile["roles"] = [role["name"] for role in roles]
    
    # Add permissions to profile
    permissions = await role_service.get_user_permissions(current_user["id"])
    profile["permissions"] = permissions
    
    return profile


@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    user_service = UserService()
    
    try:
        updated_user = await user_service.update_user(current_user["id"], user_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        return updated_user
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile"
        )


@router.get(
    "/",
    response_model=List[UserProfile],
    dependencies=[Depends(require_permission(["users.read"]))]
)
async def get_all_users(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all users (requires users.read permission)"""
    user_service = UserService()
    users = await user_service.get_all_users(limit=limit, offset=offset)
    return users


@router.get(
    "/{user_id}",
    response_model=UserProfile,
    dependencies=[Depends(require_permission(["users.read"]))]
)
async def get_user(user_id: str):
    """Get user by ID (requires users.read permission)"""
    user_service = UserService()
    user = await user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put(
    "/{user_id}",
    response_model=UserProfile,
    dependencies=[Depends(require_permission(["users.write"]))]
)
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user by ID (requires users.write permission)"""
    user_service = UserService()
    
    try:
        updated_user = await user_service.update_user(user_id, user_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return updated_user
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user"
        )


@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_permission(["users.delete"]))]
)
async def delete_user(user_id: str):
    """Delete user by ID (requires users.delete permission)"""
    user_service = UserService()
    
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete user"
        )
    
    return {"message": "User deleted successfully"}


@router.get(
    "/search/",
    response_model=List[UserProfile],
    dependencies=[Depends(require_permission(["users.read"]))]
)
async def search_users(q: str = Query(..., min_length=1)):
    """Search users by email or name"""
    user_service = UserService()
    users = await user_service.search_users(q)
    return users
