-- =============================================================================
-- 082_FIX_ACTIVITY_LOGS_RELATIONSHIP
-- =============================================================================
-- Update the foreign key to point to profiles table for PostgREST join compatibility.

ALTER TABLE public.app_activity_logs 
DROP CONSTRAINT IF EXISTS app_activity_logs_user_id_fkey;

ALTER TABLE public.app_activity_logs
ADD CONSTRAINT app_activity_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema (optional but helpful)
NOTIFY pgrst, 'reload schema';
