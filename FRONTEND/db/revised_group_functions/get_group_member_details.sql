CREATE OR REPLACE FUNCTION groups.get_group_member_detail(
  p_group_id UUID,
  p_member_id UUID
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
SELECT
    jsonb_build_object(
            'id',gm.id,
            'group_id',gm.group_id ,
            'group_name',g.group_name,
            'group_description',g.group_description,
            'group_ref',g.group_ref,
            'group_visibility',g.group_visibility,
            'group_cover_photo_url',g.group_cover_photo_url,
            'max_capacity',g.max_capacity,
            'min_capacity',g.min_capacity,
            'group_status',g.group_status,
            'group_updated_at',g.updated_at,
            'group_created_at', g.created_at,
            'member_id', gm.member_id,
            'first_name',m.first_name,
            'last_name',m.last_name,
            'member_role', gm.member_role,
            'group_member_code',gm.member_code,
            'group_member_status', gm.member_status,
            'group_member_created_at', gm.created_at
        ) 
    INTO v_result
    FROM groups.group_members gm
    INNER JOIN public.groups g
        ON gm.group_id = g.id
    INNER JOIN public.members m
        ON gm.member_id = m.id
    WHERE gm.group_id=p_group_id AND gm.member_id=p_member_id;

   IF v_result IS NULL THEN
        RETURN public.build_response(
            false,
            NULL,
            'P0001',
            'Group member not found',
            format('No active membership for group %s and member %s', p_group_id, p_member_id)
        );
    END IF;

    RETURN public.build_response(true, jsonb_build_object('group_member_data', v_result));
END;
$$;