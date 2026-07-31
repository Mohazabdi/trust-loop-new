CREATE OR REPLACE FUNCTION groups.get_member_cycle_progress(
  p_rotation_plan_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_amount_collectable NUMERIC;
    v_total_contributions NUMERIC;
    v_total_collected    NUMERIC;
    v_net_balance        NUMERIC;
    v_total_cycles       INT;
    v_fully_funded       INT;
    v_partial_amount     NUMERIC;
    v_current_cycle      INT;
    v_progress_pct       NUMERIC;
    v_cycles             jsonb;
BEGIN
    -- 1. Get the required amount per cycle and total cycles for this plan
    SELECT rp.amount_collectable, COUNT(*)
    INTO v_amount_collectable, v_total_cycles
    FROM groups.rotation_plan_members rpm
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.rotation_schedule rs ON rs.rotation_plan_member_id = rpm.id
    WHERE rpm.id = p_rotation_plan_member_id
      AND rs.schedule_action = 'collection'
    GROUP BY rp.amount_collectable;

    IF v_amount_collectable IS NULL THEN
        RETURN public.build_response(false, NULL, 'Rotation member not found');
    END IF;

    -- 2. Net balance (contributions minus already collected)
    SELECT COALESCE(SUM(ft.trans_amount), 0)
    INTO v_total_contributions
    FROM groups.rotation_reserve_amount_collected rrac
    JOIN finance.transactions ft ON rrac.transaction_id = ft.id
    WHERE rrac.rotation_plan_member_id = p_rotation_plan_member_id;

    SELECT COALESCE(SUM(sac.amount_recorded), 0)
    INTO v_total_collected
    FROM groups.schedule_amount_collected sac
    JOIN groups.rotation_schedule rs ON sac.rotation_schedule = rs.id
    WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id;

    v_net_balance := v_total_contributions - v_total_collected;

    -- 3. Calculate cycle statuses
    v_fully_funded := LEAST(FLOOR(v_net_balance / v_amount_collectable)::INT, v_total_cycles);
    v_partial_amount := v_net_balance - (v_fully_funded * v_amount_collectable);
    v_current_cycle := CASE
        WHEN v_fully_funded >= v_total_cycles THEN v_total_cycles
        ELSE v_fully_funded + 1
    END;
    v_progress_pct := LEAST((v_net_balance / (v_total_cycles * v_amount_collectable)) * 100, 100);

    -- 4. Build array of cycles with statuses, joining schedule completion data
    WITH cycle_dates AS (
        -- Each distinct date_scheduled is one cycle
        SELECT
            rs.date_scheduled,
            ROW_NUMBER() OVER (ORDER BY rs.date_scheduled) AS cycle_idx,
            bool_and(rs.schedule_status = 'disbursed') AS all_collections_completed
        FROM groups.rotation_schedule rs
        WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id
          AND rs.schedule_action = 'collection'
        GROUP BY rs.date_scheduled
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'cycle_number', cd.cycle_idx,
            'is_complete', COALESCE(cd.all_collections_completed, false),
            'is_reserved', cd.cycle_idx <= v_fully_funded
                            OR (cd.cycle_idx = v_current_cycle AND v_partial_amount > 0),
            'contributed_amount', CASE
                WHEN cd.cycle_idx <= v_fully_funded THEN v_amount_collectable
                WHEN cd.cycle_idx = v_current_cycle THEN v_partial_amount
                ELSE 0
            END
        )
        ORDER BY cd.cycle_idx
    )
    INTO v_cycles
    FROM cycle_dates cd;

    -- 5. Return everything
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'net_balance', v_net_balance,
            'amount_collectable', v_amount_collectable,
            'total_cycles', v_total_cycles,
            'fully_funded_cycles', v_fully_funded,
            'current_cycle', v_current_cycle,
            'partial_amount', v_partial_amount,
            'progress_percentage', ROUND(v_progress_pct, 1),
            'cycles', COALESCE(v_cycles, '[]'::jsonb)
        )
    );
END;
$$;

---SELECT groups.get_member_cycle_progress('b6facd34-17d9-4267-9217-1679bb44de29');