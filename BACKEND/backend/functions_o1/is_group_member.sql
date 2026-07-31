CREATE OR REPLACE FUNCTION groups.is_group_member(
    p_group_id  UUID,
    p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = groups, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM groups.group_members
        WHERE group_id = p_group_id
          AND member_id = p_member_id
          AND member_status = 'active'
    );
$$;