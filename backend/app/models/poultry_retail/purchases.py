"""
Purchase Models for PoultryRetail-Core
======================================
Pydantic models for purchase order management.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from .enums import BirdType, PurchaseStatus


class PurchaseBase(BaseModel):
    """Base purchase model with common fields"""
    store_id: int
    supplier_id: UUID
    bird_type: BirdType
    bird_count: int = Field(..., gt=0)
    total_weight: Decimal = Field(..., gt=0, max_digits=10, decimal_places=3)
    price_per_kg: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator('total_weight', 'price_per_kg', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class PurchaseCreate(PurchaseBase):
    """Model for creating a new purchase order"""
    pass


class PurchaseCommit(BaseModel):
    """Model for committing a purchase to inventory"""
    notes: Optional[str] = None


class Purchase(PurchaseBase):
    """Complete purchase model with computed and audit fields"""
    id: UUID
    total_amount: Decimal  # Computed: total_weight * price_per_kg
    status: PurchaseStatus = PurchaseStatus.DRAFT
    created_by: UUID
    committed_by: Optional[UUID] = None
    committed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PurchaseWithSupplier(Purchase):
    """Purchase with supplier details"""
    supplier_name: str
    supplier_contact: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseListResponse(BaseModel):
    """Response model for purchase list"""
    items: list[Purchase]
    total: int
    page: int
    page_size: int
