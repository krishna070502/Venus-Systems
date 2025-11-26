"""
Permissions Router
==================
Endpoints for permission management.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import logging

from app.models.permission import PermissionCreate, PermissionUpdate, Permission
from app.services.role_service import RoleService
from app.dependencies.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/",
    response_model=List[Permission],
    dependencies=[Depends(require_permission(["permissions.read"]))]
)
async def get_all_permissions():
    """
    Get all permissions in the system
    
    Returns a complete list of all available permissions that can be assigned to roles.
    
    **Permission Required:** `permissions.read`
    
    **Dynamic Permission System:**
    - New permissions can be created and will automatically appear in the UI
    - Frontend displays permissions as feature cards (if mapped) or badges
    - No code changes needed for new permissions to be visible
    
    **Permissions are used to:**
    - Protect frontend pages with PermissionGuard
    - Filter navigation sidebar items
    - Control access to API endpoints
    - Display available features on landing page
    
    **Standard Permission Format:** `<resource>.<action>`
    
    Examples: `users.read`, `systemdashboard.view`, `system.logs`, etc.
    """
    role_service = RoleService()
    permissions = await role_service.get_all_permissions()
    return permissions


@router.get(
    "/{permission_id}",
    response_model=Permission,
    dependencies=[Depends(require_permission(["permissions.read"]))]
)
async def get_permission(permission_id: int):
    """Get permission by ID"""
    role_service = RoleService()
    
    permission = await role_service.get_permission_by_id(permission_id)
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    return permission


@router.post(
    "/",
    response_model=Permission,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(["permissions.write"]))]
)
async def create_permission(permission_data: PermissionCreate):
    """
    Create a new permission
    
    **Permission Required:** `permissions.write`
    
    Creates a new permission that can be assigned to roles. The permission will:
    - Automatically appear in the permissions list
    - Show in the frontend UI immediately
    - Display on the landing page for users who have it (as badge or feature card)
    - Can be assigned to roles via the admin panel
    
    **Naming Convention:** Use format `<resource>.<action>`
    
    **Examples:**
    - `reports.view` - View reports
    - `analytics.export` - Export analytics
    - `billing.manage` - Manage billing
    
    **Request Body:**
    ```json
    {
      "key": "reports.view",
      "description": "View analytics reports"
    }
    ```
    
    **Dynamic Display:**
    - To show as a feature card, add to frontend featureMap
    - Otherwise, appears automatically in "Additional Permissions" section
    """
    role_service = RoleService()
    
    try:
        permission = await role_service.create_permission(permission_data)
        return permission
    except Exception as e:
        logger.error(f"Error creating permission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create permission"
        )


@router.put(
    "/{permission_id}",
    response_model=Permission,
    dependencies=[Depends(require_permission(["permissions.write"]))]
)
async def update_permission(permission_id: int, permission_data: PermissionUpdate):
    """Update a permission"""
    role_service = RoleService()
    
    try:
        permission = await role_service.update_permission(permission_id, permission_data)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found"
            )
        return permission
    except Exception as e:
        logger.error(f"Error updating permission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update permission"
        )


@router.delete(
    "/{permission_id}",
    dependencies=[Depends(require_permission(["permissions.write"]))]
)
async def delete_permission(permission_id: int):
    """Delete a permission"""
    role_service = RoleService()
    
    success = await role_service.delete_permission(permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete permission"
        )
    
    return {"message": "Permission deleted successfully"}
