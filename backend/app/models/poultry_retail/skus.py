"""
SKU and Pricing Models for PoultryRetail-Core
=============================================
Pydantic models for SKUs and store-specific pricing.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from .enums import BirdType, InventoryType


# =============================================================================
# SKU MODELS
# =============================================================================

class SKUBase(BaseModel):
    """Base SKU model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    bird_type: BirdType
    inventory_type: InventoryType
    unit: str = Field(default="kg", max_length=20)
    is_active: bool = True


class SKUCreate(SKUBase):
    """Model for creating a new SKU"""
    pass


class SKUUpdate(BaseModel):
    """Model for updating SKU details"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class SKU(SKUBase):
    """Complete SKU model with all fields"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# STORE PRICING MODELS
# =============================================================================

class StorePriceBase(BaseModel):
    """Base store price model"""
    store_id: int
    sku_id: UUID
    price: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    effective_date: date

    @field_validator('price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class StorePriceCreate(StorePriceBase):
    """Model for creating a store price"""
    pass


class StorePriceBulkCreate(BaseModel):
    """Model for bulk price updates"""
    store_id: int
    effective_date: date
    prices: list[dict]  # [{"sku_id": UUID, "price": Decimal}, ...]


class StorePrice(StorePriceBase):
    """Complete store price model"""
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SKUWithPrice(BaseModel):
    """SKU with current price for a store"""
    id: UUID
    name: str
    code: str
    bird_type: BirdType
    inventory_type: InventoryType
    unit: str
    is_active: bool
    current_price: Optional[Decimal] = None
    effective_date: Optional[date] = None

    class Config:
        from_attributes = True


class StorePriceListResponse(BaseModel):
    """Response model for store prices with SKU details"""
    store_id: int
    store_name: str
    date: date
    items: list[SKUWithPrice]
