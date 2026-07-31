CREATE OR REPLACE FUNCTION groups.delete_rotation_plan(
    p_plan_id   UUID,
    p_editor_id UUID   -- groups.group_members.id of the admin
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_admin_role TEXT;
    v_plan_exists BOOLEAN;
BEGIN
    -- 1. Check if rotation plan exists and is not already deleted
    SELECT EXISTS (
        SELECT 1 FROM groups.rotation_plan WHERE id = p_plan_id AND rotation_status != 'deleted'
    ) INTO v_plan_exists;
    IF NOT v_plan_exists THEN
        RAISE EXCEPTION 'Rotation plan not found or already deleted (ID: %)', p_plan_id;
    END IF;

    -- 2. Verify editor is an active admin of the **group** (via plans)
    SELECT gm.member_role::TEXT INTO v_admin_role
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON p.id = rp.plan_id
    JOIN groups.group_members gm ON gm.group_id = p.group_id AND gm.id = p_editor_id
    WHERE rp.id = p_plan_id AND gm.member_status = 'active';

    IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only an active admin can delete the rotation plan (editor_id: %)', p_editor_id;
    END IF;

    -- 3. Soft delete the rotation plan
    UPDATE groups.rotation_plan
    SET rotation_status = 'deleted', updated_at = now()
    WHERE id = p_plan_id;

    -- 4. Return success
    RETURN jsonb_build_object('status', 'deleted', 'plan_id', p_plan_id);
END;
$$;