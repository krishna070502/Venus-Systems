"""
Customer Models for PoultryRetail-Core
======================================
Pydantic models for customer management.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum


class CustomerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class CustomerBase(BaseModel):
    """Base customer model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=20)
    credit_limit: Decimal = Field(default=Decimal("0"))
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    """Model for creating a new customer"""
    pass


class CustomerUpdate(BaseModel):
    """Model for updating customer details"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=20)
    credit_limit: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[CustomerStatus] = None


class Customer(CustomerBase):
    """Complete customer model with all fields"""
    id: UUID
    status: CustomerStatus = CustomerStatus.ACTIVE
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerWithBalance(Customer):
    """Customer with computed outstanding balance"""
    outstanding_balance: Decimal = Field(default=Decimal("0"))
