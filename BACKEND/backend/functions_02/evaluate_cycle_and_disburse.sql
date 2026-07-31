CREATE OR REPLACE FUNCTION groups.evaluate_cycle_and_disburse()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public, finance
AS $$
DECLARE
    plan RECORD;
    v_cycle INTEGER;
    v_expected_pot NUMERIC;
    v_actual_pot NUMERIC;
    v_recipient_id UUID;
    v_txn_id UUID;
    v_completed_count INTEGER;
    v_member_count INTEGER;
    v_log JSONB := '[]';
BEGIN
    FOR plan IN
        SELECT 
            rp.id AS plan_id,
            rp.current_cycle,
            rp.disbursement_type,
            (SELECT COUNT(*) FROM groups.rotation_plan_members rpm WHERE rpm.rotation_plan_id = rp.id AND rpm.rotation_member_status = 'active') AS member_count,
            (SELECT amount_payable FROM groups.member_schedule_settings mss 
             JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id 
             WHERE rpm.rotation_plan_id = rp.id AND mss.schedule_index = rp.current_cycle LIMIT 1) AS contribution_amount
        FROM groups.rotation_plan rp
        WHERE rp.rotation_status = 'active' AND rp.rotation_locked = true
    LOOP
        v_cycle := plan.current_cycle;
        v_member_count := plan.member_count;
        IF plan.contribution_amount IS NULL THEN CONTINUE; END IF;
        v_expected_pot := v_member_count * plan.contribution_amount;

        -- Count how many members have completed this cycle
        SELECT COUNT(DISTINCT rpm.id)
        INTO v_completed_count
        FROM groups.rotation_plan_members rpm
        JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
        JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
        WHERE rpm.rotation_plan_id = plan.plan_id
          AND mss.schedule_index = v_cycle
          AND rpm.rotation_member_status = 'active'
          AND rcs.rotation_collection_schedule_status = 'completed';

        -- Calculate actual pot collected
        SELECT COALESCE(SUM(rcs.amount_collected), 0)
        INTO v_actual_pot
        FROM groups.rotation_plan_members rpm
        JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
        JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
        WHERE rpm.rotation_plan_id = plan.plan_id
          AND mss.schedule_index = v_cycle
          AND rpm.rotation_member_status = 'active';

        -- Check if due date has passed (any schedule for this cycle)
        IF EXISTS (
            SELECT 1 FROM groups.rotation_plan_members rpm
            JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
            JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
            WHERE rpm.rotation_plan_id = plan.plan_id AND mss.schedule_index = v_cycle AND rcs.due_date < now()
        ) THEN
            -- Cycle due date passed
            IF v_actual_pot = v_expected_pot THEN
                -- Full pot: disburse to scheduled recipient
                SELECT rpm.id INTO v_recipient_id
                FROM groups.rotation_plan_members rpm
                WHERE rpm.rotation_plan_id = plan.plan_id
                  AND rpm.payout_order = v_cycle
                  AND rpm.rotation_member_status = 'active';
                IF v_recipient_id IS NOT NULL THEN
                    INSERT INTO finance.transactions (trans_type, trans_amount, currency, trans_status, trans_description)
                    VALUES ('disbursement', v_actual_pot, 'KES', 'completed',
                            'Auto-disbursement after cycle due date for plan ' || plan.plan_id)
                    RETURNING id INTO v_txn_id;
                    PERFORM groups.record_disbursement(v_recipient_id, v_actual_pot, v_txn_id);
                    v_log := v_log || jsonb_build_object('plan_id', plan.plan_id, 'action', 'auto_disbursed', 'amount', v_actual_pot);
                END IF;
            ELSE
                -- Partial pot: switch to approval mode
                UPDATE groups.rotation_plan SET disbursement_type = 'approval', updated_at = now() WHERE id = plan.plan_id;
                v_log := v_log || jsonb_build_object('plan_id', plan.plan_id, 'action', 'switched_to_approval', 'expected', v_expected_pot, 'actual', v_actual_pot);
            END IF;
        ELSIF v_completed_count = v_member_count AND v_actual_pot = v_expected_pot THEN
            -- All completed before due date – immediate disbursement (cron will catch it next run, but we can also disburse now)
            SELECT rpm.id INTO v_recipient_id
            FROM groups.rotation_plan_members rpm
            WHERE rpm.rotation_plan_id = plan.plan_id AND rpm.payout_order = v_cycle AND rpm.rotation_member_status = 'active';
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO finance.transactions (trans_type, trans_amount, currency, trans_status, trans_description)
                VALUES ('disbursement', v_actual_pot, 'KES', 'completed',
                        'Auto-disbursement (all completed early) for plan ' || plan.plan_id)
                RETURNING id INTO v_txn_id;
                PERFORM groups.record_disbursement(v_recipient_id, v_actual_pot, v_txn_id);
                v_log := v_log || jsonb_build_object('plan_id', plan.plan_id, 'action', 'auto_disbursed_early', 'amount', v_actual_pot);
            END IF;
        END IF;
    END LOOP;
    RETURN jsonb_build_object('processed', v_log);
END;
$$;