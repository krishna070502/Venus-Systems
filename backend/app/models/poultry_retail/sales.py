"""
Sales Models for PoultryRetail-Core
===================================
Pydantic models for POS and bulk sales.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from .enums import PaymentMethod, SaleType


# =============================================================================
# SALE ITEM MODELS
# =============================================================================

class SaleItemCreate(BaseModel):
    """Model for creating a sale item"""
    sku_id: UUID
    weight: Decimal = Field(..., gt=0, max_digits=10, decimal_places=3)
    price_snapshot: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)

    @field_validator('weight', 'price_snapshot', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class SaleItem(BaseModel):
    """Complete sale item model"""
    id: UUID
    sale_id: UUID
    sku_id: UUID
    weight: Decimal
    price_snapshot: Decimal
    total: Decimal  # Computed: weight * price_snapshot

    class Config:
        from_attributes = True


class SaleItemWithSKU(SaleItem):
    """Sale item with SKU details"""
    sku_name: str
    sku_code: str
    unit: str

    class Config:
        from_attributes = True


# =============================================================================
# SALE MODELS
# =============================================================================

class SaleCreate(BaseModel):
    """Model for creating a new sale"""
    store_id: int
    items: list[SaleItemCreate]
    payment_method: PaymentMethod
    sale_type: SaleType = SaleType.POS
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    customer_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None
    idempotency_key: Optional[UUID] = None

    @field_validator('items')
    @classmethod
    def at_least_one_item(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Sale must have at least one item")
        return v


class Sale(BaseModel):
    """Complete sale model"""
    id: UUID
    store_id: int
    cashier_id: UUID
    total_amount: Decimal
    payment_method: PaymentMethod
    sale_type: SaleType
    receipt_number: str
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SaleWithItems(Sale):
    """Sale with all items"""
    items: list[SaleItemWithSKU]

    class Config:
        from_attributes = True


class SaleListResponse(BaseModel):
    """Response model for sale list"""
    items: list[Sale]
    total: int
    page: int
    page_size: int


class SaleSummary(BaseModel):
    """Sales summary for a period"""
    store_id: int
    date: datetime
    total_sales: Decimal
    total_cash: Decimal
    total_upi: Decimal
    total_card: Decimal
    total_bank: Decimal
    sale_count: int
