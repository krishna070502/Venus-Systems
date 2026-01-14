-- =============================================================================
-- RATE LIMIT CONFIGURATIONS TABLE
-- =============================================================================
-- Stores per-role rate limiting configurations

-- Create rate_limit_configs table
CREATE TABLE IF NOT EXISTS public.rate_limit_configs (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    requests_per_hour INTEGER NOT NULL DEFAULT 1000,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id)
);

-- Enable RLS
ALTER TABLE public.rate_limit_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Rate limit configs viewable by authenticated users with permission"
    ON public.rate_limit_configs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Rate limit configs modifiable by admins"
    ON public.rate_limit_configs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_role_id ON public.rate_limit_configs(role_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rate_limit_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rate_limit_configs_updated_at ON public.rate_limit_configs;
CREATE TRIGGER update_rate_limit_configs_updated_at
    BEFORE UPDATE ON public.rate_limit_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limit_configs_updated_at();

-- =============================================================================
-- SEED DEFAULT RATE LIMIT CONFIGS
-- =============================================================================

-- Insert default configs for each existing role
INSERT INTO public.rate_limit_configs (role_id, requests_per_minute, requests_per_hour, enabled)
SELECT 
    r.id,
    CASE 
        WHEN r.name = 'Admin' THEN 200
        WHEN r.name = 'Manager' THEN 100
        ELSE 60
    END,
    CASE 
        WHEN r.name = 'Admin' THEN 5000
        WHEN r.name = 'Manager' THEN 2000
        ELSE 1000
    END,
    true
FROM public.roles r
ON CONFLICT (role_id) DO NOTHING;

-- =============================================================================
-- RATE LIMITING PERMISSIONS
-- =============================================================================

INSERT INTO public.permissions (key, description) VALUES
    ('ratelimits.read', 'View rate limit configurations'),
    ('ratelimits.write', 'Modify rate limit configurations'),
    ('ratelimits.field.role', 'View role name in rate limits'),
    ('ratelimits.field.rpm', 'View requests per minute field'),
    ('ratelimits.field.rph', 'View requests per hour field'),
    ('ratelimits.field.enabled', 'View enabled status field'),
    ('ratelimits.action.edit', 'Edit rate limit values'),
    ('ratelimits.action.toggle', 'Enable/disable rate limits')
ON CONFLICT (key) DO NOTHING;

-- Assign rate limit permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'ratelimits.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
