"""Dependencies module"""
from app.dependencies.auth import get_current_user, get_optional_user
from app.dependencies.rbac import (
    require_role,
    require_permission,
    require_admin,
    require_admin_or_manager
)

__all__ = [
    "get_current_user",
    "get_optional_user",
    "require_role",
    "require_permission",
    "require_admin",
    "require_admin_or_manager"
]
