CREATE OR REPLACE FUNCTION groups.update_rotation_payout_order(
    p_rotation_plan_member_id UUID,
    p_new_payout_order        INTEGER,
    p_editor_id               UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_locked          BOOLEAN;
    v_plan_id         UUID;
    v_group_id        UUID;
    v_admin_role      TEXT;
    v_member_status   TEXT;
BEGIN
    -- 1. Get rotation lock status, plan id, group id, and member status
    SELECT rp.rotation_locked, rp.id, p.group_id, rpm.rotation_member_status
    INTO v_locked, v_plan_id, v_group_id, v_member_status
    FROM groups.rotation_plan_members rpm
    JOIN groups.rotation_plan rp ON rp.id = rpm.rotation_plan_id
    JOIN groups.plans p ON p.id = rp.plan_id
    WHERE rpm.id = p_rotation_plan_member_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan member not found (ID: %)', p_rotation_plan_member_id;
    END IF;

    -- 2. Member must be active
    IF v_member_status != 'active' THEN
        RAISE EXCEPTION 'Cannot update payout order – member is not active (status: %)', v_member_status;
    END IF;

    -- 3. Rotation must not be locked
    IF v_locked THEN
        RAISE EXCEPTION 'Cannot update payout order – rotation plan is locked';
    END IF;

    -- 4. Editor must be an active admin of the group
    SELECT member_role::TEXT INTO v_admin_role
    FROM groups.group_members
    WHERE id = p_editor_id
      AND group_id = v_group_id
      AND member_status = 'active';

    IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only an active admin can update payout order (editor_id: %)', p_editor_id;
    END IF;

    -- 5. Validate new order is positive
    IF p_new_payout_order <= 0 THEN
        RAISE EXCEPTION 'payout_order must be a positive integer (got: %)', p_new_payout_order;
    END IF;

    -- 6. Optional: enforce uniqueness among active members (recommended)
    IF EXISTS (
        SELECT 1 FROM groups.rotation_plan_members
        WHERE rotation_plan_id = v_plan_id
          AND rotation_member_status = 'active'
          AND payout_order = p_new_payout_order
          AND id != p_rotation_plan_member_id
    ) THEN
        RAISE EXCEPTION 'Payout order % is already assigned to another active member', p_new_payout_order;
    END IF;

    -- 7. Update the order
    UPDATE groups.rotation_plan_members
    SET payout_order = p_new_payout_order
    WHERE id = p_rotation_plan_member_id;

    RETURN jsonb_build_object(
        'status', 'updated',
        'rotation_plan_member_id', p_rotation_plan_member_id,
        'payout_order', p_new_payout_order
    );
END;
$$;