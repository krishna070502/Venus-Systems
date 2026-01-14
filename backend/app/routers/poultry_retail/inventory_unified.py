"""
Unified Inventory Router for PoultryRetail-Core
===============================================
This router provides backward compatibility for the deprecated inventory_items
endpoints while redirecting to the new SKUs-based system.

MIGRATION GUIDE:
- OLD: /api/v1/business-management/inventory → use /api/v1/poultry/skus
- OLD: /api/v1/business-management/prices/daily → use /api/v1/poultry/skus/prices/store
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from typing import Optional, List
from datetime import date
from decimal import Decimal
from uuid import UUID
import warnings

from app.dependencies.rbac import require_permission
from app.models.poultry_retail.skus import SKU, SKUWithPrice
from app.models.poultry_retail.enums import BirdType, InventoryType

router = APIRouter(prefix="/inventory-unified", tags=["Inventory (Unified)"])


# =============================================================================
# LEGACY COMPATIBILITY LAYER
# =============================================================================

class LegacyInventoryItem:
    """Adapter to convert SKU to legacy inventory_item format"""
    
    @staticmethod
    def from_sku(sku: dict, legacy_id: Optional[int] = None) -> dict:
        """Convert a SKU record to legacy inventory_item format"""
        return {
            "id": legacy_id or hash(sku["id"]) % 100000,  # Generate pseudo-ID
            "name": sku["name"],
            "sku": sku["code"],
            "category": f"{sku['bird_type']}-{sku['inventory_type']}",
            "base_price": Decimal("0.00"),  # Base price now in store_prices
            "unit": sku["unit"],
            "is_active": sku["is_active"],
            "item_type": "sale",  # All SKUs are sale items in new system
            "created_at": sku["created_at"],
            "updated_at": sku["updated_at"],
            # New fields (extended)
            "sku_id": sku["id"],
            "bird_type": sku["bird_type"],
            "inventory_type": sku["inventory_type"]
        }


@router.get("/items", deprecated=True)
async def get_legacy_inventory_items(
    is_active: Optional[bool] = Query(None),
    category: Optional[str] = Query(None),
    item_type: Optional[str] = Query(None),
    bird_type: Optional[BirdType] = Query(None),
    inventory_type: Optional[InventoryType] = Query(None),
    current_user: dict = Depends(require_permission(["inventoryitems.read"]))
):
    """
    DEPRECATED: Use /api/v1/poultry/skus instead.
    
    Get all inventory items (legacy format with SKU mapping).
    """
    from app.config.database import get_supabase
    
    warnings.warn(
        "This endpoint is deprecated. Migrate to /api/v1/poultry/skus",
        DeprecationWarning
    )
    
    supabase = get_supabase()
    
    # Query the new SKUs table
    query = supabase.table("skus").select("*")
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    if bird_type:
        query = query.eq("bird_type", bird_type.value)
    
    if inventory_type:
        query = query.eq("inventory_type", inventory_type.value)
    
    result = query.order("name").execute()
    
    # Convert to legacy format
    items = [LegacyInventoryItem.from_sku(sku) for sku in result.data]
    
    # Apply category filter if provided (maps to bird_type-inventory_type)
    if category:
        items = [i for i in items if category.lower() in i["category"].lower()]
    
    return items


@router.get("/items/by-sku/{sku_code}")
async def get_item_by_sku_code(
    sku_code: str,
    current_user: dict = Depends(require_permission(["inventoryitems.read"]))
):
    """Get inventory item by SKU code (unified lookup)"""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # First try the new skus table
    result = supabase.table("skus").select("*").eq("code", sku_code).execute()
    
    if result.data:
        return {
            "source": "skus",
            "data": result.data[0]
        }
    
    # Fall back to legacy inventory_items
    legacy = supabase.table("inventory_items").select("*").eq("sku", sku_code).execute()
    
    if legacy.data:
        return {
            "source": "inventory_items (legacy)",
            "data": legacy.data[0],
            "warning": "This item exists in the legacy system. Consider migrating to SKUs."
        }
    
    raise HTTPException(status_code=404, detail="Item not found in either system")


@router.get("/prices/unified")
async def get_unified_prices(
    store_id: int = Query(..., alias="shop_id"),
    price_date: date = Query(default=None, alias="date"),
    current_user: dict = Depends(require_permission(["priceconfig.read"]))
):
    """
    Get unified prices for a store (works with both old and new systems).
    
    Returns prices from store_prices with fallback to daily_shop_prices.
    """
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    target_date = price_date or date.today()
    
    # Get store info
    store = supabase.table("shops").select("id, name").eq("id", store_id).execute()
    if not store.data:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get all active SKUs with current prices
    skus = supabase.table("skus").select("*").eq("is_active", True).execute()
    
    items = []
    for sku in skus.data:
        # Get price from new system
        price_result = supabase.rpc("get_current_price", {
            "p_store_id": store_id,
            "p_sku_id": sku["id"],
            "p_date": target_date.isoformat()
        }).execute()
        
        current_price = price_result.data if price_result.data else None
        
        items.append({
            "sku_id": sku["id"],
            "sku_code": sku["code"],
            "name": sku["name"],
            "bird_type": sku["bird_type"],
            "inventory_type": sku["inventory_type"],
            "unit": sku["unit"],
            "current_price": current_price,
            "has_price": current_price is not None
        })
    
    return {
        "store_id": store_id,
        "store_name": store.data[0]["name"],
        "date": target_date,
        "items": items,
        "items_with_prices": sum(1 for i in items if i["has_price"]),
        "items_without_prices": sum(1 for i in items if not i["has_price"])
    }


@router.get("/migration-status")
async def get_migration_status(
    current_user: dict = Depends(require_permission(["system.admin"]))
):
    """Check the status of inventory_items → skus migration"""
    from app.config.database import get_supabase
    
    supabase = get_supabase()
    
    # Count legacy items
    legacy_count = supabase.table("inventory_items").select("id", count="exact").execute()
    
    # Count mapped items
    mapped_count = supabase.table("inventory_items_sku_mapping").select(
        "inventory_item_id", count="exact"
    ).execute()
    
    # Count new SKUs
    sku_count = supabase.table("skus").select("id", count="exact").execute()
    
    # Check for unmapped items
    unmapped = supabase.rpc("sql", {
        "query": """
            SELECT ii.id, ii.name, ii.sku 
            FROM inventory_items ii 
            WHERE NOT EXISTS (
                SELECT 1 FROM inventory_items_sku_mapping m 
                WHERE m.inventory_item_id = ii.id
            )
            LIMIT 20
        """
    }).execute()
    
    return {
        "legacy_inventory_items": legacy_count.count or 0,
        "mapped_to_skus": mapped_count.count or 0,
        "new_skus": sku_count.count or 0,
        "unmapped_items": unmapped.data if unmapped.data else [],
        "migration_complete": (mapped_count.count or 0) >= (legacy_count.count or 0),
        "recommendation": "Use /api/v1/poultry/skus for all new development"
    }
