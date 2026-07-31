CREATE OR REPLACE FUNCTION groups.record_disbursement(
    p_rotation_plan_member_id UUID,
    p_amount                  NUMERIC,
    p_transaction_id          UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public, finance
AS $$
DECLARE
    v_plan_id            UUID;
    v_current_cycle      INTEGER;
    v_payout_order       INTEGER;
    v_total_collected    NUMERIC;
    v_member_cnt         INTEGER;
    v_completed_cnt      INTEGER;
    v_disb_id            UUID;
    v_code               TEXT;
BEGIN
    -- 1. Get the rotation plan id and current cycle from the plan
    SELECT rp.id, rp.current_cycle
    INTO v_plan_id, v_current_cycle
    FROM groups.rotation_plan rp
    WHERE rp.id = (
        SELECT rpm.rotation_plan_id
        FROM groups.rotation_plan_members rpm
        WHERE rpm.id = p_rotation_plan_member_id
    )
    FOR UPDATE;  -- lock the plan row to prevent race conditions

    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Rotation plan not found for this member (rotation_plan_member_id: %)', p_rotation_plan_member_id;
    END IF;

    -- 2. Get the member's payout order (must be set)
    SELECT rpm.payout_order INTO v_payout_order
    FROM groups.rotation_plan_members rpm
    WHERE rpm.id = p_rotation_plan_member_id;
    IF v_payout_order IS NULL THEN
        RAISE EXCEPTION 'Payout order not set for this member (rotation_plan_member_id: %)', p_rotation_plan_member_id;
    END IF;

    -- 3. Enforce ROSCA rule: the recipient must match the current cycle
    IF v_payout_order != v_current_cycle THEN
        RAISE EXCEPTION 'This member is not the scheduled recipient for cycle %. Expected: %, actual: %',
            v_current_cycle, v_current_cycle, v_payout_order;
    END IF;

    -- 4. Count all active members in the rotation
    SELECT COUNT(*)
    INTO v_member_cnt
    FROM groups.rotation_plan_members
    WHERE rotation_plan_id = v_plan_id
      AND rotation_member_status = 'active';

    -- 5. Count how many active members have completed their payment for this cycle
    SELECT COUNT(DISTINCT rpm.id)
    INTO v_completed_cnt
    FROM groups.rotation_plan_members rpm
    JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
    WHERE rpm.rotation_plan_id = v_plan_id
      AND rpm.rotation_member_status = 'active'
      AND mss.schedule_index = v_current_cycle
      AND rcs.rotation_collection_schedule_status = 'completed';

    IF v_completed_cnt < v_member_cnt THEN
        RAISE EXCEPTION 'Not all active members have completed contributions for cycle %. % of % completed',
            v_current_cycle, v_completed_cnt, v_member_cnt;
    END IF;

    -- 6. Calculate total collected in this cycle (sum over all active members)
    SELECT COALESCE(SUM(rcs.amount_collected), 0)
    INTO v_total_collected
    FROM groups.rotation_plan_members rpm
    JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
    WHERE rpm.rotation_plan_id = v_plan_id
      AND rpm.rotation_member_status = 'active'
      AND mss.schedule_index = v_current_cycle;

    IF p_amount > v_total_collected THEN
        RAISE EXCEPTION 'Disbursement amount (%) exceeds total collected (%) for cycle %',
            p_amount, v_total_collected, v_current_cycle;
    END IF;

    -- 7. Verify transaction exists (optional – safety)
    IF NOT EXISTS (SELECT 1 FROM finance.transactions WHERE id = p_transaction_id) THEN
        RAISE EXCEPTION 'Transaction not found (ID: %)', p_transaction_id;
    END IF;

    -- 8. Insert disbursement record (idempotent)
    INSERT INTO groups.rotation_disbursed (
        transaction_id,
        rotation_plan_member_id,
        amount_disbursed
    )
    VALUES (p_transaction_id, p_rotation_plan_member_id, p_amount)
    ON CONFLICT (transaction_id, rotation_plan_member_id) DO NOTHING
    RETURNING id, rotation_disbursed_code INTO v_disb_id, v_code;

    IF v_disb_id IS NULL THEN
        RAISE EXCEPTION 'Disbursement already exists for this transaction and member';
    END IF;

    -- 9. Mark the recipient as completed (received payout)
    UPDATE groups.rotation_plan_members
    SET rotation_plan_members_status = 'completed',
        amount_recievable = p_amount
    WHERE id = p_rotation_plan_member_id;

    -- 10. Advance the current cycle to the next one
    UPDATE groups.rotation_plan
    SET current_cycle = v_current_cycle + 1
    WHERE id = v_plan_id;

    -- 11. Return success
    RETURN jsonb_build_object(
        'disbursement_id', v_disb_id,
        'code', v_code,
        'status', 'disbursed',
        'cycle', v_current_cycle,
        'recipient_member_id', p_rotation_plan_member_id,
        'amount', p_amount
    );
END;
$$;