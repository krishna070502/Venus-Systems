"""
Shared utilities for Poultry Retail routers.
"""

def validate_store_access(store_id: int, user: dict) -> bool:
    """Check if user has access to the store."""
    if "Admin" in user.get("roles", []) or "Admin" in user.get("user_metadata", {}).get("roles", []):
        return True
    
    user_store_ids = user.get("store_ids", [])
    metadata_store_ids = user.get("user_metadata", {}).get("store_ids", [])
    
    return store_id in user_store_ids or store_id in metadata_store_ids


def has_allstores_permission(user: dict) -> bool:
    """Check if user has allstores permission."""
    if "Admin" in user.get("roles", []) or "Admin" in user.get("user_metadata", {}).get("roles", []):
        return True
    permissions = user.get("permissions", [])
    metadata_perms = user.get("user_metadata", {}).get("permissions", [])
    # Check for either expense or cashbook allstores permission
    return "expense.allstores" in permissions or "cashbook.allstores" in permissions or \
           "expense.allstores" in metadata_perms or "cashbook.allstores" in metadata_perms
