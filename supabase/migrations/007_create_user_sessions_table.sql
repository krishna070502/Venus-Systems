-- Create user_sessions table to track active sessions with device info
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    location TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Index for quick lookups
    CONSTRAINT user_sessions_user_id_idx UNIQUE (user_id, ip_address, user_agent)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_last_activity_idx ON public.user_sessions(last_activity_at);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for admin)
CREATE POLICY "Service role has full access"
    ON public.user_sessions
    FOR ALL
    USING (true);

-- Function to clean up old sessions (optional - run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE last_activity_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
