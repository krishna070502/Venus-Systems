"""
Supabase Client
===============
Singleton client for interacting with Supabase.
"""

from supabase import create_client, Client
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Singleton Supabase client wrapper"""
    
    _instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance"""
        if cls._instance is None:
            logger.info("Initializing Supabase client")
            cls._instance = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        return cls._instance


# Global instance
supabase_client = SupabaseClient.get_client()
