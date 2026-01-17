"""
Stock Transfer Models for PoultryRetail-Core
=============================================
Pydantic models for inter-store stock transfers.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum


class TransferStatus(str, Enum):
    """Transfer workflow statuses."""
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class StockTransferCreate(BaseModel):
    """Model for creating a new stock transfer."""
    from_store_id: int = Field(..., description="Source store ID")
    to_store_id: int = Field(..., description="Destination store ID")
    bird_type: str = Field(..., description="BROILER or PARENT_CULL")
    inventory_type: str = Field(..., description="LIVE, SKIN, or SKINLESS")
    weight_kg: Decimal = Field(..., gt=0, description="Weight in kg")
    bird_count: Optional[int] = Field(default=0, ge=0, description="Number of birds (for LIVE)")
    transfer_date: Optional[date] = Field(default=None, description="Transfer date (default: today)")
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator('weight_kg', mode='before')
    @classmethod
    def convert_weight(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v

    @field_validator('bird_type')
    @classmethod
    def validate_bird_type(cls, v):
        if v not in ['BROILER', 'PARENT_CULL']:
            raise ValueError('bird_type must be BROILER or PARENT_CULL')
        return v

    @field_validator('inventory_type')
    @classmethod
    def validate_inventory_type(cls, v):
        if v not in ['LIVE', 'SKIN', 'SKINLESS']:
            raise ValueError('inventory_type must be LIVE, SKIN, or SKINLESS')
        return v


class StockTransfer(BaseModel):
    """Complete stock transfer model."""
    id: UUID
    from_store_id: int
    to_store_id: int
    bird_type: str
    inventory_type: str
    weight_kg: Decimal
    bird_count: int = 0
    transfer_date: date
    status: TransferStatus
    initiated_by: Optional[UUID] = None
    received_by: Optional[UUID] = None
    approved_by: Optional[UUID] = None
    received_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    @field_validator('weight_kg', mode='before')
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class StockTransferWithStores(StockTransfer):
    """Stock transfer with store names for display."""
    from_store_name: Optional[str] = None
    to_store_name: Optional[str] = None
    initiated_by_name: Optional[str] = None
    received_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransferReceive(BaseModel):
    """Model for receiving a transfer."""
    pass  # No additional data needed


class TransferApprove(BaseModel):
    """Model for approving a transfer."""
    pass  # No additional data needed


class TransferReject(BaseModel):
    """Model for rejecting a transfer."""
    rejection_reason: Optional[str] = Field(default=None, max_length=500)
