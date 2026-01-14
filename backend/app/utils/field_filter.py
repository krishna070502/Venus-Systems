"""
Field-Level Permission Filter
==============================
Utility for filtering API response fields based on user permissions.

This ensures that even if someone bypasses the frontend, the backend
only returns fields the user has permission to view.
"""

from typing import Any, Dict, List, Optional, Set


def filter_fields(
    data: Dict[str, Any],
    user_permissions: List[str],
    field_config: Dict[str, str],
    always_include: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    Filter a dictionary to only include fields the user has permission to view.
    
    Args:
        data: The dictionary to filter
        user_permissions: List of permission keys the user has
        field_config: Mapping of field names to required permission keys
                     e.g., {"email": "users.field.email", "phone": "users.field.phone"}
        always_include: Set of field names to always include (e.g., {"id"})
    
    Returns:
        Filtered dictionary containing only permitted fields
    
    Example:
        >>> field_config = {"email": "users.field.email", "name": "users.field.name"}
        >>> user_permissions = ["users.field.name"]  # No email permission
        >>> data = {"id": 1, "email": "test@test.com", "name": "John"}
        >>> filter_fields(data, user_permissions, field_config, {"id"})
        {"id": 1, "name": "John"}
    """
    if always_include is None:
        always_include = {"id"}
    
    result = {}
    
    for key, value in data.items():
        # Always include certain fields
        if key in always_include:
            result[key] = value
            continue
        
        # Check if this field is controlled by a permission
        if key in field_config:
            required_permission = field_config[key]
            if required_permission in user_permissions:
                result[key] = value
        else:
            # Field not in config = always include (backwards compatible)
            result[key] = value
    
    return result


def filter_fields_list(
    data_list: List[Dict[str, Any]],
    user_permissions: List[str],
    field_config: Dict[str, str],
    always_include: Optional[Set[str]] = None
) -> List[Dict[str, Any]]:
    """
    Filter a list of dictionaries to only include fields the user has permission to view.
    
    Args:
        data_list: List of dictionaries to filter
        user_permissions: List of permission keys the user has
        field_config: Mapping of field names to required permission keys
        always_include: Set of field names to always include (e.g., {"id"})
    
    Returns:
        List of filtered dictionaries
    """
    return [
        filter_fields(item, user_permissions, field_config, always_include)
        for item in data_list
    ]
