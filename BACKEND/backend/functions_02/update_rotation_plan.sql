CREATE OR REPLACE FUNCTION groups.update_rotation_plan(
    p_plan_id               UUID,
    p_editor_id             UUID,
    p_rotation_name         TEXT DEFAULT NULL,
    p_rotation_description  TEXT DEFAULT NULL,
    p_start_date            TIMESTAMPTZ DEFAULT NULL,
    p_penalty_type          TEXT DEFAULT NULL,
    p_penalty_value         NUMERIC DEFAULT NULL,
    p_penalty_grace_days    NUMERIC DEFAULT NULL,
    p_amount_distributable  NUMERIC DEFAULT NULL,
    p_disbursement_type     groups.disbursement_type DEFAULT NULL,
    p_low_funds_options     groups.low_funds_options DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_locked          BOOLEAN;
    v_group_id        UUID;
    v_admin_role      TEXT;
    v_current_penalty_type TEXT;
BEGIN
    -- 1. Fetch lock status and group_id (via the plan)
    SELECT rp.rotation_locked, p.group_id
    INTO v_locked, v_group_id
    FROM groups.rotation_plan rp
    JOIN groups.plans p ON p.id = rp.plan_id
    WHERE rp.id = p_plan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rotation plan not found (ID: %)', p_plan_id;
    END IF;

    -- 2. Check if the plan is locked
    IF v_locked THEN
        RAISE EXCEPTION 'Cannot update – rotation plan is locked (start date already passed or schedules generated)';
    END IF;

    -- 3. Verify editor is an active admin of the group
    SELECT member_role::TEXT INTO v_admin_role
    FROM groups.group_members
    WHERE id = p_editor_id
      AND group_id = v_group_id
      AND member_status = 'active';

    IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only an active admin can update the rotation plan (editor_id: %)', p_editor_id;
    END IF;

    -- 4. Get current penalty type for validation
    SELECT penalty_type INTO v_current_penalty_type
    FROM groups.rotation_plan WHERE id = p_plan_id;

    -- 5. Validate penalty parameters if provided
    IF p_penalty_type IS NOT NULL AND p_penalty_type NOT IN ('fixed', 'percentage') THEN
        RAISE EXCEPTION 'penalty_type must be ''fixed'' or ''percentage'' (got: %)', p_penalty_type;
    END IF;
    
    IF p_penalty_value IS NOT NULL THEN
        DECLARE
            v_check_type TEXT := COALESCE(p_penalty_type, v_current_penalty_type);
        BEGIN
            IF v_check_type = 'percentage' AND (p_penalty_value < 0 OR p_penalty_value > 100) THEN
                RAISE EXCEPTION 'Percentage penalty must be between 0 and 100 (got: %)', p_penalty_value;
            END IF;
            IF v_check_type = 'fixed' AND p_penalty_value < 0 THEN
                RAISE EXCEPTION 'Fixed penalty cannot be negative (got: %)', p_penalty_value;
            END IF;
        END;
    END IF;
    
    IF p_penalty_grace_days IS NOT NULL AND p_penalty_grace_days < 0 THEN
        RAISE EXCEPTION 'Grace days cannot be negative (got: %)', p_penalty_grace_days;
    END IF;

    -- 6. Update the rotation_plan (with updated_at)
    UPDATE groups.rotation_plan
    SET 
        rotation_name        = COALESCE(p_rotation_name, rotation_name),
        rotation_description = COALESCE(p_rotation_description, rotation_description),
        start_date           = COALESCE(p_start_date, start_date),
        penalty_type         = COALESCE(p_penalty_type, penalty_type),
        penalty_value        = COALESCE(p_penalty_value, penalty_value),
        penalty_grace_days   = COALESCE(p_penalty_grace_days, penalty_grace_days),
        amount_distributable = COALESCE(p_amount_distributable, amount_distributable),
        disbursement_type    = COALESCE(p_disbursement_type, disbursement_type),
        low_funds_options    = COALESCE(p_low_funds_options, low_funds_options),
        updated_at           = now()
    WHERE id = p_plan_id;

    -- 7. Update the linked groups.plans name/description if changed
    IF p_rotation_name IS NOT NULL OR p_rotation_description IS NOT NULL THEN
        UPDATE groups.plans
        SET 
            plan_name        = COALESCE(p_rotation_name, plan_name),
            plan_description = COALESCE(p_rotation_description, plan_description),
            updated_at       = now()
        WHERE id = (SELECT plan_id FROM groups.rotation_plan WHERE id = p_plan_id);
    END IF;

    -- 8. Return success
    RETURN jsonb_build_object(
        'status', 'updated',
        'plan_id', p_plan_id,
        'message', 'Rotation plan updated successfully'
    );
END;
$$;