CREATE OR REPLACE FUNCTION groups.get_rotation_members(p_rotation_plan_id UUID)
RETURNS TABLE(
    rotation_member_id UUID,
    group_member_id UUID,
    member_name TEXT,
    amount_receivable NUMERIC,
    status TEXT,
    payout_order INTEGER
)
LANGUAGE sql STABLE
SET search_path = groups, public
AS $$
    SELECT
        rpm.id,
        rpm.group_member_id,
        CONCAT(m.first_name, ' ', m.last_name) AS member_name,
        rpm.amount_recievable,
        rpm.rotation_plan_members_status::TEXT,
        rpm.payout_order
    FROM groups.rotation_plan_members rpm
    JOIN groups.group_members gm ON gm.id = rpm.group_member_id
    JOIN public.members m ON m.id = gm.member_id
    WHERE rpm.rotation_plan_id = p_rotation_plan_id
      AND rpm.rotation_member_status = 'active'
    ORDER BY rpm.payout_order;
$$;