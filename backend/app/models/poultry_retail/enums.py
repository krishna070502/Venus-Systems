"""
Enums and Constants for PoultryRetail-Core
==========================================
Immutable system constants used across all modules.
"""

from enum import Enum


class BirdType(str, Enum):
    """Types of birds handled in the system"""
    BROILER = "BROILER"
    PARENT_CULL = "PARENT_CULL"


class InventoryType(str, Enum):
    """Types of inventory (processing states)"""
    LIVE = "LIVE"       # Live birds before processing
    SKIN = "SKIN"       # Processed with skin
    SKINLESS = "SKINLESS"  # Processed without skin


class VarianceType(str, Enum):
    """Types of variance detected in settlements"""
    POSITIVE = "POSITIVE"  # Physical > Expected (found stock)
    NEGATIVE = "NEGATIVE"  # Physical < Expected (lost stock)


class SettlementStatus(str, Enum):
    """Status workflow for daily settlements"""
    DRAFT = "DRAFT"       # Being prepared
    SUBMITTED = "SUBMITTED"  # Submitted for approval
    APPROVED = "APPROVED"   # Approved by manager
    LOCKED = "LOCKED"     # Finalized, no changes


class PaymentMethod(str, Enum):
    """Supported payment methods"""
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    BANK = "BANK"
    CREDIT = "CREDIT"


class StoreStatus(str, Enum):
    """Store operational status"""
    ACTIVE = "ACTIVE"       # Normal operations
    MAINTENANCE = "MAINTENANCE"  # No writes allowed (except admin)


class PurchaseStatus(str, Enum):
    """Status workflow for purchases"""
    DRAFT = "DRAFT"       # Being prepared
    COMMITTED = "COMMITTED"  # Committed to inventory
    CANCELLED = "CANCELLED"  # Cancelled


class SaleType(str, Enum):
    """Types of sales"""
    POS = "POS"    # Point of sale (retail)
    BULK = "BULK"  # Wholesale/bulk


class VarianceLogStatus(str, Enum):
    """Status for variance log resolution"""
    PENDING = "PENDING"   # Awaiting action
    APPROVED = "APPROVED"  # Positive variance approved
    DEDUCTED = "DEDUCTED"  # Negative variance deducted


class SupplierStatus(str, Enum):
    """Supplier status"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


# =============================================================================
# REASON CODES FOR INVENTORY LEDGER
# =============================================================================
REASON_CODES = {
    "PURCHASE_RECEIVED": {
        "description": "Live birds received from supplier",
        "direction": "CREDIT",
        "requires_ref": True
    },
    "PROCESSING_DEBIT": {
        "description": "Live birds consumed in processing",
        "direction": "DEBIT",
        "requires_ref": True
    },
    "PROCESSING_CREDIT": {
        "description": "Processed inventory created",
        "direction": "CREDIT",
        "requires_ref": True
    },
    "SALE_DEBIT": {
        "description": "Inventory sold to customer",
        "direction": "DEBIT",
        "requires_ref": True
    },
    "VARIANCE_POSITIVE": {
        "description": "Found stock (approved)",
        "direction": "CREDIT",
        "requires_ref": True
    },
    "VARIANCE_NEGATIVE": {
        "description": "Lost stock (deducted)",
        "direction": "DEBIT",
        "requires_ref": True
    },
    "WASTAGE": {
        "description": "Processing wastage (non-sellable)",
        "direction": "DEBIT",
        "requires_ref": True
    },
    "ADJUSTMENT_CREDIT": {
        "description": "Manual admin adjustment (increase)",
        "direction": "CREDIT",
        "requires_ref": False
    },
    "ADJUSTMENT_DEBIT": {
        "description": "Manual admin adjustment (decrease)",
        "direction": "DEBIT",
        "requires_ref": False
    },
    "OPENING_BALANCE": {
        "description": "Opening stock balance",
        "direction": "CREDIT",
        "requires_ref": False
    }
}


# =============================================================================
# STAFF POINTS CONFIGURATION KEYS
# =============================================================================
STAFF_POINTS_CONFIG_KEYS = {
    "ZERO_VARIANCE_BONUS": "Points awarded for perfect zero variance settlement",
    "POSITIVE_VARIANCE_BONUS": "Points awarded for verified positive variance",
    "NEGATIVE_VARIANCE_PENALTY_PER_KG": "Points deducted per kg of negative variance",
    "NEGATIVE_VARIANCE_PENALTY_BASE": "Base penalty for any negative variance",
    "CONSECUTIVE_ZERO_BONUS": "Bonus for 5+ consecutive zero variance days",
    "MONTHLY_BONUS_THRESHOLD": "Points needed for monthly bonus eligibility"
}
