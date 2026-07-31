-- Helper function to create a plan and return its ID (used by main function below)
CREATE OR REPLACE FUNCTION groups.create_plan(
    p_group_id          UUID,
    p_plan_type_name    TEXT,
    p_plan_name         TEXT,
    p_plan_description  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_plan_type_id UUID;
    v_plan_id      UUID;
BEGIN
    SELECT id INTO v_plan_type_id
    FROM groups.plan_types
    WHERE type_name = p_plan_type_name AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive plan type: %', p_plan_type_name;
    END IF;

    INSERT INTO groups.plans (group_id, plan_type_id, plan_name, plan_description)
    VALUES (p_group_id, v_plan_type_id, p_plan_name, p_plan_description)
    RETURNING id INTO v_plan_id;

    RETURN v_plan_id;
END;
$$;

-- Main function
CREATE OR REPLACE FUNCTION groups.create_rotation_plan(
    p_group_id               UUID,
    p_created_by             UUID,   -- groups.group_members.id of admin
    p_rotation_name          TEXT DEFAULT 'Group Rotation',
    p_rotation_description   TEXT DEFAULT NULL,
    p_start_date             TIMESTAMPTZ DEFAULT now() + interval '1 day',
    p_penalty_type           TEXT DEFAULT 'fixed',
    p_penalty_value          NUMERIC DEFAULT 0,
    p_penalty_grace_days     NUMERIC DEFAULT 0,
    p_amount_distributable   NUMERIC DEFAULT 0,
    p_disbursement_type      groups.disbursement_type DEFAULT 'auto',
    p_low_funds_options      groups.low_funds_options DEFAULT 'approval'
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_admin_role   TEXT;
    v_plan_id      UUID;   -- from groups.plans
    v_rotation_id  UUID;
    v_code         TEXT;
BEGIN
    -- 1. Validate admin permission
    SELECT member_role::TEXT INTO v_admin_role
    FROM groups.group_members
    WHERE id = p_created_by AND group_id = p_group_id AND member_status = 'active';

    IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only an active admin can create a rotation plan (group_member_id: %)', p_created_by;
    END IF;

    -- 2. Validate penalty parameters
    IF p_penalty_type NOT IN ('fixed', 'percentage') THEN
        RAISE EXCEPTION 'penalty_type must be ''fixed'' or ''percentage'' (got: %)', p_penalty_type;
    END IF;
    IF p_penalty_type = 'percentage' AND (p_penalty_value < 0 OR p_penalty_value > 100) THEN
        RAISE EXCEPTION 'Percentage penalty must be between 0 and 100 (got: %)', p_penalty_value;
    END IF;
    IF p_penalty_type = 'fixed' AND p_penalty_value < 0 THEN
        RAISE EXCEPTION 'Fixed penalty cannot be negative (got: %)', p_penalty_value;
    END IF;
    IF p_penalty_grace_days < 0 THEN
        RAISE EXCEPTION 'Grace days cannot be negative (got: %)', p_penalty_grace_days;
    END IF;

    -- 3. Create a plan entry of type 'rotation'
    v_plan_id := groups.create_plan(
        p_group_id,
        'rotation',
        p_rotation_name,
        p_rotation_description
    );

    -- 4. Insert into rotation_plan (using plan_id, not group_id)
    INSERT INTO groups.rotation_plan (
        plan_id,
        rotation_name,
        rotation_description,
        start_date,
        penalty_type,
        penalty_value,
        penalty_grace_days,
        created_by,
        amount_distributable,
        disbursement_type,
        low_funds_options
    )
    VALUES (
        v_plan_id,
        p_rotation_name,
        p_rotation_description,
        p_start_date,
        p_penalty_type,
        p_penalty_value,
        p_penalty_grace_days,
        p_created_by,
        p_amount_distributable,
        p_disbursement_type,
        p_low_funds_options
    )
    RETURNING id, rotation_plan_code INTO v_rotation_id, v_code;

    -- 5. Auto‑lock if start_date is already in the past
    IF p_start_date <= now() THEN
        UPDATE groups.rotation_plan SET rotation_locked = TRUE WHERE id = v_rotation_id;
    END IF;

    -- 6. Return success
    RETURN jsonb_build_object(
        'rotation_plan_id', v_rotation_id,
        'plan_id',          v_plan_id,
        'code',             v_code,
        'status',           'created'
    );
END;
$$;