CREATE OR REPLACE FUNCTION groups.record_contribution(
    p_schedule_id UUID,
    p_amount      NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public, finance
AS $$
DECLARE
    v_schedule          RECORD;
    v_setting           RECORD;
    v_remaining         NUMERIC;
    v_paid              NUMERIC;
    v_overpay           NUMERIC := 0;
    v_new_status        TEXT;
    v_next_schedule_id  UUID;
    v_txn_id            UUID;
BEGIN
    -- Lock the schedule row
    SELECT * INTO v_schedule
    FROM groups.rotation_collection_schedule
    WHERE id = p_schedule_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule entry not found (ID: %)', p_schedule_id;
    END IF;

    -- Cannot modify a completed schedule
    IF v_schedule.rotation_collection_schedule_status = 'completed' THEN
        RAISE EXCEPTION 'This contribution schedule is already completed';
    END IF;

    -- Get the required amount and associated rotation_plan_member_id
    SELECT mss.amount_payable, mss.rotation_plan_member_id
    INTO v_setting.amount_payable, v_setting.rotation_plan_member_id
    FROM groups.member_schedule_settings mss
    WHERE mss.id = v_schedule.member_schedule_settings_id;

    -- Calculate remaining needed
    v_remaining := v_setting.amount_payable - v_schedule.amount_collected;

    -- Determine payment allocation
    IF p_amount >= v_remaining THEN
        v_paid := v_remaining;
        v_overpay := p_amount - v_remaining;
        v_new_status := 'completed';
    ELSE
        v_paid := p_amount;
        v_overpay := 0;
        v_new_status := 'partial';
    END IF;

    -- Update current schedule with cast to enum
    UPDATE groups.rotation_collection_schedule
    SET amount_collected = amount_collected + v_paid,
        rotation_collection_schedule_status = v_new_status::groups.rotation_collection_schedule_status
    WHERE id = p_schedule_id;

    -- Record transaction
    INSERT INTO finance.transactions (trans_type, trans_amount, currency, trans_status, trans_description)
    VALUES ('contribution', v_paid, 'KES', 'completed', format('Contribution for schedule %s', p_schedule_id))
    RETURNING id INTO v_txn_id;

    -- Handle overpayment: carry over to next cycle for the same member
    IF v_overpay > 0 THEN
        SELECT rcs.id INTO v_next_schedule_id
        FROM groups.rotation_collection_schedule rcs
        JOIN groups.member_schedule_settings mss2 ON mss2.id = rcs.member_schedule_settings_id
        WHERE mss2.rotation_plan_member_id = v_setting.rotation_plan_member_id
          AND mss2.schedule_index > (
              SELECT schedule_index
              FROM groups.member_schedule_settings
              WHERE id = v_schedule.member_schedule_settings_id
          )
        ORDER BY mss2.schedule_index
        LIMIT 1;

        IF v_next_schedule_id IS NOT NULL THEN
            UPDATE groups.rotation_collection_schedule
            SET amount_collected = amount_collected + v_overpay
            WHERE id = v_next_schedule_id;

            -- If that schedule was 'upcoming', change to 'partial'
            UPDATE groups.rotation_collection_schedule
            SET rotation_collection_schedule_status = 'partial'::groups.rotation_collection_schedule_status
            WHERE id = v_next_schedule_id
              AND rotation_collection_schedule_status = 'upcoming';
        ELSE
            RAISE NOTICE 'Overpayment of % has no next cycle – consider refund or credit', v_overpay;
        END IF;
    END IF;

    -- Return result
    RETURN jsonb_build_object(
        'status', 'recorded',
        'schedule_id', p_schedule_id,
        'amount_applied', v_paid,
        'overpayment_carried', v_overpay,
        'new_schedule_status', v_new_status,
        'transaction_id', v_txn_id
    );
END;
$$;