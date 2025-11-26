"""
Audit Log Service
==================
Tracks all system changes and user actions
"""

from datetime import datetime
from typing import Optional, Dict, Any
from app.services.supabase_client import supabase_client


class AuditLogger:
    """Service for logging all system activities"""
    
    @staticmethod
    async def log_action(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log an audit event
        
        Args:
            user_id: ID of the user performing the action
            action: Type of action (CREATE, UPDATE, DELETE, etc.)
            resource_type: Type of resource (user, role, permission, etc.)
            resource_id: ID of the affected resource
            changes: Dictionary of what changed (before/after)
            metadata: Additional context
        """
        try:
            log_entry = {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "changes": changes or {},
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Insert into audit_logs table
            result = supabase_client.table("audit_logs").insert(log_entry).execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            # Don't fail the main operation if logging fails
            print(f"Audit log error: {str(e)}")
            return None
    
    @staticmethod
    def compare_objects(old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two objects and return what changed
        
        Returns:
            Dictionary with 'before' and 'after' for each changed field
        """
        changes = {}
        
        # Check all keys from both objects
        all_keys = set(old.keys()) | set(new.keys())
        
        for key in all_keys:
            old_value = old.get(key)
            new_value = new.get(key)
            
            if old_value != new_value:
                changes[key] = {
                    "before": old_value,
                    "after": new_value
                }
        
        return changes


# Global instance
audit_logger = AuditLogger()
