"""
Staff Points Models for PoultryRetail-Core
==========================================
Pydantic models for staff performance tracking and incentives.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID


class StaffPointEntry(BaseModel):
    """Individual staff point entry"""
    id: UUID
    user_id: UUID
    store_id: int
    points_change: int  # Positive = reward, Negative = penalty
    reason: str
    reason_details: Optional[str] = None
    ref_id: Optional[UUID] = None
    ref_type: Optional[str] = None
    effective_date: date
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StaffPointEntryWithUser(StaffPointEntry):
    """Staff point entry with user details"""
    user_email: str
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class StaffPointsCreate(BaseModel):
    """Model for manually creating staff points (admin)"""
    user_id: UUID
    store_id: int
    points_change: int
    reason: str
    reason_details: Optional[str] = None
    effective_date: date = Field(default_factory=date.today)


class StaffPointSummary(BaseModel):
    """Summary of staff points for a user"""
    user_id: UUID
    user_email: str
    user_name: Optional[str] = None
    total_points: int
    points_this_month: int
    points_today: int
    rank: Optional[int] = None  # Rank among store staff

class StaffPointBreakdownItem(BaseModel):
    reason_code: str
    description: str
    points: int
    count: int

class StaffVarianceSummary(BaseModel):
    positive_kg: float
    negative_kg: float
    count: int

class StaffPerformanceBreakdown(BaseModel):
    user_id: UUID
    total_points: int
    total_weight_handled: float
    normalized_score: float
    grade: str
    points_breakdown: list[StaffPointBreakdownItem]
    variance_summary: StaffVarianceSummary


class StaffPointsConfig(BaseModel):
    """Staff points configuration"""
    id: UUID
    config_key: str
    config_value: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StaffPointsConfigUpdate(BaseModel):
    """Model for updating points config (admin)"""
    config_value: int


class StaffLeaderboard(BaseModel):
    """Leaderboard entry for staff performance"""
    rank: int
    user_id: UUID
    user_email: str
    user_name: Optional[str] = None
    total_points: int
    grade: Optional[str] = None
    zero_variance_days: int
    store_id: Optional[int] = None
    store_name: Optional[str] = None


class StaffLeaderboardResponse(BaseModel):
    """Response model for leaderboard"""
    period_start: date
    period_end: date
    store_id: Optional[int] = None
    entries: list[StaffLeaderboard]
