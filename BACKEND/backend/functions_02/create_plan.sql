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
