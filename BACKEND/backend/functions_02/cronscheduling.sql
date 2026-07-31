-- Enable extension (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule penalty job (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-overdue-penalties') THEN
        PERFORM cron.schedule(
            'apply-overdue-penalties',  -- job name
            '0 1 * * *',               -- daily at 1 AM
            'SELECT groups.apply_overdue_penalties();'
        );
    END IF;
END;
$$;

-- Schedule due‑marking job
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-due-schedules') THEN
        PERFORM cron.schedule(
            'mark-due-schedules',
            '0 0 * * *',               -- daily at midnight
            'SELECT groups.execute_scheduling();'
        );
    END IF;
END;
$$;