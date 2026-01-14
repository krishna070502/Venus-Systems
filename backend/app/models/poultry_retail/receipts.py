"""
Receipt Models for PoultryRetail-Core
=====================================
Pydantic models for receipt (customer payment) management.
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


class ReceiptBase(BaseModel):
    """Base receipt model"""
    sale_id: Optional[UUID] = None
    customer_id: UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = Field(None, max_length=100)
    receipt_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReceiptCreate(ReceiptBase):
    """Model for creating a new receipt"""
    pass


class Receipt(ReceiptBase):
    """Complete receipt model with all fields"""
    id: UUID
    receipt_number: str
    store_id: Optional[int] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReceiptWithDetails(Receipt):
    """Receipt with related entity details"""
    customer_name: Optional[str] = None
    sale_invoice: Optional[str] = None
