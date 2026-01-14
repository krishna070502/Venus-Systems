"""
Supplier Models for PoultryRetail-Core
======================================
Pydantic models for supplier management.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from .enums import SupplierStatus


class SupplierBase(BaseModel):
    """Base supplier model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=20)
    pan_number: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    """Model for creating a new supplier"""
    pass


class SupplierUpdate(BaseModel):
    """Model for updating supplier details"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=20)
    pan_number: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None
    status: Optional[SupplierStatus] = None


class Supplier(SupplierBase):
    """Complete supplier model with all fields"""
    id: UUID
    status: SupplierStatus = SupplierStatus.ACTIVE
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
