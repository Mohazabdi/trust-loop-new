CREATE OR REPLACE FUNCTION groups.get_payout_requests(
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
            'id', pr.id,
            'schedule_id', pr.rotation_schedule_id,
            'requested_amount', pr.requested_amount,
            'status', pr.status,
            'description', pr.description,
            'created_at', pr.created_at,
            'member_name', m.first_name || ' ' || m.last_name,
            'member_id', m.id,
            'plan_name', rp.rotation_name,
            'plan_id', rpi.rotation_plan_id,
            'date_scheduled', rs.date_scheduled,
            'schedule_index', rs.rotation_schedule_index
        )
        ORDER BY pr.created_at DESC
    )
    INTO v_result
    FROM groups.payout_request pr
    JOIN groups.rotation_schedule rs ON pr.rotation_schedule_id = rs.id
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
    JOIN public.members m ON gm.member_id = m.id
    WHERE pr.requested_to = p_group_member_id
      AND pr.status = 'pending';

    RETURN public.build_response(
        true,
        jsonb_build_object('payout_requests', COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;