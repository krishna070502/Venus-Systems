-- =============================================================================
-- FIX PROFILES RELATIONSHIPS
-- =============================================================================
-- Migration: 057_fix_profiles_relationships.sql
-- Description: Updates foreign keys to point to public.profiles(id) instead of
--              auth.users(id) to enable PostgREST join discovery.
-- Date: 2026-01-13
-- =============================================================================

BEGIN;

-- 1. Staff Points
ALTER TABLE public.staff_points 
    DROP CONSTRAINT IF EXISTS staff_points_user_id_fkey,
    DROP CONSTRAINT IF EXISTS staff_points_created_by_fkey;

ALTER TABLE public.staff_points
    ADD CONSTRAINT staff_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
    ADD CONSTRAINT staff_points_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- 2. Sales
ALTER TABLE public.sales
    DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey;

ALTER TABLE public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id);

-- 3. Purchases
ALTER TABLE public.purchases
    DROP CONSTRAINT IF EXISTS purchases_created_by_fkey,
    DROP CONSTRAINT IF EXISTS purchases_committed_by_fkey;

ALTER TABLE public.purchases
    ADD CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    ADD CONSTRAINT purchases_committed_by_fkey FOREIGN KEY (committed_by) REFERENCES public.profiles(id);

-- 4. Inventory Ledger
ALTER TABLE public.inventory_ledger
    DROP CONSTRAINT IF EXISTS inventory_ledger_user_id_fkey;

ALTER TABLE public.inventory_ledger
    ADD CONSTRAINT inventory_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 5. Daily Settlements
ALTER TABLE public.daily_settlements
    DROP CONSTRAINT IF EXISTS daily_settlements_submitted_by_fkey,
    DROP CONSTRAINT IF EXISTS daily_settlements_approved_by_fkey;

ALTER TABLE public.daily_settlements
    ADD CONSTRAINT daily_settlements_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
    ADD CONSTRAINT daily_settlements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);

-- 6. Variance Logs
ALTER TABLE public.variance_logs
    DROP CONSTRAINT IF EXISTS variance_logs_resolved_by_fkey;

ALTER TABLE public.variance_logs
    ADD CONSTRAINT variance_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);

-- 7. User Shops (Assignments)
ALTER TABLE public.user_shops
    DROP CONSTRAINT IF EXISTS user_shops_user_id_fkey;

ALTER TABLE public.user_shops
    ADD CONSTRAINT user_shops_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. Manager Details
ALTER TABLE public.manager_details
    DROP CONSTRAINT IF EXISTS manager_details_user_id_fkey;

ALTER TABLE public.manager_details
    ADD CONSTRAINT manager_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 9. New User-Centric Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_staff_performance_leaderboard(
    p_store_id INTEGER DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    total_points INTEGER,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH global_sums AS (
        -- Calculate global sums for ALL users in specified date range
        SELECT 
            sp.user_id,
            SUM(sp.points_change)::INTEGER as total
        FROM public.staff_points sp
        WHERE (p_from_date IS NULL OR sp.effective_date >= p_from_date)
          AND (p_to_date IS NULL OR sp.effective_date <= p_to_date)
        GROUP BY sp.user_id
    ),
    ranked_users AS (
        -- Rank all users globally
        SELECT 
            gs.user_id,
            gs.total as total_points,
            RANK() OVER (ORDER BY gs.total DESC) as global_rank
        FROM global_sums gs
    )
    SELECT 
        ru.user_id,
        p.email as user_email,
        p.full_name as user_name,
        ru.total_points,
        ru.global_rank as rank
    FROM ranked_users ru
    JOIN public.profiles p ON ru.user_id = p.id
    -- If p_store_id is provided, only return users who have earned points at that store
    WHERE (p_store_id IS NULL OR ru.user_id IN (
        SELECT DISTINCT sp_inner.user_id 
        FROM public.staff_points sp_inner 
        WHERE sp_inner.store_id = p_store_id
    ))
    ORDER BY ru.total_points DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
