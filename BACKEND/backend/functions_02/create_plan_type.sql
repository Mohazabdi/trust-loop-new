CREATE OR REPLACE FUNCTION groups.create_plan_type(
    p_type_name        TEXT,
    p_created_by       UUID,   -- public.administrators.id of system admin
    p_type_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_is_sys_admin BOOLEAN;
BEGIN
    -- 1. Verify the caller is a system administrator
    SELECT EXISTS (
        SELECT 1 FROM public.administrators
        WHERE id = p_created_by
          AND admin_role = 'sys_admin'
          AND is_active = true
    ) INTO v_is_sys_admin;
    IF NOT v_is_sys_admin THEN
        RAISE EXCEPTION 'Only a system administrator can create plan types';
    END IF;

    -- 2. Check that the type name is not already used
    IF EXISTS (SELECT 1 FROM groups.plan_types WHERE type_name = p_type_name) THEN
        RAISE EXCEPTION 'Plan type "%" already exists', p_type_name;
    END IF;

    -- 3. Insert new plan type (active by default)
    INSERT INTO groups.plan_types (type_name, type_description, is_active)
    VALUES (p_type_name, COALESCE(p_type_description, ''), true)
    RETURNING id;

    RETURN jsonb_build_object(
        'status', 'created',
        'type_name', p_type_name,
        'type_description', p_type_description
    );
END;
$$;