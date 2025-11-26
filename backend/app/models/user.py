"""
User Models
===========
Pydantic models for user-related data validation and serialization.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Model for updating user information"""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserProfile(UserBase):
    """User profile model"""
    id: str
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserWithRoles(UserProfile):
    """User model with roles included"""
    roles: List[str] = []


class UserWithPermissions(UserWithRoles):
    """User model with roles and permissions"""
    permissions: List[str] = []


class UserInDB(UserProfile):
    """User model as stored in database"""
    pass
