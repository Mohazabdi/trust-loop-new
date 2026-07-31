CREATE OR REPLACE FUNCTION groups.waive_penalty(
    p_penalty_id UUID,
    p_admin_group_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups
AS $$
DECLARE
    v_plan_group UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get group id from the penalty's rotation plan via plans table
    SELECT p.group_id INTO v_plan_group
    FROM groups.rotation_penalty_applied rpa
    JOIN groups.rotation_collection_schedule rcs ON rcs.id = rpa.rotation_collection_schedule_id
    JOIN groups.member_schedule_settings mss ON mss.id = rcs.member_schedule_settings_id
    JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
    JOIN groups.rotation_plan rp ON rp.id = rpm.rotation_plan_id
    JOIN groups.plans p ON p.id = rp.plan_id
    WHERE rpa.id = p_penalty_id;

    IF v_plan_group IS NULL THEN
        RAISE EXCEPTION 'Penalty not found (ID: %)', p_penalty_id;
    END IF;

    -- Verify admin permission
    SELECT EXISTS (
        SELECT 1 FROM groups.group_members
        WHERE group_id = v_plan_group
          AND id = p_admin_group_member_id
          AND member_role = 'admin'
          AND member_status = 'active'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only an admin can waive penalties (admin_group_member_id: %)', p_admin_group_member_id;
    END IF;

    -- Update penalty status to 'waived' (updated_at will be set by trigger)
    UPDATE groups.rotation_penalty_applied
    SET penalty_status = 'waived'
    WHERE id = p_penalty_id;

    RETURN jsonb_build_object(
        'status', 'waived',
        'penalty_id', p_penalty_id
    );
END;
$$;
