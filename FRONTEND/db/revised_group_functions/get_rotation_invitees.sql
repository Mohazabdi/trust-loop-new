CREATE OR REPLACE FUNCTION groups.get_rotation_plan_invitees(
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
            'id',gm.id,
            'first_name',m.first_name,
            'last_name',m.last_name,
            'group_id',gm.group_id,
            'member_role',gm.member_role
        ))
    INTO v_result
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON rp.id=p.id 
    JOIN groups.group_members gm ON p.group_id=gm.group_id 
    JOIN public.members m ON gm.member_id=m.id 
    LEFT JOIN groups.rotation_plan_invite rpi 
    ON gm.id=rpi.group_member_id 
    AND rpi.rotation_plan_id = p_rotation_plan_id
    WHERE rp.id=p_rotation_plan_id 
    AND rpi.id IS NULL;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_plan_invitees',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;