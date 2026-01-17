from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission
from app.services.supabase_client import supabase_client as supabase

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Models ---
class WidgetUpdate(BaseModel):
    id: str
    type: str
    position: int
    size: str

class DashboardLayoutUpdate(BaseModel):
    columns: int
    widgets: List[WidgetUpdate]

class DashboardConfigUpdate(BaseModel):
    layout: DashboardLayoutUpdate
    theme: Optional[str] = "default"

class ShortcutCreate(BaseModel):
    name: str
    href: str
    icon: Optional[str] = "Link"
    color: Optional[str] = "#1E4DD8"

class ShortcutUpdate(BaseModel):
    name: Optional[str] = None
    href: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None

class HomepagePreferenceUpdate(BaseModel):
    homepage: str

# --- Endpoints ---

@router.get("/config")
async def get_dashboard_config(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase.table("user_dashboard_config").select("*").eq("user_id", current_user["id"]).execute()
        if response.data:
            return response.data[0]
        
        # Return default if not found
        return {
            "user_id": current_user["id"],
            "layout": {
                "columns": 2,
                "widgets": [
                    {"id": "shortcuts", "type": "shortcuts", "position": 0, "size": "full"},
                    {"id": "recent-activity", "type": "recent-activity", "position": 1, "size": "half"},
                    {"id": "clock", "type": "clock", "position": 2, "size": "half"}
                ]
            },
            "theme": "default"
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard config: {e}")
        # Table might not exist yet, return defaults
        return {
            "layout": {
                "columns": 2,
                "widgets": [
                    {"id": "shortcuts", "type": "shortcuts", "position": 0, "size": "full"},
                    {"id": "recent-activity", "type": "recent-activity", "position": 1, "size": "half"},
                    {"id": "clock", "type": "clock", "position": 2, "size": "half"}
                ]
            }
        }

@router.put("/config")
async def update_dashboard_config(
    config: DashboardConfigUpdate, 
    current_user: dict = Depends(require_permission(["dashboard.customize"]))
):
    try:
        data = {
            "user_id": current_user["id"],
            "layout": config.layout.dict(),
            "theme": config.theme,
            "updated_at": "now()"
        }
        
        response = supabase.table("user_dashboard_config").upsert(data, on_conflict="user_id").execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating dashboard config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update dashboard configuration: {str(e)}"
        )

@router.get("/shortcuts")
async def get_shortcuts(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase.table("user_shortcuts").select("*").eq("user_id", current_user["id"]).order("position").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching shortcuts: {e}")
        return []

@router.post("/shortcuts")
async def create_shortcut(
    shortcut: ShortcutCreate,
    current_user: dict = Depends(require_permission(["dashboard.shortcuts"]))
):
    try:
        # Get count for position
        count_resp = supabase.table("user_shortcuts").select("count", count="exact").eq("user_id", current_user["id"]).execute()
        position = count_resp.count or 0
        
        data = {
            "user_id": current_user["id"],
            "name": shortcut.name,
            "href": shortcut.href,
            "icon": shortcut.icon,
            "color": shortcut.color,
            "position": position
        }
        
        response = supabase.table("user_shortcuts").insert(data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating shortcut: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/shortcuts/{shortcut_id}")
async def update_shortcut(
    shortcut_id: str,
    shortcut: ShortcutUpdate,
    current_user: dict = Depends(require_permission(["dashboard.shortcuts"]))
):
    try:
        data = shortcut.dict(exclude_unset=True)
        response = supabase.table("user_shortcuts").update(data).eq("id", shortcut_id).eq("user_id", current_user["id"]).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Shortcut not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shortcut: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/shortcuts/{shortcut_id}")
async def delete_shortcut(
    shortcut_id: str,
    current_user: dict = Depends(require_permission(["dashboard.shortcuts"]))
):
    try:
        response = supabase.table("user_shortcuts").delete().eq("id", shortcut_id).eq("user_id", current_user["id"]).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting shortcut: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/homepage-preference")
async def get_homepage_preference(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase.table("user_homepage_preference").select("*").eq("user_id", current_user["id"]).execute()
        if response.data:
            return response.data[0]
        return {"user_id": current_user["id"], "homepage": "dashboard"}
    except Exception as e:
        logger.error(f"Error fetching homepage preference: {e}")
        return {"homepage": "dashboard"}

@router.put("/homepage-preference")
async def update_homepage_preference(
    pref: HomepagePreferenceUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        data = {
            "user_id": current_user["id"],
            "homepage": pref.homepage,
            "updated_at": "now()"
        }
        response = supabase.table("user_homepage_preference").upsert(data, on_conflict="user_id").execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating homepage preference: {e}")
        raise HTTPException(status_code=500, detail=str(e))
