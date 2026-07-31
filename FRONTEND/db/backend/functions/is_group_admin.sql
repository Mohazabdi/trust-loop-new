CREATE OR REPLACE FUNCTION groups.is_group_admin(p_group_member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = groups, public
AS $$
    SELECT COALESCE(
        (SELECT member_role = 'admin' AND member_status = 'active'
         FROM groups.group_members
         WHERE id = p_group_member_id),
        FALSE
    );
$$;