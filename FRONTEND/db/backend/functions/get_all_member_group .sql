CREATE OR REPLACE FUNCTION groups.get_all_member_group(p_member_id UUID)
RETURNS TABLE(
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    number_of_members BIGINT,
    group_display_photo_url TEXT,
    group_status TEXT,
    no_of_unread_notifications BIGINT
)
LANGUAGE sql STABLE
SET search_path = groups, public
AS $$
    -- 1. Validate member exists? (optional – left to caller)
    -- 2. List all active groups where the member is active
    SELECT
        g.id,
        g.group_name,
        g.group_description,
        (SELECT COUNT(*) FROM groups.group_members gm2
         WHERE gm2.group_id = g.id AND gm2.member_status = 'active') AS number_of_members,
        g.group_display_photo_url,
        g.group_status::TEXT,
        COALESCE((
            SELECT COUNT(*)
            FROM groups.notifications n
            WHERE n.member_id = p_member_id AND n.is_read = false
        ), 0)::BIGINT AS no_of_unread_notifications
    FROM public.groups g
    INNER JOIN groups.group_members gm ON gm.group_id = g.id
    WHERE gm.member_id = p_member_id
      AND gm.member_status = 'active'
      AND g.group_status != 'deleted'
    ORDER BY g.created_at DESC;
$$;