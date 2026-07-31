CREATE OR REPLACE FUNCTION groups.delete_group(
    p_group_id  UUID,
    p_editor_id UUID   -- public.members.id of the person requesting deletion
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
    -- 1. Validate group exists and is not already deleted
    SELECT created_by, group_status = 'deleted' INTO v_creator, v_group_exists
    FROM public.groups WHERE id = p_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found (ID: %)', p_group_id;
    END IF;
    IF v_group_exists THEN
        RAISE EXCEPTION 'Group is already deleted (ID: %)', p_group_id;
    END IF;

    -- 2. Check if editor is an active admin of the group
    SELECT EXISTS (
        SELECT 1 FROM groups.group_members
        WHERE group_id = p_group_id
          AND member_id = p_editor_id
          AND member_role = 'admin'
          AND member_status = 'active'
    ) INTO v_is_admin;

    -- 3. Allow deletion only if editor is admin OR the group creator
    IF NOT v_is_admin AND p_editor_id != v_creator THEN
        RAISE EXCEPTION 'Only an admin or the group creator can delete the group. Editor ID: %, Creator ID: %', p_editor_id, v_creator;
    END IF;

    -- 4. Soft‑delete the group
    UPDATE public.groups
    SET group_status = 'deleted', updated_at = now()
    WHERE id = p_group_id;

    -- 5. Mark all active members as 'exited' (soft‑remove from group)
    UPDATE groups.group_members
    SET member_status = 'exited', updated_at = now()
    WHERE group_id = p_group_id AND member_status = 'active';

    -- 6. Return success
    RETURN jsonb_build_object(
        'status', 'deleted',
        'group_id', p_group_id,
        'message', 'Group and its active members have been marked as deleted/exited'
    );
END;
$$;
