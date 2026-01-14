"""
Roles Router
============
Endpoints for role management.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict
import logging

from app.models.role import RoleCreate, RoleUpdate, Role, RoleWithPermissions
from app.services.role_service import RoleService
from app.services.audit_service import audit_logger
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission
from app.utils.field_filter import filter_fields, filter_fields_list

logger = logging.getLogger(__name__)

router = APIRouter()

# Field-level permission configuration for roles
ROLE_FIELD_CONFIG = {
    "name": "roles.field.name",
    "description": "roles.field.description",
    "permissions": "roles.field.permissions",
}

# Fields always included
ALWAYS_INCLUDE = {"id"}


@router.get(
    "/",
    dependencies=[Depends(require_permission(["roles.read"]))]
)
async def get_all_roles(current_user: Dict = Depends(get_current_user)):
    """Get all roles. Fields filtered based on user's field-level permissions."""
    role_service = RoleService()
    roles = await role_service.get_all_roles()
    
    # Get user's permissions for field filtering
    user_permissions = await role_service.get_user_permissions(current_user["id"])
    
    return filter_fields_list(roles, user_permissions, ROLE_FIELD_CONFIG, ALWAYS_INCLUDE)


@router.get(
    "/{role_id}",
    dependencies=[Depends(require_permission(["roles.read"]))]
)
async def get_role(role_id: int, current_user: Dict = Depends(get_current_user)):
    """Get role by ID with permissions. Fields filtered based on user's field-level permissions."""
    role_service = RoleService()
    
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Get permissions for this role
    permissions = await role_service.get_role_permissions(role_id)
    
    role_with_perms = {
        **role,
        "permissions": permissions
    }
    
    # Get user's permissions for field filtering
    user_permissions = await role_service.get_user_permissions(current_user["id"])
    
    return filter_fields(role_with_perms, user_permissions, ROLE_FIELD_CONFIG, ALWAYS_INCLUDE)


@router.post(
    "/",
    response_model=Role,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(["roles.write"]))]
)
async def create_role(
    role_data: RoleCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new role"""
    role_service = RoleService()
    
    try:
        role = await role_service.create_role(role_data)
        
        # Audit log
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="CREATE",
            resource_type="role",
            resource_id=str(role["id"]),
            changes={"data": role_data.dict()},
            metadata={"role_name": role_data.name}
        )
        
        return role
    except Exception as e:
        logger.error(f"Error creating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create role"
        )


@router.put(
    "/{role_id}",
    response_model=Role,
    dependencies=[Depends(require_permission(["roles.write"]))]
)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a role"""
    role_service = RoleService()
    
    try:
        # Get old role data
        old_role = await role_service.get_role_by_id(role_id)
        if not old_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        role = await role_service.update_role(role_id, role_data)
        
        # Compare and log changes
        changes = audit_logger.compare_objects(
            old_role,
            role_data.dict(exclude_unset=True)
        )
        
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="UPDATE",
            resource_type="role",
            resource_id=str(role_id),
            changes=changes,
            metadata={"role_name": old_role.get("name")}
        )
        
        return role
    except Exception as e:
        logger.error(f"Error updating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update role"
        )


@router.delete(
    "/{role_id}",
    dependencies=[Depends(require_permission(["roles.delete"]))]
)
async def delete_role(
    role_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a role"""
    role_service = RoleService()
    
    # Get role data before deletion
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    success = await role_service.delete_role(role_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete role"
        )
    
    # Audit log
    await audit_logger.log_action(
        user_id=current_user["id"],
        action="DELETE",
        resource_type="role",
        resource_id=str(role_id),
        changes={"deleted_data": role},
        metadata={"role_name": role.get("name")}
    )
    
    return {"message": "Role deleted successfully"}


@router.post(
    "/{role_id}/permissions/{permission_id}",
    dependencies=[Depends(require_permission(["permissions.manage"]))]
)
async def assign_permission_to_role(
    role_id: int,
    permission_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """
    Assign a permission to a role
    
    **Permission Required:** `permissions.manage`
    
    When a permission is assigned to a role, all users with that role
    will immediately gain access to the associated features.
    
    **Dynamic UI Updates:**
    - Permission appears in user's permissions list (`/api/v1/users/me`)
    - Frontend automatically shows new features/pages
    - Navigation items become visible (if permission matches sidebar items)
    - Landing page displays the new permission (as feature card or badge)
    
    **Use Cases:**
    - Grant dashboard access: Assign `systemdashboard.view` to Manager role
    - Enable reports: Assign `reports.view` to Analyst role
    - Allow user management: Assign `users.read` and `users.write` to Admin role
    
    **Example:** 
    Assigning `reports.view` to "Manager" role makes reports accessible to all Managers.
    """
    role_service = RoleService()
    
    # Get role and permission details
    role = await role_service.get_role_by_id(role_id)
    
    success = await role_service.assign_permission_to_role(role_id, permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign permission to role"
        )
    
    # Audit log
    await audit_logger.log_action(
        user_id=current_user["id"],
        action="ASSIGN_PERMISSION",
        resource_type="role",
        resource_id=str(role_id),
        changes={"permission_id": permission_id},
        metadata={
            "role_name": role.get("name") if role else None,
            "permission_id": permission_id
        }
    )
    
    return {"message": "Permission assigned successfully"}


@router.delete(
    "/{role_id}/permissions/{permission_id}",
    dependencies=[Depends(require_permission(["permissions.manage"]))]
)
async def remove_permission_from_role(
    role_id: int,
    permission_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Remove a permission from a role"""
    role_service = RoleService()
    
    # Get role details
    role = await role_service.get_role_by_id(role_id)
    
    success = await role_service.remove_permission_from_role(role_id, permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove permission from role"
        )
    
    # Audit log
    await audit_logger.log_action(
        user_id=current_user["id"],
        action="REMOVE_PERMISSION",
        resource_type="role",
        resource_id=str(role_id),
        changes={"permission_id": permission_id},
        metadata={
            "role_name": role.get("name") if role else None,
            "permission_id": permission_id
        }
    )
    
    return {"message": "Permission removed successfully"}
