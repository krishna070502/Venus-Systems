"""
Business Management Models
==========================
Pydantic models for Business Management module including:
- Shops
- Managers (Manager Details + User Shops)
- Inventory Items
- Daily Shop Prices
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# =============================================================================
# SHOP MODELS
# =============================================================================

class ShopBase(BaseModel):
    """Base shop model"""
    name: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = None
    is_active: bool = True


class ShopCreate(ShopBase):
    """Model for creating a new shop"""
    pass


class ShopUpdate(BaseModel):
    """Model for updating shop information"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = None
    is_active: Optional[bool] = None


class Shop(ShopBase):
    """Shop model with ID"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# MANAGER MODELS
# =============================================================================

class ManagerDetailsBase(BaseModel):
    """Base manager details model"""
    qualifications: Optional[str] = None
    contact_number: Optional[str] = Field(None, max_length=20)


class ManagerOnboardRequest(ManagerDetailsBase):
    """Request model for onboarding a manager"""
    user_id: str  # UUID as string
    shop_id: int


class ManagerDetails(ManagerDetailsBase):
    """Manager details with user ID"""
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ManagerWithProfile(BaseModel):
    """Manager with user profile and shop information"""
    user_id: str
    email: str
    full_name: Optional[str] = None
    qualifications: Optional[str] = None
    contact_number: Optional[str] = None
    shop_id: Optional[int] = None
    shop_name: Optional[str] = None
    shop_location: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UnassignedManager(BaseModel):
    """User who has Store Manager role but not onboarded"""
    user_id: str
    email: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserShop(BaseModel):
    """User-Shop assignment"""
    user_id: str
    shop_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# INVENTORY ITEM MODELS
# =============================================================================

class InventoryItemBase(BaseModel):
    """Base inventory item model"""
    name: str = Field(..., min_length=1, max_length=255)
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    base_price: Decimal = Field(..., ge=0, decimal_places=2)
    unit: str = Field(default="piece", max_length=50)
    is_active: bool = True


class InventoryItemCreate(InventoryItemBase):
    """Model for creating an inventory item"""
    pass


class InventoryItemUpdate(BaseModel):
    """Model for updating inventory item"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    base_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    unit: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class InventoryItem(InventoryItemBase):
    """Inventory item with ID"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# DAILY PRICE MODELS
# =============================================================================

class DailyPriceBase(BaseModel):
    """Base daily price model"""
    shop_id: int
    item_id: int
    valid_date: date
    price: Decimal = Field(..., ge=0, decimal_places=2)


class DailyPriceCreate(DailyPriceBase):
    """Model for creating a daily price"""
    pass


class DailyPrice(DailyPriceBase):
    """Daily price with ID"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DailyPriceWithItem(BaseModel):
    """Daily price with item details"""
    item_id: int
    item_name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    base_price: Decimal
    daily_price: Optional[Decimal] = None  # None means use base price
    unit: str
    
    class Config:
        from_attributes = True


class PriceItem(BaseModel):
    """Single item in bulk update"""
    item_id: int
    price: Decimal = Field(..., ge=0, decimal_places=2)


class BulkPriceUpdateRequest(BaseModel):
    """Request model for bulk price update"""
    shop_id: int
    date: date
    items: List[PriceItem]


class BulkPriceUpdateResponse(BaseModel):
    """Response for bulk price update"""
    success: bool
    updated_count: int
    message: str


class DailyPricesResponse(BaseModel):
    """Response for daily prices query"""
    shop_id: int
    shop_name: str
    date: date
    items: List[DailyPriceWithItem]
