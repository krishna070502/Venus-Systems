"""
Session Tracker Middleware
===========================
Tracks user sessions with IP, user agent, and device information.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
import logging
from datetime import datetime, timedelta
from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)


def parse_user_agent(user_agent: str) -> dict:
    """Simple user agent parser"""
    ua_lower = user_agent.lower()
    
    # Detect device type
    if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
        device_type = 'Mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        device_type = 'Tablet'
    else:
        device_type = 'Desktop'
    
    # Detect browser
    if 'chrome' in ua_lower and 'edg' not in ua_lower:
        browser = 'Chrome'
    elif 'firefox' in ua_lower:
        browser = 'Firefox'
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        browser = 'Safari'
    elif 'edg' in ua_lower:
        browser = 'Edge'
    else:
        browser = 'Unknown'
    
    return {
        'device_type': device_type,
        'browser': browser
    }


def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for X-Forwarded-For header (if behind proxy)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    # Check for X-Real-IP header
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    # Fall back to client host
    if request.client:
        return request.client.host
    
    return 'Unknown'


class SessionTrackerMiddleware(BaseHTTPMiddleware):
    """Middleware to track user sessions"""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Get response first
        response = await call_next(request)
        
        # Only track for authenticated requests
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return response
            
            token = auth_header.replace('Bearer ', '')
            
            # Verify token and get user
            from app.dependencies.auth import verify_token
            payload = verify_token(token)
            if not payload:
                return response
            
            user_id = payload.get('sub')
            if not user_id:
                return response
            
            # Get client info
            ip_address = get_client_ip(request)
            user_agent = request.headers.get('User-Agent', 'Unknown')
            ua_info = parse_user_agent(user_agent)
            
            # Update or insert session
            try:
                # Check if session exists
                existing = supabase_client.table('user_sessions').select('id').eq(
                    'user_id', user_id
                ).eq('ip_address', ip_address).eq('user_agent', user_agent).execute()
                
                session_data = {
                    'user_id': user_id,
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'device_type': ua_info['device_type'],
                    'browser': ua_info['browser'],
                    'last_activity_at': datetime.utcnow().isoformat(),
                    'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
                }
                
                if existing.data and len(existing.data) > 0:
                    # Update existing session
                    supabase_client.table('user_sessions').update({
                        'last_activity_at': datetime.utcnow().isoformat(),
                        'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
                    }).eq('id', existing.data[0]['id']).execute()
                else:
                    # Insert new session
                    supabase_client.table('user_sessions').insert(session_data).execute()
                
                logger.debug(f"Session tracked for user {user_id}: {ip_address} - {ua_info['device_type']}/{ua_info['browser']}")
                
            except Exception as e:
                logger.debug(f"Could not track session: {e}")
        
        except Exception as e:
            logger.debug(f"Session tracking error: {e}")
        
        return response
