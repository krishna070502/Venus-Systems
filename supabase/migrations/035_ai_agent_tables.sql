-- =============================================================================
-- AI AGENT TABLES AND PERMISSIONS
-- =============================================================================
-- Database schema for AI assistant with conversation history and role-based access

-- =============================================================================
-- AI CONVERSATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.ai_conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
    ON public.ai_conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON public.ai_conversations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================================
-- AI MESSAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_call_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages from their conversations
CREATE POLICY "Users can view messages from own conversations"
    ON public.ai_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c 
            WHERE c.id = conversation_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to own conversations"
    ON public.ai_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c 
            WHERE c.id = conversation_id AND c.user_id = auth.uid()
        )
    );

-- =============================================================================
-- AI AGENT CONFIGURATION TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    allowed_tables TEXT[] DEFAULT '{}',
    allowed_pages TEXT[] DEFAULT '{}',
    can_execute_actions BOOLEAN DEFAULT false,
    max_queries_per_hour INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id)
);

-- Enable RLS
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;

-- Viewable by authenticated users with permission
CREATE POLICY "AI configs viewable by authenticated"
    ON public.ai_agent_configs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "AI configs modifiable by admins"
    ON public.ai_agent_configs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_role ON public.ai_agent_configs(role_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_agent_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_agent_configs_updated_at ON public.ai_agent_configs;
CREATE TRIGGER update_ai_agent_configs_updated_at
    BEFORE UPDATE ON public.ai_agent_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_agent_configs_updated_at();

-- =============================================================================
-- SEED DEFAULT AI CONFIGS FOR ROLES
-- =============================================================================
INSERT INTO public.ai_agent_configs (role_id, enabled, allowed_tables, allowed_pages, can_execute_actions, max_queries_per_hour)
SELECT 
    r.id,
    CASE WHEN r.name = 'Admin' THEN true ELSE false END,
    CASE 
        WHEN r.name = 'Admin' THEN ARRAY['profiles', 'roles', 'permissions', 'shops', 'inventory_items', 'audit_logs']
        WHEN r.name = 'Manager' THEN ARRAY['profiles', 'shops', 'inventory_items']
        ELSE ARRAY['profiles']
    END,
    CASE 
        WHEN r.name = 'Admin' THEN ARRAY['*']
        WHEN r.name = 'Manager' THEN ARRAY['dashboard', 'shops', 'inventory']
        ELSE ARRAY['dashboard']
    END,
    CASE WHEN r.name = 'Admin' THEN true ELSE false END,
    CASE 
        WHEN r.name = 'Admin' THEN 500
        WHEN r.name = 'Manager' THEN 200
        ELSE 50
    END
FROM public.roles r
ON CONFLICT (role_id) DO NOTHING;

-- =============================================================================
-- AI PERMISSIONS
-- =============================================================================
INSERT INTO public.permissions (key, description) VALUES
    -- Core AI permissions
    ('ai.chat', 'Use AI assistant'),
    ('ai.admin', 'Configure AI settings'),
    ('ai.conversations.read', 'View conversation history'),
    ('ai.conversations.delete', 'Delete conversations'),
    
    -- Field-level permissions
    ('ai.field.tables', 'View allowed tables config'),
    ('ai.field.pages', 'View allowed pages config'),
    ('ai.field.actions', 'View action permissions'),
    ('ai.field.querylimit', 'View query limit'),
    
    -- Action permissions
    ('ai.action.configure', 'Edit AI role configs'),
    ('ai.action.toggle', 'Enable/disable AI for roles')
ON CONFLICT (key) DO NOTHING;

-- Assign AI permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'ai.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Give basic AI chat permission to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
  AND p.key IN ('ai.chat', 'ai.conversations.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;
