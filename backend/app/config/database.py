"""
Database Configuration
======================
Provides database client access for the application.
"""

from supabase import Client
from app.services.supabase_client import SupabaseClient


def get_supabase() -> Client:
    """Get Supabase client instance."""
    return SupabaseClient.get_client()


# Alias for convenience
supabase = get_supabase()
