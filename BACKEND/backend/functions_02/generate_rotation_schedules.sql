CREATE OR REPLACE FUNCTION groups.generate_rotation_schedules(
    p_rotation_plan_id    UUID,
    p_contribution_amount NUMERIC,
    p_interval_days       INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_plan        RECORD;           -- rotation plan details
    v_member      RECORD;           -- each rotation member
    v_cycle       INTEGER;          -- current cycle number
    v_due_date    TIMESTAMPTZ;      -- calculated due date for the cycle
    v_setting_id  UUID;             -- ID of newly created member_schedule_settings
    v_member_cnt  INTEGER;          -- number of active members
    v_sched_cnt   INTEGER := 0;     -- total schedule entries created
BEGIN
    -- 1. Lock the rotation plan to prevent concurrent schedule generation
    SELECT id, start_date, rotation_locked
    INTO v_plan
    FROM groups.rotation_plan
    WHERE id = p_rotation_plan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan not found (ID: %)', p_rotation_plan_id;
    END IF;

    -- 2. Validate that the plan is not already locked
    IF v_plan.rotation_locked THEN
        RAISE EXCEPTION 'Rotation plan is already locked (schedules may have been generated or start date passed)';
    END IF;

    -- 3. Ensure start date is in the future
    IF v_plan.start_date IS NULL THEN
        RAISE EXCEPTION 'Rotation plan must have a start date';
    END IF;
    IF v_plan.start_date <= now() THEN
        RAISE EXCEPTION 'Cannot generate schedules because start date has already passed (start_date: %)', v_plan.start_date;
    END IF;

    -- 4. Count active members who are still pending payout (not yet completed)
    SELECT COUNT(*)
    INTO v_member_cnt
    FROM groups.rotation_plan_members
    WHERE rotation_plan_id = p_rotation_plan_id
      AND rotation_member_status = 'active'          -- not soft‑deleted
      AND rotation_plan_members_status = 'pending'; -- not yet paid out

    IF v_member_cnt = 0 THEN
        RETURN jsonb_build_object(
            'error', 'No active members in rotation plan – cannot generate schedules'
        );
    END IF;

    -- 5. For each cycle (one per member), create a due date and a schedule entry for every active member
    FOR v_cycle IN 1..v_member_cnt LOOP
        -- Calculate due date for this cycle (start_date + (cycle-1) * interval_days)
        v_due_date := v_plan.start_date + ((v_cycle - 1) * p_interval_days || ' days')::interval;

        -- For each active member, insert a schedule setting and a collection schedule row
        FOR v_member IN
            SELECT rpm.id AS rpm_id
            FROM groups.rotation_plan_members rpm
            WHERE rpm.rotation_plan_id = p_rotation_plan_id
              AND rpm.rotation_member_status = 'active'
              AND rpm.rotation_plan_members_status = 'pending'
        LOOP
            -- Create a record in member_schedule_settings (amount payable per cycle, cycle index)
            INSERT INTO groups.member_schedule_settings (
                rotation_plan_member_id,
                amount_payable,
                schedule_index
            )
            VALUES (v_member.rpm_id, p_contribution_amount, v_cycle)
            RETURNING id INTO v_setting_id;

            -- Create the actual collection schedule entry (due date, initial collected amount = 0, status = 'upcoming')
            INSERT INTO groups.rotation_collection_schedule (
                member_schedule_settings_id,
                due_date,
                amount_collected,
                rotation_collection_schedule_status
            )
            VALUES (v_setting_id, v_due_date, 0, 'upcoming');

            v_sched_cnt := v_sched_cnt + 1;
        END LOOP;
    END LOOP;

    -- 6. Lock the rotation plan after successful schedule generation
    UPDATE groups.rotation_plan
    SET rotation_locked = TRUE
    WHERE id = p_rotation_plan_id;

    -- 7. Return summary
    RETURN jsonb_build_object(
        'status', 'schedules_generated_and_locked',
        'total_entries', v_sched_cnt,
        'number_of_cycles', v_member_cnt,
        'contribution_amount', p_contribution_amount,
        'interval_days', p_interval_days,
        'first_due_date', (v_plan.start_date)::text
    );
END;
$$;