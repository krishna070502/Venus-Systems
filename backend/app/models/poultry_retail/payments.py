"""
Payment Models for PoultryRetail-Core
=====================================
Pydantic models for supplier payment management.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK = "BANK"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    OTHER = "OTHER"


class SupplierPaymentBase(BaseModel):
    """Base supplier payment model"""
    supplier_id: UUID
    purchase_id: Optional[UUID] = None  # Optional link to specific purchase
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = Field(None, max_length=100)
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None


class SupplierPaymentCreate(SupplierPaymentBase):
    """Model for creating a new payment"""
    pass


class SupplierPayment(SupplierPaymentBase):
    """Complete payment model with all fields"""
    id: UUID
    payment_number: str
    store_id: Optional[int] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierPaymentWithDetails(SupplierPayment):
    """Payment with related entity details"""
    supplier_name: Optional[str] = None
    purchase_reference: Optional[str] = None
