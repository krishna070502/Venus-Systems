-- =============================================================================
-- SYSTEM SETTINGS TABLE
-- =============================================================================
-- Migration: 026_create_system_settings_table.sql
-- Description: Creates system_settings table for app configuration
-- Date: 2024-11-30
-- =============================================================================

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'string', -- string, boolean, number, json
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_system_settings_updated_at();

-- Seed default settings
INSERT INTO public.system_settings (key, value, value_type, description) VALUES
    ('registration_enabled', 'true', 'boolean', 'Allow new users to sign up'),
    ('maintenance_mode', 'false', 'boolean', 'Disable access for non-admin users'),
    ('app_name', 'Venus Chicken', 'string', 'Application display name'),
    ('support_email', '', 'string', 'Support contact email'),
    ('api_version', '1.0.0', 'string', 'Current API version')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
