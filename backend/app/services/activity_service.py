"""
Activity Logging Service
========================
Dedicated service for capturing user authentication, session, and security events.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
import logging

from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)

class ActivityLogger:
    """Service for enterprise-grade activity logging"""
    
    @staticmethod
    async def log_activity(
        user_id: Optional[str],
        event_type: str,
        status: str = "SUCCESS",
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log a user activity event
        
        Args:
            user_id: ID of the user (can be None for failed logins)
            event_type: Type of event (LOGIN, LOGOUT, etc.)
            status: SUCCESS or FAILED
            request: FastAPI Request object for metadata extraction
            metadata: Additional custom context
        """
        try:
            ip_address = "unknown"
            user_agent = "unknown"
            browser = "Unknown"
            os = "Unknown"
            device_type = "Desktop"

            if request:
                ip_address = request.client.host if request.client else "unknown"
                user_agent = request.headers.get("user-agent", "unknown")
                
                # Simple Manual UA Parsing (can be replaced with ua-parser if available)
                ua_lower = user_agent.lower()
                
                # Device Type
                if "mobi" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
                    device_type = "Mobile"
                elif "tablet" in ua_lower or "ipad" in ua_lower:
                    device_type = "Tablet"
                
                # OS
                if "windows" in ua_lower: os = "Windows"
                elif "mac os" in ua_lower or "macintosh" in ua_lower: os = "macOS"
                elif "android" in ua_lower: os = "Android"
                elif "iphone" in ua_lower or "ipad" in ua_lower: os = "iOS"
                elif "linux" in ua_lower: os = "Linux"
                
                # Browser
                if "edg/" in ua_lower: browser = "Edge"
                elif "chrome" in ua_lower: browser = "Chrome"
                elif "firefox" in ua_lower: browser = "Firefox"
                elif "safari" in ua_lower and "chrome" not in ua_lower: browser = "Safari"
                elif "trident" in ua_lower: browser = "IE"

            log_entry = {
                "user_id": user_id,
                "event_type": event_type,
                "status": status,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "browser": browser,
                "os": os,
                "device_type": device_type,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Use supabase service role to ensure logging even if user doesn't have RLS permissions yet
            res = supabase_client.table("app_activity_logs").insert(log_entry).execute()
            
            if hasattr(res, 'data') and len(res.data) > 0:
                logger.info(f"Successfully recorded activity log: {event_type}")
            else:
                logger.warning(f"Activity log insert returned no data, might have failed quietly: {event_type}")
            
            # Also log to standard logger
            log_msg = f"ACTIVITY: {event_type} | Status: {status} | User: {user_id or 'Anonymous'} | IP: {ip_address}"
            if status == "FAILED":
                logger.warning(log_msg)
            else:
                logger.info(log_msg)
                
        except Exception as e:
            # Critical: Fail silently to not block the main transaction, but log the error
            logger.error(f"Failed to record activity log: {str(e)}")

# Global instance
activity_logger = ActivityLogger()
