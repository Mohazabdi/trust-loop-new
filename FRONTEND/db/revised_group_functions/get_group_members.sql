CREATE OR REPLACE FUNCTION groups.get_group_members(
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public,groups, pg_catalog
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id',gm.id,
            'group_id',gm.group_id ,
            'member_id', gm.member_id,
            'member_role', gm.member_role,
            'member_status', gm.member_status,
            'created_at', gm.created_at,
            'first_name',m.first_name,
            'last_name',m.last_name
        ) ORDER BY gm.created_at
    )
    INTO v_result
    FROM groups.group_members gm
    INNER JOIN public.groups g
        ON gm.group_id = g.id
    INNER JOIN public.members m
        ON gm.member_id = m.id
    WHERE gm.group_id=p_group_id;

    RETURN public.build_response(
        true,
        jsonb_build_object('group_members',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;
