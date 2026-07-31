CREATE OR REPLACE FUNCTION groups.get_group_rotations(p_group_id UUID)
RETURNS TABLE(
    plan_id UUID,
    rotation_name TEXT,
    start_date TIMESTAMPTZ,
    status TEXT,
    penalty_amount NUMERIC,
    member_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = groups, public
AS $$
    SELECT
        rp.id,
        rp.rotation_name,
        rp.start_date,
        rp.rotation_status::TEXT,
        rp.penalty_amount,
        COUNT(rpm.id) AS member_count
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON p.id = rp.plan_id
    LEFT JOIN groups.rotation_plan_members rpm ON rpm.rotation_plan_id = rp.id
    WHERE p.group_id = p_group_id AND rp.rotation_status <> 'deleted'
    GROUP BY rp.id, rp.rotation_name, rp.start_date, rp.rotation_status, rp.penalty_amount
    ORDER BY rp.created_at DESC;CREATE OR REPLACE FUNCTION groups.get_group_rotations(p_group_id UUID)
RETURNS TABLE(
    plan_id UUID,
    rotation_name TEXT,
    start_date TIMESTAMPTZ,
    status TEXT,
    penalty_type TEXT,
    penalty_value NUMERIC,
    penalty_grace_days NUMERIC,
    member_count BIGINT
)
LANGUAGE plpgsql   -- changed to plpgsql to allow validation
STABLE
SET search_path = groups, public
AS $$
BEGIN
    -- 1. Validate that the group exists and is not deleted (optional but recommended)
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND group_status != 'deleted') THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- 2. Return all rotation plans belonging to the group (via plans join)
    RETURN QUERY
    SELECT
        rp.id,
        rp.rotation_name,
        rp.start_date,
        rp.rotation_status::TEXT,
        rp.penalty_type,
        rp.penalty_value,
        rp.penalty_grace_days,
        COUNT(rpm.id) AS member_count
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON p.id = rp.plan_id
    LEFT JOIN groups.rotation_plan_members rpm ON rpm.rotation_plan_id = rp.id
    WHERE p.group_id = p_group_id
      AND rp.rotation_status <> 'deleted'
    GROUP BY rp.id
    ORDER BY rp.created_at DESC;
END;
$$;

$$;