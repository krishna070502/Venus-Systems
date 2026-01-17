"""
Shared utilities for Poultry Retail routers.
"""

def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []):
        return True
    return store_id in user.get("store_ids", [])


def has_allstores_permission(user: dict) -> bool:
    """Check if user has allstores permission."""
    if "Admin" in user.get("roles", []):
        return True
    permissions = user.get("permissions", [])
    # Check for either expense or cashbook allstores permission
    return "expense.allstores" in permissions or "cashbook.allstores" in permissions
