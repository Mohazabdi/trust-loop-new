
CREATE OR REPLACE FUNCTION groups.get_member_rotation_invites(
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
    SELECT  jsonb_agg(
        jsonb_build_object(
            'id',rpi.id,
            'group_member_id',rpi.group_member_id,
            'expires_at',rpi.expires_at,
            'rotation_description',rp.rotation_description,
            'plan_name',rp.rotation_name,
            'interval_name',i.interval_name,
            'days_in_interval',i.no_of_days,
            'amount_collectable',rp.amount_collectable,
            'invited_by',COALESCE(creator_m.first_name ||' '|| creator_m.last_name,'N/A'),
            'created_at',rpi.created_at
        ))
    INTO v_result
    FROM groups.rotation_plan_invite rpi
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id=rp.id  
    JOIN groups.interval i ON rp.interval_id =i.id
    LEFT JOIN groups.group_members creator_gm ON rp.created_by = creator_gm.id
    LEFT JOIN public.members creator_m ON creator_gm.member_id = creator_m.id
    WHERE rpi.group_member_id=p_group_member_id AND rpi.rotation_invite_status='pending';
    RETURN public.build_response(
        true,
        jsonb_build_object('member_rotation_invites',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;
