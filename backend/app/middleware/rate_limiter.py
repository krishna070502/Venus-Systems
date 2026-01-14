"""
Rate Limiter Middleware
=======================
Role-based rate limiting using sliding window algorithm.
Limits are configurable per-role via the admin settings.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response, JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
import asyncio

from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)


class RateLimitStore:
    """In-memory sliding window rate limit store"""
    
    def __init__(self):
        # Structure: {user_id: [(timestamp, count), ...]}
        self.minute_requests: Dict[str, List[datetime]] = defaultdict(list)
        self.hour_requests: Dict[str, List[datetime]] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def record_request(self, user_id: str) -> None:
        """Record a request for a user"""
        async with self._lock:
            now = datetime.utcnow()
            self.minute_requests[user_id].append(now)
            self.hour_requests[user_id].append(now)
    
    async def get_request_counts(self, user_id: str) -> Tuple[int, int]:
        """Get request counts for last minute and hour"""
        async with self._lock:
            now = datetime.utcnow()
            minute_ago = now - timedelta(minutes=1)
            hour_ago = now - timedelta(hours=1)
            
            # Clean old entries and count
            self.minute_requests[user_id] = [
                ts for ts in self.minute_requests[user_id] if ts > minute_ago
            ]
            self.hour_requests[user_id] = [
                ts for ts in self.hour_requests[user_id] if ts > hour_ago
            ]
            
            return len(self.minute_requests[user_id]), len(self.hour_requests[user_id])


class RateLimitConfigCache:
    """Cache for rate limit configurations"""
    
    def __init__(self, ttl_seconds: int = 60):
        self.cache: Dict[int, dict] = {}
        self.last_refresh: Optional[datetime] = None
        self.ttl = timedelta(seconds=ttl_seconds)
        self._lock = asyncio.Lock()
    
    async def get_config(self, role_id: int) -> Optional[dict]:
        """Get rate limit config for a role"""
        async with self._lock:
            now = datetime.utcnow()
            
            # Refresh cache if expired
            if self.last_refresh is None or now - self.last_refresh > self.ttl:
                await self._refresh_cache()
            
            return self.cache.get(role_id)
    
    async def _refresh_cache(self) -> None:
        """Refresh cache from database"""
        try:
            response = supabase_client.table('rate_limit_configs').select('*').execute()
            self.cache = {config['role_id']: config for config in response.data}
            self.last_refresh = datetime.utcnow()
            logger.debug(f"Rate limit cache refreshed: {len(self.cache)} configs")
        except Exception as e:
            logger.error(f"Failed to refresh rate limit cache: {e}")
    
    def invalidate(self) -> None:
        """Invalidate cache to force refresh on next request"""
        self.last_refresh = None


# Global instances
rate_limit_store = RateLimitStore()
rate_limit_config_cache = RateLimitConfigCache()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Middleware for role-based rate limiting"""
    
    # Paths to exclude from rate limiting
    EXCLUDED_PATHS = {
        '/health',
        '/docs',
        '/redoc',
        '/openapi.json',
        '/',
    }
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            # Skip excluded paths
            if request.url.path in self.EXCLUDED_PATHS:
                return await call_next(request)
            
            # Check for auth header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return await call_next(request)
            
            # Get user info from token
            token = auth_header.replace('Bearer ', '')
            user_info = await self._get_user_info(token)
            
            if not user_info:
                return await call_next(request)
            
            user_id = user_info['user_id']
            role_ids = user_info['role_ids']
            
            # Get rate limit config (use highest limit from user's roles)
            config = await self._get_best_rate_limit(role_ids)
            
            if not config or not config.get('enabled', True):
                return await call_next(request)
            
            # Check rate limits
            minute_count, hour_count = await rate_limit_store.get_request_counts(user_id)
            rpm_limit = config.get('requests_per_minute', 60)
            rph_limit = config.get('requests_per_hour', 1000)
            
            # Check if over limit
            if minute_count >= rpm_limit:
                return self._rate_limit_response(
                    f"Rate limit exceeded. Max {rpm_limit} requests per minute.",
                    retry_after=60
                )
            
            if hour_count >= rph_limit:
                return self._rate_limit_response(
                    f"Rate limit exceeded. Max {rph_limit} requests per hour.",
                    retry_after=3600
                )
            
            # Record this request
            await rate_limit_store.record_request(user_id)
            
            # Add rate limit headers to response
            response = await call_next(request)
            response.headers['X-RateLimit-Limit-Minute'] = str(rpm_limit)
            response.headers['X-RateLimit-Limit-Hour'] = str(rph_limit)
            response.headers['X-RateLimit-Remaining-Minute'] = str(max(0, rpm_limit - minute_count - 1))
            response.headers['X-RateLimit-Remaining-Hour'] = str(max(0, rph_limit - hour_count - 1))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiter middleware processing error: {e}")
            # If rate limiter itself fails, allow request through
            return await call_next(request)
    
    async def _get_user_info(self, token: str) -> Optional[dict]:
        """Get user ID and role IDs from token"""
        try:
            from jose import jwt
            from app.config.settings import settings
            
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Get user's roles
            roles_response = supabase_client.table('user_roles').select('role_id').eq('user_id', user_id).execute()
            role_ids = [r['role_id'] for r in roles_response.data] if roles_response.data else []
            
            return {'user_id': user_id, 'role_ids': role_ids}
            
        except Exception as e:
            logger.debug(f"Could not get user info: {e}")
            return None
    
    async def _get_best_rate_limit(self, role_ids: List[int]) -> Optional[dict]:
        """Get the highest rate limit from user's roles"""
        if not role_ids:
            return None
        
        best_config = None
        best_rpm = 0
        
        for role_id in role_ids:
            config = await rate_limit_config_cache.get_config(role_id)
            if config and config.get('requests_per_minute', 0) > best_rpm:
                best_config = config
                best_rpm = config.get('requests_per_minute', 0)
        
        return best_config
    
    def _rate_limit_response(self, message: str, retry_after: int) -> JSONResponse:
        """Return a 429 Too Many Requests response"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": message,
                "retry_after": retry_after
            },
            headers={
                "Retry-After": str(retry_after)
            }
        )
