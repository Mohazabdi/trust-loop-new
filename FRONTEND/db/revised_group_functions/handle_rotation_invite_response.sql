
CREATE OR REPLACE FUNCTION groups.handle_rotation_plan_invite_response(
  p_rotation_plan_invite_id UUID,
  p_response_type groups.rotation_invite_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
v_invite_message TEXT;
v_rows_updated INT;
BEGIN
    IF p_response_type='accepted' THEN 
      UPDATE groups.rotation_plan_invite 
        SET rotation_invite_status =p_response_type 
        WHERE id=p_rotation_plan_invite_id ;
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      if v_rows_updated>0 THEN
      INSERT INTO groups.rotation_plan_members(intive_id,rotation_plan_members_status)
      VALUES (p_rotation_plan_invite_id,'pending');
      v_invite_message:='Invite has been accepted succesfully';
      END IF;
    ELSIF p_response_type='declined' THEN 
      UPDATE groups.rotation_plan_invite 
      SET rotation_invite_status =p_response_type 
      WHERE id=p_rotation_plan_invite_id ;
       v_invite_message:='Invite has been declined succesfully';
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    END IF;
    IF v_rows_updated > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', v_invite_message
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invite not found or no changes made.'
        );
    END IF;
END;
$$;

