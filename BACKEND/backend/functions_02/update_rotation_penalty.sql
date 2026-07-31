CREATE OR REPLACE FUNCTION groups.update_rotation_penalty(
    p_plan_id UUID,
    p_admin_group_member_id UUID,
    p_penalty_type TEXT,
    p_penalty_value NUMERIC,
    p_penalty_grace_days NUMERIC DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups
AS $$
DECLARE
    v_locked BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check rotation plan is not locked
    SELECT rotation_locked INTO v_locked FROM groups.rotation_plan WHERE id = p_plan_id;
    IF v_locked THEN
        RAISE EXCEPTION 'Cannot change penalty – rotation plan is locked (ID: %)', p_plan_id;
    END IF;
    -- Verify admin permission
    SELECT EXISTS (
        SELECT 1 FROM groups.group_members gm
        JOIN groups.rotation_plan rp ON rp.group_id = gm.group_id
        WHERE rp.id = p_plan_id
          AND gm.id = p_admin_group_member_id
          AND gm.member_role = 'admin'
          AND gm.member_status = 'active'
    ) INTO v_is_admin;
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only an admin can change penalty rules (admin_group_member_id: %)', p_admin_group_member_id;
    END IF;
    -- Validate penalty parameters
    IF p_penalty_type NOT IN ('fixed', 'percentage') THEN
        RAISE EXCEPTION 'penalty_type must be ''fixed'' or ''percentage''';
    END IF;
    IF p_penalty_type = 'percentage' AND (p_penalty_value < 0 OR p_penalty_value > 100) THEN
        RAISE EXCEPTION 'Percentage penalty must be between 0 and 100';
    END IF;
    IF p_penalty_type = 'fixed' AND p_penalty_value < 0 THEN
        RAISE EXCEPTION 'Fixed penalty cannot be negative';
    END IF;
    IF p_penalty_grace_days IS NOT NULL AND p_penalty_grace_days < 0 THEN
        RAISE EXCEPTION 'Grace days cannot be negative';
    END IF;
    -- Update the rotation plan
    UPDATE groups.rotation_plan
    SET penalty_type = p_penalty_type,
        penalty_value = p_penalty_value,
        penalty_grace_days = COALESCE(p_penalty_grace_days, penalty_grace_days),
        updated_at = now()
    WHERE id = p_plan_id;
    RETURN jsonb_build_object(
        'status', 'updated',
        'plan_id', p_plan_id,
        'penalty_type', p_penalty_type,
        'penalty_value', p_penalty_value,
        'penalty_grace_days', COALESCE(p_penalty_grace_days, (SELECT penalty_grace_days FROM groups.rotation_plan WHERE id = p_plan_id))
    );
END;
$$;