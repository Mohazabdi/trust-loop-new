CREATE OR REPLACE FUNCTION groups.update_rotation_plan_details(
  p_plan_id UUID,
  p_rotation_name TEXT,
  p_start_date TIMESTAMPTZ,
  p_amount_collectable NUMERIC,
  p_rotation_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
    v_updated_rows INT;
BEGIN
    UPDATE groups.rotation_plan SET 
        rotation_name = p_rotation_name,
        rotation_description = p_rotation_description,
        start_date = p_start_date,
        amount_collectable = p_amount_collectable
    WHERE id = p_plan_id;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows = 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Plan not found or no changes made.'
        );
    END IF;
    UPDATE groups.plans SET 
        plan_name = p_rotation_name 
    WHERE id = p_plan_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Plan updated successfully.'
    );
END;
$$;
