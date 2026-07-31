CREATE OR REPLACE FUNCTION groups.process_daily_rotation_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan RECORD;
    v_collection_result jsonb;
    v_payout_result jsonb;
    v_total_collections INT := 0;
    v_total_payouts INT := 0;
BEGIN
    -- Loop through all active rotation plans
    FOR v_plan IN
        SELECT rp.id AS plan_id
        FROM groups.rotation_plan rp
        WHERE rp.rotation_status = 'active'
    LOOP
        -- 1. Process collections for today
        v_collection_result := groups.process_due_collections(
            v_plan.plan_id,
            now()::timestamptz
        );
        IF (v_collection_result->>'success')::boolean THEN
            v_total_collections := v_total_collections +
                COALESCE((v_collection_result->'data'->>'total_processed')::INT, 0);
        END IF;

        -- 2. Create payout requests for today
        v_payout_result := groups.get_due_payouts(
            v_plan.plan_id,
            now()::timestamptz
        );
        IF (v_payout_result->>'success')::boolean THEN
            v_total_payouts := v_total_payouts +
                COALESCE((v_payout_result->'data'->>'new_requests')::INT, 0);
        END IF;
    END LOOP;

    RETURN public.build_response(
        true,
        jsonb_build_object(
            'message', 'Daily rotation tasks completed',
            'collections_processed', v_total_collections,
            'payout_requests_created', v_total_payouts
        )
    );
END;
$$;