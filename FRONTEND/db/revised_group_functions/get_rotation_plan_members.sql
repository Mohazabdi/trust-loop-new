CREATE OR REPLACE FUNCTION groups.get_rotation_plan_members(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT  jsonb_agg(
        jsonb_build_object(
            'rotation_plan_invite_id',rpi.id,
            'rotation_plan_id', rp.id,
            'rotation_name', rp.rotation_name,
            'group_member_id',gm.id,
            'member_first_name',m.first_name,
            'member_last_name',m.last_name,
            'member_role',gm.member_role,
            'invitation_status',rpi.rotation_invite_status
        
        ))
    INTO v_result
    FROM groups.rotation_plan_invite rpi
    INNER JOIN groups.rotation_plan rp 
        ON rp.id=rpi.rotation_plan_id
    INNER JOIN groups.group_members gm  
         ON rpi.group_member_id=gm.id
    INNER JOIN public.members m 
    ON m.id=gm.member_id  

    WHERE rp.id = p_rotation_plan_id;
    RETURN public.build_response(
        true,
        jsonb_build_object('group_member_rotation_invites',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;
