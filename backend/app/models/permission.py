"""
Permission Models
=================
Pydantic models for permission-related data validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PermissionBase(BaseModel):
    """Base permission model"""
    key: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Model for creating a new permission"""
    pass


class PermissionUpdate(BaseModel):
    """Model for updating a permission"""
    key: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class Permission(PermissionBase):
    """Permission model with all fields"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AssignPermissionToRole(BaseModel):
    """Model for assigning a permission to a role"""
    role_id: int
    permission_id: int
