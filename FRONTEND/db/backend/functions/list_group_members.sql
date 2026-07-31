CREATE OR REPLACE FUNCTION groups.list_group_members(p_group_id UUID)
RETURNS TABLE(
    group_member_id UUID,
    member_id UUID,
    member_name TEXT,
    member_role TEXT,
    member_status TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SET search_path = groups, public
AS $$
BEGIN
    -- Validate group exists and is not deleted
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND group_status != 'deleted') THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- Return all members (including inactive/suspended – UI can filter)
    RETURN QUERY
    SELECT
        gm.id,
        gm.member_id,
        CONCAT(m.first_name, ' ', m.last_name),
        gm.member_role::TEXT,
        gm.member_status::TEXT,
        gm.created_at
    FROM groups.group_members gm
    INNER JOIN public.members m ON m.id = gm.member_id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.created_at ASC;
END;
$$;