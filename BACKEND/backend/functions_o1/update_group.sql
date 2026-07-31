CREATE OR REPLACE FUNCTION groups.update_group(
    p_group_id          UUID,
    p_editor_id         UUID,   -- public.members.id
    p_group_name        TEXT DEFAULT NULL,
    p_group_description TEXT DEFAULT NULL,
    p_group_visibility  TEXT DEFAULT NULL,
    p_max_capacity      NUMERIC DEFAULT NULL,
    p_min_capacity      NUMERIC DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_creator  UUID;
    v_is_admin BOOLEAN;
    v_group_exists BOOLEAN;
BEGIN
    -- 1. Validate group exists and is not deleted
    SELECT created_by, group_status = 'deleted' INTO v_creator, v_group_exists
    FROM public.groups WHERE id = p_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found (ID: %)', p_group_id;
    END IF;
    IF v_group_exists THEN
        RAISE EXCEPTION 'Cannot update a deleted group (ID: %)', p_group_id;
    END IF;

    -- 2. Check editor permissions
    SELECT EXISTS (
        SELECT 1 FROM groups.group_members
        WHERE group_id = p_group_id
          AND member_id = p_editor_id
          AND member_role = 'admin'
          AND member_status = 'active'
    ) INTO v_is_admin;

    IF NOT v_is_admin AND p_editor_id != v_creator THEN
        RAISE EXCEPTION 'Only an admin or the group creator can update the group. Editor ID: %, Creator ID: %', p_editor_id, v_creator;
    END IF;

    -- 3. Validate capacity constraints if new values are provided
    IF p_min_capacity IS NOT NULL AND p_max_capacity IS NOT NULL THEN
        IF p_min_capacity > p_max_capacity THEN
            RAISE EXCEPTION 'min_capacity (%) cannot exceed max_capacity (%)', p_min_capacity, p_max_capacity;
        END IF;
    ELSIF p_min_capacity IS NOT NULL THEN
        -- If only min capacity given, compare with existing max
        IF p_min_capacity > (SELECT max_capacity FROM public.groups WHERE id = p_group_id) THEN
            RAISE EXCEPTION 'min_capacity (%) cannot exceed existing max_capacity', p_min_capacity;
        END IF;
    ELSIF p_max_capacity IS NOT NULL THEN
        IF (SELECT min_capacity FROM public.groups WHERE id = p_group_id) > p_max_capacity THEN
            RAISE EXCEPTION 'max_capacity (%) cannot be less than existing min_capacity', p_max_capacity;
        END IF;
    END IF;

    -- 4. Validate visibility value if provided
    IF p_group_visibility IS NOT NULL AND p_group_visibility NOT IN ('public', 'private') THEN
        RAISE EXCEPTION 'Invalid group visibility. Use ''public'' or ''private''.';
    END IF;

    -- 5. Perform update (only non‑NULL fields)
    UPDATE public.groups
    SET
        group_name        = COALESCE(p_group_name, group_name),
        group_description = COALESCE(p_group_description, group_description),
        group_visibility  = COALESCE(p_group_visibility::public.group_visibility, group_visibility),
        max_capacity      = COALESCE(p_max_capacity, max_capacity),
        min_capacity      = COALESCE(p_min_capacity, min_capacity),
        updated_at        = now()
    WHERE id = p_group_id;

    -- 6. Return the updated group using the existing detail function
    RETURN groups.get_sp_group_det(p_group_id);
END;
$$;
