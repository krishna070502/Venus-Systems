-- =============================================================================
-- USER DASHBOARD CONFIGURATION
-- =============================================================================
-- Migration: 084_user_dashboard_config.sql
-- Description: Tables for user-customizable dashboard with shortcuts and widgets
-- Date: 2026-01-16
-- =============================================================================

-- ============================================================================
-- TABLE: user_dashboard_config
-- Stores dashboard layout and widget configuration per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_dashboard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    layout JSONB DEFAULT '{
        "columns": 2,
        "widgets": [
            {"id": "shortcuts", "type": "shortcuts", "position": 0, "size": "full"},
            {"id": "recent-activity", "type": "recent-activity", "position": 1, "size": "half"},
            {"id": "clock", "type": "clock", "position": 2, "size": "half"}
        ]
    }'::jsonb,
    theme VARCHAR(20) DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- TABLE: user_shortcuts
-- Stores user's custom quick links/shortcuts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    href VARCHAR(500) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Link',
    color VARCHAR(20) DEFAULT '#1E4DD8',
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user_id ON public.user_shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_position ON public.user_shortcuts(user_id, position);

-- ============================================================================
-- TABLE: user_homepage_preference
-- Stores homepage preference for admin users (dashboard vs /admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_homepage_preference (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    homepage VARCHAR(50) DEFAULT 'dashboard' CHECK (homepage IN ('dashboard', 'admin')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.user_dashboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_homepage_preference ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: user_dashboard_config
-- Users can only access their own dashboard config
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own dashboard config" ON public.user_dashboard_config;
CREATE POLICY "Users can view own dashboard config"
    ON public.user_dashboard_config FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard config" ON public.user_dashboard_config;
CREATE POLICY "Users can insert own dashboard config"
    ON public.user_dashboard_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dashboard config" ON public.user_dashboard_config;
CREATE POLICY "Users can update own dashboard config"
    ON public.user_dashboard_config FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: user_shortcuts
-- Users can only access their own shortcuts
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own shortcuts" ON public.user_shortcuts;
CREATE POLICY "Users can view own shortcuts"
    ON public.user_shortcuts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shortcuts" ON public.user_shortcuts;
CREATE POLICY "Users can insert own shortcuts"
    ON public.user_shortcuts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shortcuts" ON public.user_shortcuts;
CREATE POLICY "Users can update own shortcuts"
    ON public.user_shortcuts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own shortcuts" ON public.user_shortcuts;
CREATE POLICY "Users can delete own shortcuts"
    ON public.user_shortcuts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: user_homepage_preference
-- Users can only access their own homepage preference
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own homepage preference" ON public.user_homepage_preference;
CREATE POLICY "Users can view own homepage preference"
    ON public.user_homepage_preference FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own homepage preference" ON public.user_homepage_preference;
CREATE POLICY "Users can insert own homepage preference"
    ON public.user_homepage_preference FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own homepage preference" ON public.user_homepage_preference;
CREATE POLICY "Users can update own homepage preference"
    ON public.user_homepage_preference FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE BYPASS POLICIES
-- Allow backend service role to manage all records
-- ============================================================================
DROP POLICY IF EXISTS "Service role bypass for dashboard config" ON public.user_dashboard_config;
CREATE POLICY "Service role bypass for dashboard config"
    ON public.user_dashboard_config FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for shortcuts" ON public.user_shortcuts;
CREATE POLICY "Service role bypass for shortcuts"
    ON public.user_shortcuts FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role bypass for homepage preference" ON public.user_homepage_preference;
CREATE POLICY "Service role bypass for homepage preference"
    ON public.user_homepage_preference FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (key, description) VALUES
    ('dashboard.customize', 'Customize personal dashboard'),
    ('dashboard.shortcuts', 'Manage personal shortcuts')
ON CONFLICT (key) DO NOTHING;

-- Grant to all roles (everyone can customize their own dashboard)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.key IN ('dashboard.customize', 'dashboard.shortcuts')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
