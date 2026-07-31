CREATE OR REPLACE FUNCTION groups.list_discoverable_groups(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    member_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = groups, public
AS $$
    -- 1. Ensure limit is between 1 and 100
    -- (PostgreSQL will handle the default, but we can add a CHECK later)
    -- 2. Return public, active groups that the user has not joined
    SELECT
        g.id,
        g.group_name,
        g.group_description,
        COUNT(gm.id) AS member_count,
        g.created_at
    FROM public.groups g
    LEFT JOIN groups.group_members gm ON gm.group_id = g.id AND gm.member_status = 'active'
    WHERE g.group_visibility = 'public'
      AND g.group_status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM groups.group_members gm2
          WHERE gm2.group_id = g.id
            AND gm2.member_id = p_user_id
            AND gm2.member_status = 'active'
      )
    GROUP BY g.id
    ORDER BY g.created_at DESC
    LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION groups.list_discoverable_groups(UUID, INTEGER) 
TO authenticated, anon;