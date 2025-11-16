-- Migration: Remove single-deal limitation to enable multi-deal pipeline
-- Epic: E-001 Multi-Deal Pipeline Support
-- Tasks: E-001-T-01, E-001-T-02

-- =============================================
-- Remove Single-Deal Enforcement
-- =============================================

-- Drop the trigger that auto-archives old deals
DROP TRIGGER IF EXISTS auto_archive_old_deals ON public.deals;

-- Drop the function that archives old active deals
DROP FUNCTION IF EXISTS public.archive_old_active_deals();

-- Drop the unique index that enforces one active deal per user
DROP INDEX IF EXISTS public.idx_one_active_deal_per_user;

-- =============================================
-- Add Performance Indexes for Multi-Deal Queries
-- =============================================

-- Index for fetching user's active deals (used in deal selector, list views)
CREATE INDEX IF NOT EXISTS idx_deals_user_status
ON public.deals(user_id, status)
WHERE status = 'active';

-- Index for sorting deals by creation date (used in deal list)
CREATE INDEX IF NOT EXISTS idx_deals_user_created
ON public.deals(user_id, created_at DESC);

-- Index for filtering deals by stage (used in pipeline views)
CREATE INDEX IF NOT EXISTS idx_deals_stage_status
ON public.deals(stage, status)
WHERE status = 'active';

-- Index for deal value sorting (used in deal list sorting)
CREATE INDEX IF NOT EXISTS idx_deals_value
ON public.deals(deal_value DESC)
WHERE status = 'active';

-- =============================================
-- Verify RLS Policies (No changes needed)
-- =============================================
-- The existing RLS policies already support multiple deals per user:
-- - Users can view/create/update/delete their own deals (filtered by user_id)
-- - No policy restricts the number of active deals

-- =============================================
-- Test Queries
-- =============================================
-- After this migration, users should be able to:
-- 1. Create multiple active deals: INSERT INTO deals (user_id, account_name, deal_value, expected_close_month, status) VALUES (...)
-- 2. Query all active deals: SELECT * FROM deals WHERE user_id = auth.uid() AND status = 'active'
-- 3. Update deal stages without conflicts: UPDATE deals SET stage = 'Demo' WHERE id = ...

-- =============================================
-- Rollback Instructions (if needed)
-- =============================================
-- To rollback this migration, run:
--
-- CREATE UNIQUE INDEX idx_one_active_deal_per_user
-- ON public.deals(user_id)
-- WHERE status = 'active';
--
-- CREATE OR REPLACE FUNCTION public.archive_old_active_deals()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.status = 'active' THEN
--     UPDATE public.deals
--     SET status = 'archived', updated_at = now()
--     WHERE user_id = NEW.user_id
--     AND status = 'active'
--     AND id != NEW.id;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
--
-- CREATE TRIGGER auto_archive_old_deals
-- BEFORE INSERT ON public.deals
-- FOR EACH ROW
-- EXECUTE FUNCTION public.archive_old_active_deals();
