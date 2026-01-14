# Security & Performance Audit Report

> **Date:** January 12, 2026
> **Version:** 1.0 (Audit)

## 📌 Overview
This document outlines the findings and recommendations from a comprehensive system audit focusing on security vulnerabilities and performance bottlenecks (perceived as "lagging").

---

## 🚀 Performance & "Lagging" Analysis

The primary cause of system latency is **synchronous network I/O blocking the async event loop** in the FastAPI backend.

### 1. Middleware Bottlenecks
Every authenticated request is currently blocked by multiple synchronous network calls to Supabase before it reaches the endpoint business logic:
- **`SessionTrackerMiddleware`**: Performs a `SELECT` and an `INSERT/UPDATE` on every request.
- **`RateLimiterMiddleware`**: Fetches user roles from the database on every request.
- **RBAC Logic**: The `require_permission` decorator calls `get_user_permissions`, adding another DB round-trip.

### 2. Sequential Data Fetching
In critical endpoints like `/api/v1/users/me`, multiple database queries are performed sequentially instead of being batched or optimized through a join/view.

### 3. Frontend Inefficiencies
- **Unoptimized Permission Fetching**: The `usePermissions` hook fetches full user data on mount/auth changes without caching.
- **Heavy Sidebar Logic**: The sidebar performs recursive filtering on every render sequence.

---

## 🔒 Security Findings

### 1. Configuration & Secrets
- **Default Secret Key**: The `SECRET_KEY` in `backend/app/config/settings.py` uses a placeholder value. This must be changed to a unique 32-character hex string in production.
- **Environment Management**: Supabase keys and DB credentials are correctly managed via `.env` files and are NOT hardcoded.

### 2. Exploit Protection
- **Missing CSRF Protection**: The backend lacks dedicated middleware to prevent Cross-Site Request Forgery.
- **IDOR Protection**: Row Level Security (RLS) is correctly implemented for most tables, providing strong isolation for user data and shop management.
- **Rate Limit Storage**: Limits are stored in-memory, meaning they reset on server restart and are not shared between multiple server instances.

---

## 💡 Recommendations

### Phase 1: High Impact (Performance)
1. **Async Migration**: Replace the synchronous Supabase client calls (`.execute()`) with an `AsyncClient` and use `await`.
2. **Permission Caching**: Implement an in-memory TTL cache (e.g., Redis or `cachetools`) for user permissions and roles.
3. **Endpoint Optimization**: Combine user details, roles, and permissions into a single database function (RPC) or join.

### Phase 2: Security Hardening
1. **Production Secrets**: Rotate all secret keys using `openssl rand -hex 32`.
2. **CSRF Middleware**: Implement `fastapi-csrf` or similar protection.
3. **Redis Rate Limiting**: Move the rate limit store to Redis for persistence and scalability.

---

> [!TIP]
> Addressing the synchronous blocking calls in the middleware will provide the most immediate and noticeable improvement to system responsiveness.
