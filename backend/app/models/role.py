"""
Role Models
===========
Pydantic models for role-related data validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RoleBase(BaseModel):
    """Base role model"""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Model for creating a new role"""
    pass


class RoleUpdate(BaseModel):
    """Model for updating a role"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None


class Role(RoleBase):
    """Role model with all fields"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RoleWithPermissions(Role):
    """Role model with associated permissions"""
    permissions: List[str] = []


class AssignRoleToUser(BaseModel):
    """Model for assigning a role to a user"""
    user_id: str
    role_id: int
