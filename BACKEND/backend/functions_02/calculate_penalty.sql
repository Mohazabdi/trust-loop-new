CREATE OR REPLACE FUNCTION groups.calculate_penalty(
    p_rotation_plan_id UUID,
    p_member_schedule_settings_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SET search_path = groups
AS $$
DECLARE
    v_plan RECORD;
    v_amount_due NUMERIC;
    v_penalty NUMERIC := 0;
BEGIN
    SELECT penalty_type, penalty_value INTO v_plan
    FROM groups.rotation_plan WHERE id = p_rotation_plan_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan not found (ID: %)', p_rotation_plan_id;
    END IF;
    IF v_plan.penalty_value IS NULL OR v_plan.penalty_value <= 0 THEN
        RETURN 0;
    END IF;
    SELECT amount_payable INTO v_amount_due
    FROM groups.member_schedule_settings WHERE id = p_member_schedule_settings_id;
    IF v_plan.penalty_type = 'fixed' THEN
        v_penalty := v_plan.penalty_value;
    ELSE -- percentage
        v_penalty := (v_amount_due * v_plan.penalty_value / 100);
    END IF;
    RETURN ROUND(v_penalty, 2);
END;
$$;