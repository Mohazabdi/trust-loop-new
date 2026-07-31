CREATE OR REPLACE FUNCTION groups.get_group_member_rotation_plans(
  p_group_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'rotation_plan_id', rp.id,
            'rotation_name', rp.rotation_name,
            'rotation_description',rp.rotation_description,
            'start_date',rp.start_date,
            'rotation_status',rp.rotation_status,
            'rotation_plan_member_id', rpm.id
        )
    )
    INTO v_result
    FROM groups.rotation_plan_members rpm
    INNER JOIN groups.rotation_plan_invite rpi 
        ON rpm.intive_id = rpi.id 
        AND rpi.rotation_invite_status = 'accepted'
    INNER JOIN groups.rotation_plan rp
         ON rpi.rotation_plan_id =rp.id
    WHERE rpi.group_member_id =p_group_member_id ;

    RETURN public.build_response(
        true,
        jsonb_build_object('group_member_rotation_plans',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;
