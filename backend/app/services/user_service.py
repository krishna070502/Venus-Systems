"""
User Service
============
Business logic for user management operations.
"""

from typing import List, Optional, Dict
import logging

from app.services.supabase_client import supabase_client
from app.models.user import UserCreate, UserUpdate, UserProfile

logger = logging.getLogger(__name__)


class UserService:
    """Service for user-related operations"""
    
    def __init__(self):
        self.client = supabase_client
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user profile by ID"""
        try:
            response = self.client.table("profiles").select("*").eq("id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {str(e)}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user profile by email"""
        try:
            response = self.client.table("profiles").select("*").eq("email", email).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching user by email {email}: {str(e)}")
            return None
    
    async def get_all_users(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all users with pagination"""
        try:
            response = (
                self.client.table("profiles")
                .select("*")
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching users: {str(e)}")
            return []
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[Dict]:
        """Update user profile"""
        try:
            # Filter out None values
            update_data = {k: v for k, v in user_data.dict().items() if v is not None}
            
            if not update_data:
                return await self.get_user_by_id(user_id)
            
            response = (
                self.client.table("profiles")
                .update(update_data)
                .eq("id", user_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {str(e)}")
            raise
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user (soft delete recommended in production)"""
        try:
            # In production, implement soft delete by adding a 'deleted_at' field
            # For now, we'll delete from auth which cascades to profiles
            self.client.auth.admin.delete_user(user_id)
            return True
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            return False
    
    async def search_users(self, query: str) -> List[Dict]:
        """Search users by email or name"""
        try:
            response = (
                self.client.table("profiles")
                .select("*")
                .or_(f"email.ilike.%{query}%,full_name.ilike.%{query}%")
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error searching users: {str(e)}")
            return []
