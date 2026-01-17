"""
PoultryRetail-Core API Routers
==============================
FastAPI routers for the poultry retail management system.
"""

from fastapi import APIRouter

from .suppliers import router as suppliers_router
from .purchases import router as purchases_router
from .inventory import router as inventory_router
from .processing import router as processing_router
from .skus import router as skus_router
from .sales import router as sales_router
from .settlements import router as settlements_router
from .variance import router as variance_router
from .staff_points import router as staff_points_router
from .inventory_unified import router as inventory_unified_router
from .grading import router as grading_router
from .customers import router as customers_router
from .receipts import router as receipts_router
from .payments import router as payments_router
from .ledger import router as ledger_router
from .scheduled_tasks import router as scheduled_tasks_router
from .expenses import router as expenses_router
from .transfers import router as transfers_router

# Create main router
router = APIRouter(prefix="/poultry", tags=["Poultry Retail"])

# Include all sub-routers
router.include_router(suppliers_router)
router.include_router(purchases_router)
router.include_router(inventory_router)
router.include_router(processing_router)
router.include_router(skus_router)
router.include_router(sales_router)
router.include_router(settlements_router)
router.include_router(variance_router)
router.include_router(staff_points_router)
router.include_router(inventory_unified_router)
router.include_router(grading_router)
router.include_router(customers_router)
router.include_router(receipts_router)
router.include_router(payments_router)
router.include_router(ledger_router)
router.include_router(scheduled_tasks_router)
router.include_router(expenses_router)
router.include_router(transfers_router)


__all__ = ["router"]

