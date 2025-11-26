"""
Health Check Router
===================
Endpoints for system health monitoring.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict
import logging
import time
from datetime import datetime
import psutil
import sys

from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def health_check() -> Dict:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/detailed")
async def detailed_health_check() -> Dict:
    """
    Detailed health check with system metrics and database status.
    
    Returns comprehensive information about:
    - Backend API status
    - Database connectivity
    - System resources
    - Python runtime info
    """
    start_time = time.time()
    
    # Backend API Info
    backend_info = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": sys.version,
        "api_version": "1.0.0",
        "uptime_seconds": time.process_time()
    }
    
    # System Resources
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        system_info = {
            "status": "healthy",
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total_mb": round(memory.total / (1024 * 1024), 2),
                "available_mb": round(memory.available / (1024 * 1024), 2),
                "used_mb": round(memory.used / (1024 * 1024), 2),
                "usage_percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024 * 1024 * 1024), 2),
                "used_gb": round(disk.used / (1024 * 1024 * 1024), 2),
                "free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
                "usage_percent": disk.percent
            }
        }
    except Exception as e:
        logger.error(f"Error fetching system info: {str(e)}")
        system_info = {
            "status": "error",
            "error": str(e)
        }
    
    # Database Health
    db_start = time.time()
    try:
        # Test database connection with a simple query
        response = supabase_client.table("profiles").select("id").limit(1).execute()
        db_latency = (time.time() - db_start) * 1000  # Convert to ms
        
        # Get table counts
        profiles_count = supabase_client.table("profiles").select("id", count="exact").execute()
        roles_count = supabase_client.table("roles").select("id", count="exact").execute()
        permissions_count = supabase_client.table("permissions").select("id", count="exact").execute()
        
        database_info = {
            "status": "healthy",
            "type": "Supabase PostgreSQL",
            "latency_ms": round(db_latency, 2),
            "connection": "active",
            "tables": {
                "profiles": profiles_count.count if hasattr(profiles_count, 'count') else 0,
                "roles": roles_count.count if hasattr(roles_count, 'count') else 0,
                "permissions": permissions_count.count if hasattr(permissions_count, 'count') else 0
            }
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        database_info = {
            "status": "unhealthy",
            "error": str(e),
            "connection": "failed"
        }
    
    total_latency = (time.time() - start_time) * 1000
    
    return {
        "overall_status": "healthy" if database_info["status"] == "healthy" else "degraded",
        "backend": backend_info,
        "system": system_info,
        "database": database_info,
        "response_time_ms": round(total_latency, 2)
    }


@router.get("/status")
async def quick_status() -> Dict:
    """Quick status check for status indicators"""
    try:
        # Quick DB check
        db_start = time.time()
        supabase_client.table("profiles").select("id").limit(1).execute()
        db_latency = (time.time() - db_start) * 1000
        
        return {
            "backend": {
                "status": "healthy",
                "response_time_ms": round(db_latency, 2)
            },
            "database": {
                "status": "healthy",
                "latency_ms": round(db_latency, 2)
            }
        }
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        return {
            "backend": {
                "status": "healthy",
                "response_time_ms": 0
            },
            "database": {
                "status": "unhealthy",
                "error": str(e)
            }
        }
