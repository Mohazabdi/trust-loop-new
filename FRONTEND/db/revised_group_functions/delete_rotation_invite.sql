
CREATE OR REPLACE FUNCTION groups.delete_rotation_invite(
  p_rotation_plan_invite_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
v_deleted_rows INT;
BEGIN
    DELETE FROM groups.rotation_plan_invite WHERE id=p_rotation_plan_invite_id;
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
     IF v_deleted_rows > 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Invite deleted successfully.'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invite not found or already deleted.'
        );
    END IF;
END;
$$;

