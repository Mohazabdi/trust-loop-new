CREATE OR REPLACE FUNCTION groups.create_group(
    p_created_by        UUID,
    p_group_name        TEXT,
    p_group_description TEXT DEFAULT NULL,
    p_group_visibility  TEXT DEFAULT 'private',
    p_max_capacity      NUMERIC DEFAULT 50,
    p_min_capacity      NUMERIC DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_entity_id    UUID;
    v_group_id     UUID;
    v_group_code   TEXT;
    v_member_code  TEXT;
BEGIN
    -- 1. Validate creator exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_created_by AND is_active = true) THEN
        RAISE EXCEPTION 'Creator member not found or inactive (ID: %)', p_created_by;
    END IF;

    -- 2. Validate visibility parameter
    IF p_group_visibility NOT IN ('public', 'private') THEN
        RAISE EXCEPTION 'Invalid group visibility: %. Use ''public'' or ''private''.', p_group_visibility;
    END IF;

    -- 3. Validate capacity bounds
    IF p_min_capacity > p_max_capacity THEN
        RAISE EXCEPTION 'min_capacity (%) cannot exceed max_capacity (%)', p_min_capacity, p_max_capacity;
    END IF;
    IF p_max_capacity <= 0 OR p_min_capacity <= 0 THEN
        RAISE EXCEPTION 'Capacities must be positive numbers';
    END IF;

    -- 4. Create entity record (required by public.groups FK)
    INSERT INTO public.entities (entity_type, entity_name, entity_status)
    VALUES ('group', p_group_name, 'active')
    RETURNING id INTO v_entity_id;

    -- 5. Create the group (group_type is omitted – column removed in new architecture)
    INSERT INTO public.groups (
        id, group_name, group_description, group_visibility,
        created_by, max_capacity, min_capacity
    )
    VALUES (
        v_entity_id, p_group_name, p_group_description,
        p_group_visibility::public.group_visibility, p_created_by,
        p_max_capacity, p_min_capacity
    )
    RETURNING id, group_ref INTO v_group_id, v_group_code;

    -- 6. Add creator as an admin member
    INSERT INTO groups.group_members (group_id, member_id, member_role, member_status, member_code)
    VALUES (v_group_id, p_created_by, 'admin', 'active', public.gen_ref_code('GMC'))
    RETURNING member_code INTO v_member_code;

    -- 7. Return consistent JSON response
    RETURN jsonb_build_object(
        'group_id',    v_group_id,
        'group_ref',   v_group_code,
        'entity_id',   v_entity_id,
        'member_code', v_member_code,
        'status',      'created'
    );
END;
$$;