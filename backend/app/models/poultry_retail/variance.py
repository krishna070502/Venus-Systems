"""
Variance Models for PoultryRetail-Core
======================================
Pydantic models for variance logs and approval workflow.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from .enums import BirdType, InventoryType, VarianceType, VarianceLogStatus


class VarianceLog(BaseModel):
    """Variance log entry from settlement"""
    id: UUID
    settlement_id: UUID
    bird_type: BirdType
    inventory_type: InventoryType
    variance_type: VarianceType
    expected_weight: Decimal
    declared_weight: Decimal
    variance_weight: Decimal  # Absolute value
    status: VarianceLogStatus
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None
    ledger_entry_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VarianceLogWithDetails(VarianceLog):
    """Variance log with settlement and store details"""
    store_id: int
    store_name: str
    settlement_date: datetime
    submitted_by_name: Optional[str] = None
    resolved_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class VarianceApproval(BaseModel):
    """Model for approving positive variance"""
    notes: Optional[str] = None


class VarianceDeduction(BaseModel):
    """Model for deducting negative variance"""
    confirm: bool = Field(..., description="Must be True to confirm deduction")
    notes: Optional[str] = None


class VarianceListResponse(BaseModel):
    """Response model for variance list"""
    items: list[VarianceLogWithDetails]
    total: int
    pending_count: int
