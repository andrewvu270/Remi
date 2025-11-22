from .config import settings
from supabase import create_client
from sqlalchemy.ext.declarative import declarative_base
import os

# Supabase client setup (REST API for all data operations)
supabase = None
supabase_admin = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    # Regular client with RLS (for authenticated users)
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    print("✓ Using Supabase REST API for all data operations")
    
    # Admin client with service role key (bypasses RLS for guest/admin operations)
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        print("✓ Service role client initialized for admin operations")

# Dummy Base for backward compatibility with models
Base = declarative_base()

def get_supabase():
    """Get Supabase client instance for REST API operations"""
    if supabase is None:
        raise RuntimeError("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
    return supabase

def get_supabase_admin():
    """Get Supabase admin client (bypasses RLS) for guest/admin operations"""
    if supabase_admin is None:
        # Fallback to regular client if admin key not available
        return get_supabase()
    return supabase_admin

def get_db():
    """Dummy function for backward compatibility - routes should use get_supabase() instead"""
    return get_supabase()
