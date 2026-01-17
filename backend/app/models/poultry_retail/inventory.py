"""
Inventory Models for PoultryRetail-Core
=======================================
Pydantic models for inventory ledger, stock, wastage, and processing.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from .enums import BirdType, InventoryType


# =============================================================================
# INVENTORY LEDGER MODELS
# =============================================================================

class InventoryLedgerEntry(BaseModel):
    """Inventory ledger entry (append-only record)"""
    id: UUID
    store_id: int
    bird_type: BirdType
    inventory_type: InventoryType
    quantity_change: Decimal  # Positive = credit, Negative = debit
    bird_count_change: int = 0
    reason_code: str
    new_quantity: Optional[Decimal] = None
    sku_name: Optional[str] = None
    sku_id: Optional[UUID] = None
    ref_id: Optional[UUID] = None
    ref_type: Optional[str] = None
    user_id: UUID
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryLedgerCreate(BaseModel):
    """Model for creating inventory adjustments (admin only)"""
    store_id: int
    bird_type: BirdType
    inventory_type: InventoryType
    quantity_change: Optional[Decimal] = Field(None, max_digits=10, decimal_places=3)
    bird_count_change: Optional[int] = 0
    absolute_quantity: Optional[Decimal] = Field(None, max_digits=10, decimal_places=3)
    absolute_bird_count: Optional[int] = Field(None, ge=0)
    reason_code: str
    notes: Optional[str] = None

    @field_validator('quantity_change', 'absolute_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None and v != "":
            return Decimal(str(v))
        return None


# =============================================================================
# CURRENT STOCK MODELS
# =============================================================================

class CurrentStock(BaseModel):
    """Current stock level for a specific inventory type"""
    store_id: int
    bird_type: BirdType
    inventory_type: InventoryType
    current_qty: Decimal
    current_bird_count: int = 0
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockByType(BaseModel):
    """Stock breakdown by inventory type with optional bird counts"""
    LIVE: Decimal = Decimal("0.000")
    LIVE_COUNT: int = 0
    SKIN: Decimal = Decimal("0.000")
    SKINLESS: Decimal = Decimal("0.000")

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }

    @classmethod
    @field_validator('LIVE', 'SKIN', 'SKINLESS', mode='before')
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class StockSummary(BaseModel):
    """Complete stock summary for a store"""
    store_id: int
    BROILER: StockByType = StockByType()
    PARENT_CULL: StockByType = StockByType()
    as_of: datetime


# =============================================================================
# WASTAGE CONFIG MODELS
# =============================================================================

class WastageConfigBase(BaseModel):
    """Base wastage config model"""
    bird_type: BirdType
    target_inventory_type: InventoryType
    percentage: Decimal = Field(..., ge=0, le=100, max_digits=5, decimal_places=2)
    effective_date: date
    is_active: bool = True

    @field_validator('percentage', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class WastageConfigCreate(WastageConfigBase):
    """Model for creating a new wastage config"""
    pass


class WastageConfig(WastageConfigBase):
    """Complete wastage config model"""
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# PROCESSING MODELS
# =============================================================================

class ProcessingCalculation(BaseModel):
    """Result of processing yield calculation"""
    input_weight: Decimal
    wastage_percentage: Decimal
    wastage_weight: Decimal
    output_weight: Decimal


class ProcessingEntryCreate(BaseModel):
    """Model for creating a processing entry"""
    store_id: int
    processing_date: date = Field(default_factory=date.today)
    input_bird_type: BirdType
    output_inventory_type: InventoryType
    input_weight: Decimal = Field(..., gt=0, max_digits=10, decimal_places=3)
    input_bird_count: Optional[int] = Field(None, gt=0)
    actual_output_weight: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=3)
    idempotency_key: Optional[UUID] = None

    @field_validator('input_weight', 'actual_output_weight', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v

    @field_validator('output_inventory_type')
    @classmethod
    def output_not_live(cls, v):
        if v == InventoryType.LIVE:
            raise ValueError("Output inventory type cannot be LIVE")
        return v


class ProcessingEntry(BaseModel):
    """Complete processing entry model"""
    id: UUID
    store_id: int
    processing_date: date
    input_bird_type: BirdType
    input_bird_count: Optional[int] = None
    output_inventory_type: InventoryType
    input_weight: Decimal
    wastage_percentage: Decimal
    wastage_weight: Decimal
    output_weight: Decimal
    actual_output_weight: Optional[Decimal] = None
    idempotency_key: Optional[UUID] = None
    processed_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessingListResponse(BaseModel):
    """Response model for processing entry list"""
    items: list[ProcessingEntry]
    total: int
    page: int
    page_size: int
