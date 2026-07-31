CREATE OR REPLACE FUNCTION groups.add_member_to_rotation(
    p_rotation_plan_id UUID,
    p_group_member_id  UUID,
    p_amount_receivable NUMERIC DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_locked          BOOLEAN;
    v_group_id        UUID;
    v_is_member       BOOLEAN;
    v_current_status  TEXT;
BEGIN
    -- 1. Fetch rotation plan lock status and group_id (via plans)
    SELECT rp.rotation_locked, p.group_id
    INTO v_locked, v_group_id
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON p.id = rp.plan_id
    WHERE rp.id = p_rotation_plan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan not found (ID: %)', p_rotation_plan_id;
    END IF;

    -- 2. Validate rotation plan is not locked
    IF v_locked THEN
        RAISE EXCEPTION 'Cannot add member – rotation plan is locked (start date already passed or schedules generated)';
    END IF;

    -- 3. Verify group member is active in the group
    SELECT EXISTS (
        SELECT 1 FROM groups.group_members
        WHERE id = p_group_member_id
          AND group_id = v_group_id
          AND member_status = 'active'
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Group member (ID: %) is not an active member of the group (Group ID: %)',
            p_group_member_id, v_group_id;
    END IF;

    -- 4. Check existing membership record (including inactive/deleted)
    SELECT rotation_member_status INTO v_current_status
    FROM groups.rotation_plan_members
    WHERE rotation_plan_id = p_rotation_plan_id
      AND group_member_id = p_group_member_id;

    IF FOUND THEN
        -- Member already exists
        IF v_current_status = 'active' THEN
            RETURN jsonb_build_object(
                'status', 'already_exists',
                'message', 'Member is already active in the rotation plan',
                'rotation_plan_id', p_rotation_plan_id,
                'group_member_id', p_group_member_id
            );
        ELSE
            -- Reactivate member (set status back to active)
            UPDATE groups.rotation_plan_members
            SET rotation_member_status = 'active',
                amount_recievable = p_amount_receivable
            WHERE rotation_plan_id = p_rotation_plan_id
              AND group_member_id = p_group_member_id;

            RETURN jsonb_build_object(
                'status', 'reactivated',
                'rotation_plan_id', p_rotation_plan_id,
                'group_member_id', p_group_member_id,
                'amount_receivable', p_amount_receivable
            );
        END IF;
    ELSE
        -- New member: insert with active status
        INSERT INTO groups.rotation_plan_members (
            group_member_id,
            rotation_plan_id,
            amount_recievable,
            rotation_plan_members_status,
            rotation_member_status
        )
        VALUES (
            p_group_member_id,
            p_rotation_plan_id,
            p_amount_receivable,
            'pending',
            'active'
        );

        RETURN jsonb_build_object(
            'status', 'added',
            'rotation_plan_id', p_rotation_plan_id,
            'group_member_id', p_group_member_id,
            'amount_receivable', p_amount_receivable
        );
    END IF;
END;
$$;