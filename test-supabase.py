#!/usr/bin/env python3
"""
Supabase Connection Test Script
================================
Tests the connection to Supabase and diagnoses auth issues.
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Now import after env is loaded
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.supabase_client import supabase_client

def test_supabase_connection():
    """Test Supabase connection and auth configuration"""
    
    print("=" * 70)
    print("SUPABASE CONNECTION TEST")
    print("=" * 70)
    
    # Test 1: Check environment variables
    print("\n1️⃣  Checking Environment Variables...")
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if supabase_url:
        print(f"   ✅ SUPABASE_URL: {supabase_url}")
    else:
        print("   ❌ SUPABASE_URL not found!")
        return
    
    if supabase_key:
        print(f"   ✅ SUPABASE_ANON_KEY: {supabase_key[:20]}...")
    else:
        print("   ❌ SUPABASE_ANON_KEY not found!")
        return
    
    # Test 2: Test database connection
    print("\n2️⃣  Testing Database Connection...")
    try:
        response = supabase_client.table('profiles').select('id').limit(1).execute()
        print(f"   ✅ Database connection successful!")
        print(f"   ℹ️  Found {len(response.data)} profile(s)")
    except Exception as e:
        print(f"   ❌ Database connection failed: {str(e)}")
        return
    
    # Test 3: Check roles table
    print("\n3️⃣  Checking Roles Table...")
    try:
        response = supabase_client.table('roles').select('*').execute()
        print(f"   ✅ Roles table accessible!")
        print(f"   ℹ️  Found {len(response.data)} role(s):")
        for role in response.data:
            print(f"      - {role.get('name')}: {role.get('description')}")
    except Exception as e:
        print(f"   ❌ Roles table error: {str(e)}")
    
    # Test 4: Check permissions table
    print("\n4️⃣  Checking Permissions Table...")
    try:
        response = supabase_client.table('permissions').select('id').execute()
        print(f"   ✅ Permissions table accessible!")
        print(f"   ℹ️  Found {len(response.data)} permission(s)")
    except Exception as e:
        print(f"   ❌ Permissions table error: {str(e)}")
    
    # Test 5: Test auth signup (with test email)
    print("\n5️⃣  Testing Auth Configuration...")
    print("   ⚠️  Skipping actual signup test to avoid creating test users")
    print("   💡 To fix auth errors:")
    print("      1. Open Supabase Dashboard")
    print("      2. Go to Authentication → Providers → Email")
    print("      3. DISABLE 'Confirm email' for development")
    print("      4. Click Save")
    
    # Test 6: Check if profiles trigger exists
    print("\n6️⃣  Next Steps...")
    print("   📋 Run this SQL in Supabase SQL Editor:")
    print("      See: supabase-auth-fix.sql")
    print("   ")
    print("   📖 Read the troubleshooting guide:")
    print("      See: SUPABASE_AUTH_FIX.md")
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)
    print("\n✨ Most likely issue: Email confirmation is enabled")
    print("   Go to Supabase → Authentication → Email → Disable 'Confirm email'")
    print()

if __name__ == "__main__":
    try:
        test_supabase_connection()
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
