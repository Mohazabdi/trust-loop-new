CREATE OR REPLACE FUNCTION groups.apply_overdue_penalties()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public, finance
AS $$
DECLARE
    v_schedule RECORD;
    v_penalty  NUMERIC;
    v_txn_id   UUID;
    v_applied  INTEGER := 0;
BEGIN
    FOR v_schedule IN
        SELECT 
            rcs.id AS schedule_id,
            mss.id AS mss_id,
            rp.id AS plan_id,
            rp.penalty_grace_days,
            rp.penalty_type,
            rp.penalty_value
        FROM groups.rotation_collection_schedule rcs
        JOIN groups.member_schedule_settings mss ON mss.id = rcs.member_schedule_settings_id
        JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
        JOIN groups.rotation_plan rp ON rp.id = rpm.rotation_plan_id
        WHERE rcs.rotation_collection_schedule_status = 'due'
          AND rcs.due_date + (COALESCE(rp.penalty_grace_days, 0) || ' days')::interval < now()
          AND NOT EXISTS (
              SELECT 1 FROM groups.rotation_penalty_applied rpa
              WHERE rpa.rotation_collection_schedule_id = rcs.id
                AND rpa.penalty_status IN ('pending', 'deducted')
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        v_penalty := groups.calculate_penalty(v_schedule.plan_id, v_schedule.mss_id);
        IF v_penalty <= 0 THEN
            CONTINUE;
        END IF;
        INSERT INTO finance.transactions (trans_type, trans_amount, currency, trans_status, trans_description)
        VALUES ('penalty', v_penalty, 'KES', 'completed', 'Auto-applied late penalty')
        RETURNING id INTO v_txn_id;
        PERFORM groups.record_penalty(v_schedule.schedule_id, v_penalty, v_txn_id);
        v_applied := v_applied + 1;
    END LOOP;
    RETURN jsonb_build_object('penalties_applied', v_applied);
END;
$$;