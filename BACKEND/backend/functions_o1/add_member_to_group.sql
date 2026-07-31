CREATE OR REPLACE FUNCTION groups.add_member_to_group(
    p_group_id  UUID,
    p_member_id UUID,
    p_role      TEXT DEFAULT 'member',
    p_added_by  UUID DEFAULT NULL   -- group_members.id of the admin performing the action
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_group_exists      BOOLEAN;
    v_member_exists     BOOLEAN;
    v_admin_is_active   BOOLEAN;
    v_current_members   INT;
    v_max_capacity      NUMERIC;
    v_member_already_in BOOLEAN;
    v_member_status     TEXT;
    v_new_member_code   TEXT;
BEGIN
    -- 1. Validate group exists and is not deleted
    SELECT EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = p_group_id AND group_status != 'deleted'
    ) INTO v_group_exists;
    IF NOT v_group_exists THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- 2. Validate member exists and is active
    SELECT EXISTS (
        SELECT 1 FROM public.members
        WHERE id = p_member_id AND is_active = true
    ) INTO v_member_exists;
    IF NOT v_member_exists THEN
        RAISE EXCEPTION 'Member not found or inactive (ID: %)', p_member_id;
    END IF;

    -- 3. Validate role
    IF p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role: %. Use ''admin'' or ''member''.', p_role;
    END IF;

    -- 4. If an admin is provided (p_added_by), verify they are an active admin of the group
    IF p_added_by IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM groups.group_members gm
            WHERE gm.id = p_added_by
              AND gm.group_id = p_group_id
              AND gm.member_role = 'admin'
              AND gm.member_status = 'active'
        ) INTO v_admin_is_active;
        IF NOT v_admin_is_active THEN
            RAISE EXCEPTION 'The provided admin (ID: %) is not an active admin of this group', p_added_by;
        END IF;
    END IF;

    -- 5. Check if member already exists in the group (including inactive/exited)
    SELECT member_status INTO v_member_status
    FROM groups.group_members
    WHERE group_id = p_group_id AND member_id = p_member_id;

    v_member_already_in := FOUND;

    -- 6. If member is active in the group, nothing to do (or raise notice)
    IF v_member_already_in AND v_member_status = 'active' THEN
        RETURN jsonb_build_object('status', 'already_member', 'message', 'Member is already active in the group');
    END IF;

    -- 7. Check group capacity if adding a new member (not reactivating an existing but inactive one)
    --    For reactivation, we usually allow regardless of capacity (the member was already counted before).
    --    For simplicity, we check capacity only if the member is not already present at all (i.e., no row).
    IF NOT v_member_already_in THEN
        SELECT COUNT(*) INTO v_current_members
        FROM groups.group_members
        WHERE group_id = p_group_id AND member_status = 'active';

        SELECT max_capacity INTO v_max_capacity
        FROM public.groups WHERE id = p_group_id;

        IF v_current_members >= v_max_capacity THEN
            RAISE EXCEPTION 'Group capacity reached (max % members)', v_max_capacity;
        END IF;
    END IF;

    -- 8. Insert or reactivate the member
    INSERT INTO groups.group_members (
        group_id, member_id, member_role, member_status, invited_by, member_code
    )
    VALUES (
        p_group_id, p_member_id, p_role::groups.member_role, 'active',
        (SELECT invited_by FROM groups.group_members WHERE id = p_added_by), -- may be NULL
        public.gen_ref_code('GMC')
    )
    ON CONFLICT (group_id, member_id) DO UPDATE
    SET member_status = 'active',
        member_role   = EXCLUDED.member_role,
        invited_by    = COALESCE(EXCLUDED.invited_by, group_members.invited_by),
        updated_at    = now()
    RETURNING member_code INTO v_new_member_code;

    -- 9. Return success
    RETURN jsonb_build_object(
        'status', 'added',
        'member_code', v_new_member_code,
        'group_id', p_group_id,
        'member_id', p_member_id
    );
END;
$$;