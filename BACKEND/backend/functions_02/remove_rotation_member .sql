CREATE OR REPLACE FUNCTION groups.remove_rotation_member(
    p_rotation_plan_member_id UUID,
    p_editor_id               UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_locked      BOOLEAN;
    v_plan_id     UUID;
    v_group_id    UUID;
    v_admin_role  TEXT;
    v_current_status TEXT;
BEGIN
    -- 1. Fetch rotation plan lock status, plan id, group id, and current membership status
    SELECT rp.rotation_locked, rp.id, p.group_id, rpm.rotation_member_status
    INTO v_locked, v_plan_id, v_group_id, v_current_status
    FROM groups.rotation_plan_members rpm
    JOIN groups.rotation_plan rp ON rp.id = rpm.rotation_plan_id
    JOIN groups.plans p ON p.id = rp.plan_id
    WHERE rpm.id = p_rotation_plan_member_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan member not found (ID: %)', p_rotation_plan_member_id;
    END IF;

    -- 2. Prevent double removal
    IF v_current_status = 'deleted' THEN
        RAISE EXCEPTION 'Rotation plan member already removed (ID: %)', p_rotation_plan_member_id;
    END IF;

    -- 3. Verify rotation plan is not locked
    IF v_locked THEN
        RAISE EXCEPTION 'Cannot remove member – rotation plan is locked';
    END IF;

    -- 4. Verify editor is an active admin of the group
    SELECT member_role::TEXT INTO v_admin_role
    FROM groups.group_members
    WHERE id = p_editor_id
      AND group_id = v_group_id
      AND member_status = 'active';

    IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only an active admin can remove a member from the rotation';
    END IF;

    -- 5. Soft delete: set rotation_member_status = 'deleted'
    UPDATE groups.rotation_plan_members
    SET rotation_member_status = 'deleted'
    WHERE id = p_rotation_plan_member_id;

    -- 6. Return success
    RETURN jsonb_build_object(
        'status', 'removed',
        'rotation_plan_member_id', p_rotation_plan_member_id,
        'rotation_member_status', 'deleted'
    );
END;
$$;