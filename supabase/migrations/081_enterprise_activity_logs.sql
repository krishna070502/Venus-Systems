-- =============================================================================
-- 081_ENTERPRISE_ACTIVITY_LOGS
-- =============================================================================
-- Comprehensive activity logging for authentication and session events.

CREATE TABLE IF NOT EXISTS public.app_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- LOGIN, LOGOUT, LOGIN_FAILURE, SIGNUP, REFRESH_TOKEN
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    device_type TEXT,
    location_city TEXT,
    location_country TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.app_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view all activity logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_activity_logs' AND policyname = 'Admins can view all activity logs'
    ) THEN
        CREATE POLICY "Admins can view all activity logs"
          ON public.app_activity_logs FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
            )
          );
    END IF;

    -- Users can view their own activity logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_activity_logs' AND policyname = 'Users can view their own activity logs'
    ) THEN
        CREATE POLICY "Users can view their own activity logs"
          ON public.app_activity_logs FOR SELECT
          TO authenticated
          USING (user_id = auth.uid());
    END IF;
END
$$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.app_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.app_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.app_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON public.app_activity_logs(status);

-- Grant permissions
GRANT ALL ON public.app_activity_logs TO postgres;
GRANT ALL ON public.app_activity_logs TO service_role;
GRANT SELECT ON public.app_activity_logs TO authenticated;
GRANT INSERT ON public.app_activity_logs TO authenticated;
GRANT INSERT ON public.app_activity_logs TO anon; -- Allow logging failed attempts from anon
