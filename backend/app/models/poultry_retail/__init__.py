"""
PoultryRetail-Core Module
=========================
Complete poultry retail management system with:
- Double-entry inventory ledger
- Processing yield calculations
- Sales and POS
- Daily settlements with variance detection
- Staff accountability and points system
"""

from .enums import (
    BirdType,
    InventoryType,
    VarianceType,
    SettlementStatus,
    PaymentMethod,
    StoreStatus,
    PurchaseStatus,
    SaleType,
    VarianceLogStatus,
    SupplierStatus,
    REASON_CODES
)

from .suppliers import (
    SupplierBase,
    SupplierCreate,
    SupplierUpdate,
    Supplier
)

from .purchases import (
    PurchaseBase,
    PurchaseCreate,
    PurchaseCommit,
    Purchase,
    PurchaseWithSupplier
)

from .inventory import (
    InventoryLedgerEntry,
    CurrentStock,
    StockSummary,
    WastageConfig,
    WastageConfigCreate,
    ProcessingEntryCreate,
    ProcessingEntry,
    ProcessingCalculation
)

from .skus import (
    SKUBase,
    SKUCreate,
    SKUUpdate,
    SKU,
    StorePriceCreate,
    StorePrice,
    SKUWithPrice
)

from .sales import (
    SaleItemCreate,
    SaleCreate,
    SaleItem,
    Sale,
    SaleWithItems
)

from .settlements import (
    DeclaredStock,
    SettlementCreate,
    SettlementSubmit,
    Settlement,
    SettlementWithVariance
)

from .variance import (
    VarianceLog,
    VarianceApproval
)

from .staff_points import (
    StaffPointEntry,
    StaffPointSummary,
    StaffPointsConfig
)

__all__ = [
    # Enums
    "BirdType",
    "InventoryType",
    "VarianceType",
    "SettlementStatus",
    "PaymentMethod",
    "StoreStatus",
    "PurchaseStatus",
    "SaleType",
    "VarianceLogStatus",
    "SupplierStatus",
    "REASON_CODES",
    # Suppliers
    "SupplierBase",
    "SupplierCreate",
    "SupplierUpdate",
    "Supplier",
    # Purchases
    "PurchaseBase",
    "PurchaseCreate",
    "PurchaseCommit",
    "Purchase",
    "PurchaseWithSupplier",
    # Inventory
    "InventoryLedgerEntry",
    "CurrentStock",
    "StockSummary",
    "WastageConfig",
    "WastageConfigCreate",
    "ProcessingEntryCreate",
    "ProcessingEntry",
    "ProcessingCalculation",
    # SKUs
    "SKUBase",
    "SKUCreate",
    "SKUUpdate",
    "SKU",
    "StorePriceCreate",
    "StorePrice",
    "SKUWithPrice",
    # Sales
    "SaleItemCreate",
    "SaleCreate",
    "SaleItem",
    "Sale",
    "SaleWithItems",
    # Settlements
    "DeclaredStock",
    "SettlementCreate",
    "SettlementSubmit",
    "Settlement",
    "SettlementWithVariance",
    # Variance
    "VarianceLog",
    "VarianceApproval",
    # Staff Points
    "StaffPointEntry",
    "StaffPointSummary",
    "StaffPointsConfig",
]
