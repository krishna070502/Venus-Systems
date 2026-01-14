"""
Role Service
============
Business logic for role and permission management operations.
"""

from typing import List, Dict, Optional
import logging

from app.services.supabase_client import supabase_client
from app.models.role import RoleCreate, RoleUpdate
from app.models.permission import PermissionCreate, PermissionUpdate

logger = logging.getLogger(__name__)


class RoleService:
    """Service for role and permission operations"""
    
    def __init__(self):
        self.client = supabase_client
    
    # =============================================================================
    # ROLE OPERATIONS
    # =============================================================================
    
    async def get_all_roles(self) -> List[Dict]:
        """Get all roles"""
        try:
            response = self.client.table("roles").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching roles: {str(e)}")
            return []
    
    async def get_role_by_id(self, role_id: int) -> Optional[Dict]:
        """Get role by ID"""
        try:
            response = self.client.table("roles").select("*").eq("id", role_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching role {role_id}: {str(e)}")
            return None
    
    async def create_role(self, role_data: RoleCreate) -> Dict:
        """Create a new role"""
        try:
            response = self.client.table("roles").insert(role_data.dict()).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating role: {str(e)}")
            raise
    
    async def update_role(self, role_id: int, role_data: RoleUpdate) -> Optional[Dict]:
        """Update a role"""
        try:
            update_data = {k: v for k, v in role_data.dict().items() if v is not None}
            if not update_data:
                return await self.get_role_by_id(role_id)
            
            response = self.client.table("roles").update(update_data).eq("id", role_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating role {role_id}: {str(e)}")
            raise
    
    async def delete_role(self, role_id: int) -> bool:
        """Delete a role"""
        try:
            self.client.table("roles").delete().eq("id", role_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting role {role_id}: {str(e)}")
            return False
    
    # =============================================================================
    # USER-ROLE OPERATIONS
    # =============================================================================
    
    async def get_user_roles(self, user_id: str) -> List[Dict]:
        """Get all roles assigned to a user"""
        try:
            response = (
                self.client.table("user_roles")
                .select("role_id, roles(id, name, description)")
                .eq("user_id", user_id)
                .execute()
            )
            return [item["roles"] for item in response.data if item.get("roles")]
        except Exception as e:
            logger.error(f"Error fetching user roles: {str(e)}")
            return []
    
    async def assign_role_to_user(self, user_id: str, role_id: int) -> bool:
        """Assign a role to a user"""
        try:
            self.client.table("user_roles").insert({
                "user_id": user_id,
                "role_id": role_id
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error assigning role to user: {str(e)}")
            return False
    
    async def remove_role_from_user(self, user_id: str, role_id: int) -> bool:
        """Remove a role from a user"""
        try:
            self.client.table("user_roles").delete().match({
                "user_id": user_id,
                "role_id": role_id
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error removing role from user: {str(e)}")
            return False
    
    # =============================================================================
    # PERMISSION OPERATIONS
    # =============================================================================
    
    async def get_all_permissions(self) -> List[Dict]:
        """Get all permissions"""
        try:
            response = self.client.table("permissions").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching permissions: {str(e)}")
            return []
    
    async def get_permission_by_id(self, permission_id: int) -> Optional[Dict]:
        """Get permission by ID"""
        try:
            response = self.client.table("permissions").select("*").eq("id", permission_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching permission {permission_id}: {str(e)}")
            return None
    
    async def create_permission(self, permission_data: PermissionCreate) -> Dict:
        """Create a new permission"""
        try:
            response = self.client.table("permissions").insert(permission_data.dict()).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating permission: {str(e)}")
            raise
    
    async def update_permission(self, permission_id: int, permission_data: PermissionUpdate) -> Optional[Dict]:
        """Update a permission"""
        try:
            update_data = {k: v for k, v in permission_data.dict().items() if v is not None}
            if not update_data:
                return await self.get_permission_by_id(permission_id)
            
            response = self.client.table("permissions").update(update_data).eq("id", permission_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating permission {permission_id}: {str(e)}")
            raise
    
    async def delete_permission(self, permission_id: int) -> bool:
        """Delete a permission"""
        try:
            self.client.table("permissions").delete().eq("id", permission_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting permission {permission_id}: {str(e)}")
            return False
    
    # =============================================================================
    # ROLE-PERMISSION OPERATIONS
    # =============================================================================
    
    async def get_role_permissions(self, role_id: int) -> List[str]:
        """Get all permissions for a role"""
        try:
            response = (
                self.client.table("role_permissions")
                .select("permissions(key)")
                .eq("role_id", role_id)
                .execute()
            )
            return [item["permissions"]["key"] for item in response.data if item.get("permissions")]
        except Exception as e:
            logger.error(f"Error fetching role permissions: {str(e)}")
            return []
    
    async def get_user_permissions(self, user_id: str) -> List[str]:
        """Get all permissions for a user (through their roles)"""
        try:
            response = self.client.rpc("get_user_permissions", {"user_id": user_id}).execute()
            return [item["permission_key"] for item in response.data]
        except Exception as e:
            logger.error(f"Error fetching user permissions: {str(e)}")
            return []
    
    async def assign_permission_to_role(self, role_id: int, permission_id: int) -> bool:
        """Assign a permission to a role"""
        try:
            self.client.table("role_permissions").insert({
                "role_id": role_id,
                "permission_id": permission_id
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error assigning permission to role: {str(e)}")
            return False
    
    async def remove_permission_from_role(self, role_id: int, permission_id: int) -> bool:
        """Remove a permission from a role"""
        try:
            self.client.table("role_permissions").delete().match({
                "role_id": role_id,
                "permission_id": permission_id
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error removing permission from role: {str(e)}")
            return False
    async def get_user_store_ids(self, user_id: str) -> List[int]:
        """Get IDs of all shops assigned to a user"""
        try:
            response = (
                self.client.table("user_shops")
                .select("shop_id")
                .eq("user_id", user_id)
                .execute()
            )
            return [item["shop_id"] for item in response.data]
        except Exception as e:
            logger.error(f"Error fetching user shop IDs: {str(e)}")
            return []
