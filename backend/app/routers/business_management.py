"""
Business Management Router
==========================
API endpoints for Business Management module including:
- Shop Management (CRUD)
- Manager Onboarding
- Daily Price Configuration
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional
from datetime import date
from decimal import Decimal
import logging

from app.services.supabase_client import supabase_client
from app.dependencies.rbac import require_permission, require_admin
from app.dependencies.auth import get_current_user
from app.services.role_service import RoleService
from app.models.business_management import (
    Shop, ShopCreate, ShopUpdate,
    ManagerWithProfile, ManagerOnboardRequest, UnassignedManager,
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    DailyPricesResponse, DailyPriceWithItem, BulkPriceUpdateRequest, BulkPriceUpdateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def is_user_admin(user_id: str) -> bool:
    """Check if user has Admin role"""
    role_service = RoleService()
    user_roles = await role_service.get_user_roles(user_id)
    return any(role["name"] == "Admin" for role in user_roles)


async def get_user_shop_ids(user_id: str) -> List[int]:
    """Get list of shop IDs assigned to a user"""
    try:
        response = supabase_client.table("user_shops")\
            .select("shop_id")\
            .eq("user_id", user_id)\
            .execute()
        return [row["shop_id"] for row in response.data] if response.data else []
    except Exception as e:
        logger.error(f"Error getting user shops: {e}")
        return []


async def can_access_shop(user_id: str, shop_id: int) -> bool:
    """Check if user can access a specific shop"""
    # Admins can access all shops
    if await is_user_admin(user_id):
        return True
    
    # Check if user is assigned to the shop
    user_shop_ids = await get_user_shop_ids(user_id)
    return shop_id in user_shop_ids


# =============================================================================
# SHOP ENDPOINTS
# =============================================================================

@router.get(
    "/shops",
    response_model=List[Shop],
    dependencies=[Depends(require_permission(["shops.read"]))]
)
async def get_all_shops(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: Dict = Depends(get_current_user)
):
    """Get all shops. Admins see all, managers see only their assigned shops."""
    try:
        query = supabase_client.table("shops").select("*")
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        # If not admin, filter by user's assigned shops
        if not await is_user_admin(current_user["id"]):
            user_shop_ids = await get_user_shop_ids(current_user["id"])
            if not user_shop_ids:
                return []
            query = query.in_("id", user_shop_ids)
        
        response = query.order("name").execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching shops: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shops: {str(e)}"
        )


@router.get(
    "/shops/{shop_id}",
    response_model=Shop,
    dependencies=[Depends(require_permission(["shops.read"]))]
)
async def get_shop_by_id(
    shop_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific shop by ID"""
    try:
        # Check access
        if not await can_access_shop(current_user["id"], shop_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this shop"
            )
        
        response = supabase_client.table("shops")\
            .select("*")\
            .eq("id", shop_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shop {shop_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shop: {str(e)}"
        )


@router.post(
    "/shops",
    response_model=Shop,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(["shops.write"]))]
)
async def create_shop(
    shop: ShopCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new shop (Admin only)"""
    from app.services.audit_service import audit_logger
    
    try:
        response = supabase_client.table("shops")\
            .insert(shop.model_dump())\
            .execute()
        
        if response.data:
            await audit_logger.log_action(
                user_id=current_user["id"],
                action="CREATE_SHOP",
                resource_type="shop",
                resource_id=str(response.data[0]["id"]),
                changes=shop.model_dump(),
                metadata={"shop_name": shop.name}
            )
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create shop"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating shop: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create shop: {str(e)}"
        )


@router.put(
    "/shops/{shop_id}",
    response_model=Shop,
    dependencies=[Depends(require_permission(["shops.update"]))]
)
async def update_shop(
    shop_id: int,
    shop: ShopUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a shop"""
    from app.services.audit_service import audit_logger
    
    try:
        # Get existing shop
        existing = supabase_client.table("shops")\
            .select("*")\
            .eq("id", shop_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        # Filter out None values
        update_data = {k: v for k, v in shop.model_dump().items() if v is not None}
        
        if not update_data:
            return existing.data
        
        response = supabase_client.table("shops")\
            .update(update_data)\
            .eq("id", shop_id)\
            .execute()
        
        if response.data:
            await audit_logger.log_action(
                user_id=current_user["id"],
                action="UPDATE_SHOP",
                resource_type="shop",
                resource_id=str(shop_id),
                changes=update_data,
                metadata={"shop_name": existing.data.get("name")}
            )
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update shop"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shop {shop_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update shop: {str(e)}"
        )


@router.delete(
    "/shops/{shop_id}",
    dependencies=[Depends(require_permission(["shops.delete"]))]
)
async def delete_shop(
    shop_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a shop"""
    from app.services.audit_service import audit_logger
    
    try:
        # Get existing shop
        existing = supabase_client.table("shops")\
            .select("name")\
            .eq("id", shop_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        supabase_client.table("shops")\
            .delete()\
            .eq("id", shop_id)\
            .execute()
        
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="DELETE_SHOP",
            resource_type="shop",
            resource_id=str(shop_id),
            metadata={"shop_name": existing.data.get("name")}
        )
        
        return {"message": "Shop deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shop {shop_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete shop: {str(e)}"
        )


# =============================================================================
# MANAGER ENDPOINTS
# =============================================================================

@router.get(
    "/managers",
    response_model=List[ManagerWithProfile],
    dependencies=[Depends(require_permission(["managers.read"]))]
)
async def get_all_managers(
    current_user: Dict = Depends(get_current_user)
):
    """Get all onboarded managers with their shop assignments"""
    try:
        # Get manager details with user profiles
        manager_response = supabase_client.table("manager_details")\
            .select("*")\
            .execute()
        
        if not manager_response.data:
            return []
        
        managers = []
        for manager in manager_response.data:
            # Get user profile
            profile_response = supabase_client.table("profiles")\
                .select("email, full_name")\
                .eq("id", manager["user_id"])\
                .single()\
                .execute()
            
            # Get shop assignment
            shop_response = supabase_client.table("user_shops")\
                .select("shop_id, shops(id, name, location)")\
                .eq("user_id", manager["user_id"])\
                .execute()
            
            shop_data = shop_response.data[0] if shop_response.data else None
            shop_info = shop_data.get("shops") if shop_data else None
            
            managers.append({
                "user_id": manager["user_id"],
                "email": profile_response.data.get("email") if profile_response.data else None,
                "full_name": profile_response.data.get("full_name") if profile_response.data else None,
                "qualifications": manager.get("qualifications"),
                "contact_number": manager.get("contact_number"),
                "shop_id": shop_info.get("id") if shop_info else None,
                "shop_name": shop_info.get("name") if shop_info else None,
                "shop_location": shop_info.get("location") if shop_info else None,
                "created_at": manager.get("created_at")
            })
        
        return managers
    except Exception as e:
        logger.error(f"Error fetching managers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch managers: {str(e)}"
        )


@router.get(
    "/managers/unassigned",
    response_model=List[UnassignedManager],
    dependencies=[Depends(require_permission(["managers.onboard"]))]
)
async def get_unassigned_managers():
    """Get users with 'Store Manager' role who are not yet onboarded"""
    try:
        # Get Store Manager role ID
        role_response = supabase_client.table("roles")\
            .select("id")\
            .eq("name", "Store Manager")\
            .single()\
            .execute()
        
        if not role_response.data:
            return []
        
        store_manager_role_id = role_response.data["id"]
        
        # Get users with Store Manager role
        user_roles_response = supabase_client.table("user_roles")\
            .select("user_id")\
            .eq("role_id", store_manager_role_id)\
            .execute()
        
        if not user_roles_response.data:
            return []
        
        store_manager_user_ids = [ur["user_id"] for ur in user_roles_response.data]
        
        # Get already onboarded managers
        onboarded_response = supabase_client.table("manager_details")\
            .select("user_id")\
            .execute()
        
        onboarded_user_ids = [m["user_id"] for m in onboarded_response.data] if onboarded_response.data else []
        
        # Filter to get unassigned managers
        unassigned_user_ids = [uid for uid in store_manager_user_ids if uid not in onboarded_user_ids]
        
        if not unassigned_user_ids:
            return []
        
        # Get user profiles for unassigned managers
        unassigned_managers = []
        for user_id in unassigned_user_ids:
            profile_response = supabase_client.table("profiles")\
                .select("id, email, full_name")\
                .eq("id", user_id)\
                .single()\
                .execute()
            
            if profile_response.data:
                unassigned_managers.append({
                    "user_id": profile_response.data["id"],
                    "email": profile_response.data["email"],
                    "full_name": profile_response.data.get("full_name")
                })
        
        return unassigned_managers
    except Exception as e:
        logger.error(f"Error fetching unassigned managers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unassigned managers: {str(e)}"
        )


@router.post(
    "/managers/onboard",
    response_model=ManagerWithProfile,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(["managers.onboard"]))]
)
async def onboard_manager(
    request: ManagerOnboardRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Onboard a manager by creating manager_details and user_shops records.
    This is an atomic transaction - both records must succeed.
    """
    from app.services.audit_service import audit_logger
    
    try:
        # Verify user exists
        profile_response = supabase_client.table("profiles")\
            .select("id, email, full_name")\
            .eq("id", request.user_id)\
            .single()\
            .execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify shop exists
        shop_response = supabase_client.table("shops")\
            .select("id, name, location")\
            .eq("id", request.shop_id)\
            .single()\
            .execute()
        
        if not shop_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        # Check if manager already onboarded
        existing = supabase_client.table("manager_details")\
            .select("user_id")\
            .eq("user_id", request.user_id)\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manager is already onboarded"
            )
        
        # Step 1: Create manager_details record
        manager_data = {
            "user_id": request.user_id,
            "qualifications": request.qualifications,
            "contact_number": request.contact_number
        }
        
        manager_response = supabase_client.table("manager_details")\
            .insert(manager_data)\
            .execute()
        
        if not manager_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create manager details"
            )
        
        # Step 2: Create user_shops record
        user_shop_data = {
            "user_id": request.user_id,
            "shop_id": request.shop_id
        }
        
        try:
            user_shop_response = supabase_client.table("user_shops")\
                .insert(user_shop_data)\
                .execute()
            
            if not user_shop_response.data:
                # Rollback manager_details
                supabase_client.table("manager_details")\
                    .delete()\
                    .eq("user_id", request.user_id)\
                    .execute()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to assign shop to manager"
                )
        except Exception as shop_error:
            # Rollback manager_details
            supabase_client.table("manager_details")\
                .delete()\
                .eq("user_id", request.user_id)\
                .execute()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to assign shop to manager: {str(shop_error)}"
            )
        
        # Log the action
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="ONBOARD_MANAGER",
            resource_type="manager",
            resource_id=request.user_id,
            changes={
                "shop_id": request.shop_id,
                "qualifications": request.qualifications,
                "contact_number": request.contact_number
            },
            metadata={
                "manager_email": profile_response.data.get("email"),
                "shop_name": shop_response.data.get("name")
            }
        )
        
        return {
            "user_id": request.user_id,
            "email": profile_response.data.get("email"),
            "full_name": profile_response.data.get("full_name"),
            "qualifications": request.qualifications,
            "contact_number": request.contact_number,
            "shop_id": request.shop_id,
            "shop_name": shop_response.data.get("name"),
            "shop_location": shop_response.data.get("location"),
            "created_at": manager_response.data[0].get("created_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error onboarding manager: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to onboard manager: {str(e)}"
        )


@router.delete(
    "/managers/{user_id}",
    dependencies=[Depends(require_permission(["managers.delete"]))]
)
async def remove_manager(
    user_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Remove a manager (deletes manager_details and user_shops records)"""
    from app.services.audit_service import audit_logger
    
    try:
        # Verify manager exists
        existing = supabase_client.table("manager_details")\
            .select("*")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found"
            )
        
        # Get user profile for logging
        profile = supabase_client.table("profiles")\
            .select("email")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        # Delete user_shops first (due to potential foreign key)
        supabase_client.table("user_shops")\
            .delete()\
            .eq("user_id", user_id)\
            .execute()
        
        # Delete manager_details
        supabase_client.table("manager_details")\
            .delete()\
            .eq("user_id", user_id)\
            .execute()
        
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="REMOVE_MANAGER",
            resource_type="manager",
            resource_id=user_id,
            metadata={"manager_email": profile.data.get("email") if profile.data else None}
        )
        
        return {"message": "Manager removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing manager {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove manager: {str(e)}"
        )


# =============================================================================
# INVENTORY ENDPOINTS
# =============================================================================

@router.get(
    "/inventory",
    response_model=List[InventoryItem],
    dependencies=[Depends(require_permission(["inventoryitems.read"]))]
)
async def get_all_inventory_items(
    is_active: Optional[bool] = Query(None),
    category: Optional[str] = Query(None),
    item_type: Optional[str] = Query(None, description="Filter by item type: purchase or sale")
):
    """Get all inventory items with optional filters"""
    try:
        query = supabase_client.table("inventory_items").select("*")
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        if category:
            query = query.eq("category", category)
        
        if item_type:
            query = query.eq("item_type", item_type)
        
        response = query.order("name").execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching inventory items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inventory items: {str(e)}"
        )


@router.post(
    "/inventory",
    response_model=InventoryItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(["inventoryitems.write"]))]
)
async def create_inventory_item(
    item: InventoryItemCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new inventory item (Admin only)"""
    try:
        item_data = item.model_dump()
        # Convert Decimal to float for JSON serialization
        if 'base_price' in item_data:
            item_data['base_price'] = float(item_data['base_price'])
        
        response = supabase_client.table("inventory_items")\
            .insert(item_data)\
            .execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create inventory item"
        )
    except Exception as e:
        logger.error(f"Error creating inventory item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create inventory item: {str(e)}"
        )


@router.get(
    "/inventory/{item_id}",
    response_model=InventoryItem,
    dependencies=[Depends(require_permission(["inventoryitems.read"]))]
)
async def get_inventory_item_by_id(item_id: int):
    """Get a specific inventory item by ID"""
    try:
        response = supabase_client.table("inventory_items")\
            .select("*")\
            .eq("id", item_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inventory item {item_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inventory item: {str(e)}"
        )


@router.put(
    "/inventory/{item_id}",
    response_model=InventoryItem,
    dependencies=[Depends(require_permission(["inventoryitems.update"]))]
)
async def update_inventory_item(
    item_id: int,
    item: InventoryItemUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update an existing inventory item"""
    try:
        # Check if item exists
        existing = supabase_client.table("inventory_items")\
            .select("id")\
            .eq("id", item_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        # Build update data (only include non-None fields)
        update_data = {k: v for k, v in item.model_dump().items() if v is not None}
        # Convert Decimal to float for JSON serialization
        if 'base_price' in update_data:
            update_data['base_price'] = float(update_data['base_price'])
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Convert Decimal to float for JSON serialization
        if "base_price" in update_data:
            update_data["base_price"] = float(update_data["base_price"])
        
        response = supabase_client.table("inventory_items")\
            .update(update_data)\
            .eq("id", item_id)\
            .execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update inventory item"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating inventory item {item_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update inventory item: {str(e)}"
        )


@router.delete(
    "/inventory/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(["inventoryitems.delete"]))]
)
async def delete_inventory_item(
    item_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Delete an inventory item"""
    try:
        # Check if item exists
        existing = supabase_client.table("inventory_items")\
            .select("id")\
            .eq("id", item_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        # Check if item has any daily prices (prevent deletion if in use)
        prices_check = supabase_client.table("daily_shop_prices")\
            .select("id")\
            .eq("item_id", item_id)\
            .limit(1)\
            .execute()
        
        if prices_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete item with existing price configurations. Deactivate it instead."
            )
        
        # Delete the item
        supabase_client.table("inventory_items")\
            .delete()\
            .eq("id", item_id)\
            .execute()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting inventory item {item_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete inventory item: {str(e)}"
        )


# =============================================================================
# PRICE CONFIGURATION ENDPOINTS
# =============================================================================

@router.get(
    "/prices/daily",
    response_model=DailyPricesResponse,
    dependencies=[Depends(require_permission(["priceconfig.read"]))]
)
async def get_daily_prices(
    shop_id: int = Query(..., description="Shop ID"),
    date: date = Query(..., description="Date for prices (YYYY-MM-DD)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get daily prices for a shop.
    Returns all items with their daily price (or base price if not set).
    Security: Non-admin users can only access their assigned shops.
    """
    try:
        # Security check: Verify user has access to this shop
        if not await can_access_shop(current_user["id"], shop_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this shop's prices"
            )
        
        # Get shop info
        shop_response = supabase_client.table("shops")\
            .select("id, name")\
            .eq("id", shop_id)\
            .single()\
            .execute()
        
        if not shop_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        # Get all active inventory items
        items_response = supabase_client.table("inventory_items")\
            .select("*")\
            .eq("is_active", True)\
            .order("name")\
            .execute()
        
        if not items_response.data:
            return {
                "shop_id": shop_id,
                "shop_name": shop_response.data["name"],
                "date": date,
                "items": []
            }
        
        # Get daily prices for this shop and date
        prices_response = supabase_client.table("daily_shop_prices")\
            .select("item_id, price")\
            .eq("shop_id", shop_id)\
            .eq("valid_date", date.isoformat())\
            .execute()
        
        # Create a map of item_id -> daily_price
        price_map = {}
        if prices_response.data:
            for p in prices_response.data:
                price_map[p["item_id"]] = Decimal(str(p["price"]))
        
        # Build response with all items
        items_with_prices = []
        for item in items_response.data:
            daily_price = price_map.get(item["id"])
            items_with_prices.append({
                "item_id": item["id"],
                "item_name": item["name"],
                "sku": item.get("sku"),
                "category": item.get("category"),
                "base_price": Decimal(str(item["base_price"])),
                "daily_price": daily_price,  # None if not set
                "unit": item.get("unit", "piece")
            })
        
        return {
            "shop_id": shop_id,
            "shop_name": shop_response.data["name"],
            "date": date,
            "items": items_with_prices
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching daily prices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch daily prices: {str(e)}"
        )


@router.post(
    "/prices/bulk-update",
    response_model=BulkPriceUpdateResponse,
    dependencies=[Depends(require_permission(["priceconfig.write"]))]
)
async def bulk_update_prices(
    request: BulkPriceUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Bulk upsert daily prices for a shop.
    This will insert new records or update existing ones.
    Only users with priceconfig.write permission (typically Admin) can use this.
    """
    from app.services.audit_service import audit_logger
    
    try:
        # Verify shop exists
        shop_response = supabase_client.table("shops")\
            .select("id, name")\
            .eq("id", request.shop_id)\
            .single()\
            .execute()
        
        if not shop_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        
        updated_count = 0
        
        for item in request.items:
            # Upsert each price record
            # Check if exists first
            existing = supabase_client.table("daily_shop_prices")\
                .select("id")\
                .eq("shop_id", request.shop_id)\
                .eq("item_id", item.item_id)\
                .eq("valid_date", request.date.isoformat())\
                .execute()
            
            if existing.data:
                # Update
                supabase_client.table("daily_shop_prices")\
                    .update({"price": float(item.price)})\
                    .eq("shop_id", request.shop_id)\
                    .eq("item_id", item.item_id)\
                    .eq("valid_date", request.date.isoformat())\
                    .execute()
            else:
                # Insert
                supabase_client.table("daily_shop_prices")\
                    .insert({
                        "shop_id": request.shop_id,
                        "item_id": item.item_id,
                        "valid_date": request.date.isoformat(),
                        "price": float(item.price)
                    })\
                    .execute()
            
            updated_count += 1
        
        # Audit log
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="BULK_UPDATE_PRICES",
            resource_type="daily_shop_prices",
            resource_id=str(request.shop_id),
            changes={
                "date": request.date.isoformat(),
                "items_count": len(request.items)
            },
            metadata={
                "shop_name": shop_response.data.get("name"),
                "item_ids": [item.item_id for item in request.items]
            }
        )
        
        return {
            "success": True,
            "updated_count": updated_count,
            "message": f"Successfully updated {updated_count} price(s) for {request.date.isoformat()}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk updating prices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update prices: {str(e)}"
        )


@router.delete(
    "/prices/daily",
    dependencies=[Depends(require_permission(["priceconfig.delete"]))]
)
async def delete_daily_price(
    shop_id: int = Query(...),
    item_id: int = Query(...),
    date: date = Query(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific daily price (reverts to base price)"""
    from app.services.audit_service import audit_logger
    
    try:
        result = supabase_client.table("daily_shop_prices")\
            .delete()\
            .eq("shop_id", shop_id)\
            .eq("item_id", item_id)\
            .eq("valid_date", date.isoformat())\
            .execute()
        
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="DELETE_DAILY_PRICE",
            resource_type="daily_shop_prices",
            resource_id=f"{shop_id}-{item_id}-{date}",
            metadata={
                "shop_id": shop_id,
                "item_id": item_id,
                "date": date.isoformat()
            }
        )
        
        return {"message": "Daily price deleted successfully. Item will use base price."}
    except Exception as e:
        logger.error(f"Error deleting daily price: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete daily price: {str(e)}"
        )
