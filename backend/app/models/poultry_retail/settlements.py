"""
Settlement Models for PoultryRetail-Core
========================================
Pydantic models for daily settlements and variance detection.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from .enums import SettlementStatus, BirdType, InventoryType


# =============================================================================
# DECLARED STOCK MODELS
# =============================================================================

class InventoryTypeStock(BaseModel):
    """Stock declaration for a single inventory type"""
    LIVE: Decimal = Field(default=Decimal("0.000"), ge=0)
    LIVE_COUNT: int = Field(default=0, ge=0)
    SKIN: Decimal = Field(default=Decimal("0.000"), ge=0)
    SKINLESS: Decimal = Field(default=Decimal("0.000"), ge=0)

    @field_validator('LIVE', 'SKIN', 'SKINLESS', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return Decimal("0.000")


class DeclaredStock(BaseModel):
    """Complete physical stock declaration"""
    BROILER: InventoryTypeStock = InventoryTypeStock()
    PARENT_CULL: InventoryTypeStock = InventoryTypeStock()


# =============================================================================
# VARIANCE MODELS (within settlement context)
# =============================================================================

class VarianceDetail(BaseModel):
    """Variance detail for a single inventory type"""
    expected: Decimal
    declared: Decimal
    variance: Decimal
    type: str  # "POSITIVE", "NEGATIVE", or "ZERO"


class VarianceByType(BaseModel):
    """Variance breakdown by inventory type"""
    LIVE: Optional[VarianceDetail] = None
    SKIN: Optional[VarianceDetail] = None
    SKINLESS: Optional[VarianceDetail] = None


class CalculatedVariance(BaseModel):
    """Complete calculated variance"""
    BROILER: VarianceByType = VarianceByType()
    PARENT_CULL: VarianceByType = VarianceByType()


# =============================================================================
# SETTLEMENT MODELS
# =============================================================================

class SettlementCreate(BaseModel):
    """Model for creating a settlement draft"""
    store_id: int
    settlement_date: date = Field(default_factory=date.today)


class SettlementSubmit(BaseModel):
    """Model for submitting a settlement with declarations"""
    declared_cash: Decimal = Field(default=Decimal("0.00"), ge=0)
    declared_upi: Decimal = Field(default=Decimal("0.00"), ge=0)
    declared_card: Decimal = Field(default=Decimal("0.00"), ge=0)
    declared_bank: Decimal = Field(default=Decimal("0.00"), ge=0)
    declared_stock: DeclaredStock
    expense_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    expense_notes: Optional[str] = None
    expense_receipts: Optional[List[str]] = Field(default=None, description="List of storage URLs for uploaded receipts")
    settlement_date: Optional[date] = None

    @field_validator('declared_cash', 'declared_upi', 'declared_card', 
                     'declared_bank', 'expense_amount', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return Decimal("0.00")


class Settlement(BaseModel):
    """Complete settlement model"""
    id: UUID
    store_id: int
    settlement_date: date
    
    # Declared amounts
    declared_cash: Decimal
    declared_upi: Decimal
    declared_card: Decimal
    declared_bank: Decimal
    
    # Stock declarations (JSON in DB)
    declared_stock: Dict[str, Any]
    
    # Expected values (calculated)
    expected_sales: Dict[str, Any]
    expected_stock: Dict[str, Any]
    
    # Variance
    calculated_variance: Dict[str, Any]
    
    # Expenses
    expense_amount: Decimal
    expense_notes: Optional[str] = None
    expense_receipts: Optional[List[str]] = None
    
    # Status
    status: SettlementStatus
    
    # Audit trail
    submitted_by: Optional[UUID] = None
    submitted_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SettlementWithVariance(Settlement):
    """Settlement with parsed variance data"""
    variance_count: int = 0
    positive_variance_count: int = 0
    negative_variance_count: int = 0
    has_pending_variances: bool = False

    class Config:
        from_attributes = True


class SettlementListResponse(BaseModel):
    """Response model for settlement list"""
    items: list[Settlement]
    total: int
    page: int
    page_size: int
