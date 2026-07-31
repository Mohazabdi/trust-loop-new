CREATE OR REPLACE FUNCTION groups.get_sp_group_det(p_group_id UUID)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = groups, public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- 1. Fetch group with active member count
    SELECT jsonb_build_object(
        'id', g.id,
        'group_name', g.group_name,
        'group_ref', g.group_ref,
        'group_description', g.group_description,
        'group_visibility', g.group_visibility,
        'group_status', g.group_status,
        'max_capacity', g.max_capacity,
        'min_capacity', g.min_capacity,
        'created_by', g.created_by,
        'created_at', g.created_at,
        'updated_at', g.updated_at,
        'group_cover_photo_url', g.group_cover_photo_url,
        'group_display_photo_url', g.group_display_photo_url,
        'member_count', (
            SELECT COUNT(*)
            FROM groups.group_members gm
            WHERE gm.group_id = g.id AND gm.member_status = 'active'
        )
    )
    INTO v_result
    FROM public.groups g
    WHERE g.id = p_group_id AND g.group_status != 'deleted';

    -- 2. Error if not found
    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- 3. Return the JSON object
    RETURN v_result;
END;
$$;