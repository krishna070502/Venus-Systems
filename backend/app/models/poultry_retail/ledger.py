"""
Financial Ledger Models for PoultryRetail-Core
==============================================
Pydantic models for the customer and supplier financial ledger.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class FinancialLedgerEntry(BaseModel):
    """Financial ledger entry (Double-entry transaction)"""
    id: UUID
    store_id: Optional[int] = None
    entity_type: str  # 'CUSTOMER' or 'SUPPLIER'
    entity_id: UUID
    transaction_type: str  # 'SALE', 'RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT'
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    ref_table: Optional[str] = None
    ref_id: Optional[UUID] = None
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerSummary(BaseModel):
    """Calculated summary of ledger for an entity"""
    entity_id: UUID
    entity_type: str
    total_debit: Decimal
    total_credit: Decimal
    outstanding: Decimal
