
CREATE OR REPLACE FUNCTION groups.delete_plan(
  p_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
v_deleted_rows INT;
BEGIN
    DELETE FROM groups.plans WHERE id=p_plan_id;
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
     IF v_deleted_rows > 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Plan deleted successfully.'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Plan not found or already deleted.'
        );
    END IF;
END;
$$;

