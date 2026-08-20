-- agent-notes: { ctx: "5-hour retention & auto-prune policy for visitor_touchpoints", deps: ["visitor_touchpoints"], state: active, last: "sato@2026-08-20" }
-- =========================================================
-- Migration: 53_retention_5_hours_touchpoints.sql
-- Description: Auto-prune visitor_touchpoints logs older than 5 hours
-- =========================================================

-- 1. Immediate cleanup of touchpoint logs older than 5 hours
DELETE FROM public.visitor_touchpoints
WHERE created_at < NOW() - INTERVAL '5 hours';

-- 2. Trigger function to prune old logs on new inserts
CREATE OR REPLACE FUNCTION public.prune_old_visitor_touchpoints()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.visitor_touchpoints
    WHERE created_at < NOW() - INTERVAL '5 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on visitor_touchpoints table
DROP TRIGGER IF EXISTS trigger_prune_touchpoints ON public.visitor_touchpoints;

CREATE TRIGGER trigger_prune_touchpoints
AFTER INSERT ON public.visitor_touchpoints
FOR EACH STATEMENT
EXECUTE FUNCTION public.prune_old_visitor_touchpoints();
