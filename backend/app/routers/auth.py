"""
Authentication Router
=====================
Endpoints for user authentication and registration.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Dict
import logging

from datetime import datetime
from app.config.settings import settings
from app.services.supabase_client import supabase_client
from app.models.user import UserCreate
from app.dependencies.auth import get_current_user
from app.services.audit_service import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter()


async def is_registration_enabled() -> bool:
    """Check if user registration is enabled in system settings"""
    try:
        result = supabase_client.table("system_settings")\
            .select("value")\
            .eq("key", "registration_enabled")\
            .single()\
            .execute()
        
        if result.data:
            return result.data["value"].lower() == "true"
        return True  # Default to enabled if setting not found
    except Exception as e:
        logger.warning(f"Could not check registration setting: {e}")
        return True  # Default to enabled on error


async def is_maintenance_mode() -> bool:
    """Check if maintenance mode is enabled in system settings"""
    try:
        result = supabase_client.table("system_settings")\
            .select("value")\
            .eq("key", "maintenance_mode")\
            .single()\
            .execute()
        
        if result.data:
            return result.data["value"].lower() == "true"
        return False  # Default to disabled if setting not found
    except Exception as e:
        logger.warning(f"Could not check maintenance mode setting: {e}")
        return False  # Default to disabled on error


@router.get("/registration-status")
async def get_registration_status() -> Dict:
    """Check if user registration is currently enabled (public endpoint)"""
    enabled = await is_registration_enabled()
    return {
        "registration_enabled": enabled,
        "message": "Registration is enabled" if enabled else "Registration is currently disabled"
    }


@router.get("/maintenance-status")
async def get_maintenance_status() -> Dict:
    """Check if maintenance mode is enabled (public endpoint)"""
    enabled = await is_maintenance_mode()
    return {
        "maintenance_mode": enabled,
        "message": "System is under maintenance" if enabled else "System is operational"
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate) -> Dict:
    """
    Register a new user.
    
    Creates a new user account with Supabase Auth and creates a profile entry.
    The profile is automatically created via database trigger.
    """
    # Check if registration is enabled
    if not await is_registration_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User registration is currently disabled. Please contact an administrator."
        )
    
    try:
        # Sign up with Supabase Auth
        response = supabase_client.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if response.user:
            # Manually create profile if trigger fails
            try:
                supabase_client.table('profiles').insert({
                    'id': response.user.id,
                    'email': response.user.email,
                    'full_name': user_data.full_name or ''
                }).execute()
            except Exception as profile_error:
                # Profile might already exist from trigger, that's okay
                logger.warning(f"Profile creation info: {str(profile_error)}")
            
            # Assign default "User" role
            from app.services.role_service import RoleService
            role_service = RoleService()
            
            # Get the "User" role
            roles = await role_service.get_all_roles()
            user_role = next((r for r in roles if r["name"] == "User"), None)
            
            if user_role:
                await role_service.assign_role_to_user(response.user.id, user_role["id"])
            
            # Log signup
            await audit_logger.log_action(
                user_id=response.user.id,
                action="CREATE",
                resource_type="profile",
                resource_id=response.user.id,
                metadata={"email": response.user.email}
            )
            
            return {
                "message": "User created successfully",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
            
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(email: str, password: str, request: Request) -> Dict:
    """
    Login with email and password.
    
    Returns access token and user information.
    """
    try:
        # Capture session metadata early for logging/failures
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        # Simple User-Agent parsing
        browser = "Unknown"
        device_type = "Desktop"
        
        ua_lower = user_agent.lower()
        if "mobi" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            device_type = "Mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "Tablet"
            
        if "chrome" in ua_lower: browser = "Chrome"
        elif "firefox" in ua_lower: browser = "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower: browser = "Safari"
        elif "edge" in ua_lower: browser = "Edge"

        response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.session:
            # Record session in database
            try:
                supabase_client.table('user_sessions').insert({
                    "user_id": response.user.id,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "device_type": device_type,
                    "browser": browser,
                    "last_activity_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as session_error:
                logger.warning(f"Could not record user session: {session_error}")

            # Log login audit
            await audit_logger.log_action(
                user_id=response.user.id,
                action="LOGIN",
                resource_type="auth",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "email": response.user.email,
                    "browser": browser,
                    "device": device_type
                }
            )
            
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
                }
            }
        else:
            # Log failed login (Invalid credentials)
            await audit_logger.log_action(
                user_id="system",  # Unknown user
                action="LOGIN_FAILED",
                resource_type="auth",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "email": email,
                    "reason": "Invalid credentials",
                    "browser": browser,
                    "device": device_type
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        
        # Log failed login (Exception)
        try:
            # Re-capture metadata in exception block if needed (though local vars should be available)
            # We need to ensure these are defined if exception happened before their definition
            # But they are defined right at the start of the function now? 
            # No, I need to move the metadata capture UP.
            pass
        except:
            pass
            
        await audit_logger.log_action(
            user_id="system",
            action="LOGIN_FAILED",
            resource_type="auth",
            metadata={"email": email, "error": str(e)}
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)) -> Dict:
    """Logout current user"""
    try:
        # Log logout
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="LOGOUT",
            resource_type="auth"
        )
        
        supabase_client.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed"
        )


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)) -> Dict:
    """Get current user information"""
    from app.services.user_service import UserService
    from app.services.role_service import RoleService
    
    user_service = UserService()
    role_service = RoleService()
    
    # Get user profile
    profile = await user_service.get_user_by_id(current_user["id"])
    
    # Get user roles and permissions
    roles = await role_service.get_user_roles(current_user["id"])
    permissions = await role_service.get_user_permissions(current_user["id"])
    
    return {
        "user": profile,
        "roles": [role["name"] for role in roles],
        "permissions": permissions
    }


@router.post("/refresh")
async def refresh_token(refresh_token: str) -> Dict:
    """Refresh access token"""
    try:
        response = supabase_client.auth.refresh_session(refresh_token)
        
        if response.session:
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "token_type": "bearer"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/record-session")
async def record_session(request: Request, current_user: dict = Depends(get_current_user)) -> Dict:
    """
    Manually record a user session.
    
    Called by the frontend after client-side authentication to ensure 
    metadata (IP, User Agent) is captured in the backend.
    """
    try:
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        # Simple User-Agent parsing
        browser = "Unknown"
        device_type = "Desktop"
        
        ua_lower = user_agent.lower()
        if "mobi" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            device_type = "Mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "Tablet"
            
        if "chrome" in ua_lower: browser = "Chrome"
        elif "firefox" in ua_lower: browser = "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower: browser = "Safari"
        elif "edge" in ua_lower: browser = "Edge"
        
        # Record session in database
        # Check if recent session exists to avoid duplicates
        existing = supabase_client.table('user_sessions').select('id').eq(
            'user_id', current_user['id']
        ).eq('user_agent', user_agent).eq('ip_address', ip_address).execute()
        
        if not existing.data:
            supabase_client.table('user_sessions').insert({
                "user_id": current_user['id'],
                "ip_address": ip_address,
                "user_agent": user_agent,
                "device_type": device_type,
                "browser": browser,
                "last_activity_at": datetime.utcnow().isoformat()
            }).execute()
            
            # Also log to audit logs
            await audit_logger.log_action(
                user_id=current_user['id'],
                action="LOGIN",
                resource_type="auth",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "email": current_user.get('email'),
                    "browser": browser,
                    "device": device_type,
                    "via": "client_side_auth"
                }
            )
            
        return {"status": "recorded"}
    except Exception as e:
        logger.warning(f"Failed to record session: {e}")
        return {"status": "failed", "error": str(e)}
