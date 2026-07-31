CREATE OR REPLACE FUNCTION groups.remove_member_from_group(
    p_group_id      UUID,
    p_member_id     UUID,
    p_reason        TEXT  
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = groups, public, pg_catalog
AS $$
DECLARE
    v_target_gm_id      UUID;
    v_target_gm_name    TEXT;
    v_target_gm_row     RECORD;
    v_members_in_Group INTEGER;
    v_locked_rotations  TEXT;   -- WILL HOLD A COMMA-SEPARATED LIST OF LOCKED ROTATION NAMES, IF ANY ARE FOUND
BEGIN
    -- ============================================================
    -- PHASE 1 — INPUT VALIDATION
    -- ============================================================

    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_GROUP_ID: p_group_id is required.';
    END IF;

    IF p_member_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_MEMBER_ID: p_member_id is required.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'MISSING_REASON: A reason must be provided when removing a member.';
    END IF;

     -- ============================================================
    -- PHASE 2 — VALIDATE GROUP IS ACTIVE
    -- ============================================================

    IF NOT EXISTS (
        SELECT 1
        FROM   public.groups
        WHERE  id           = p_group_id
          AND  group_status = 'active'
    ) THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: No active group found with the provided group_id.';
    END IF;

    -- ============================================================
    -- PHASE 3 — VALIDATE TARGET MEMBER EXISTS AND IS ACTIVE
    -- IN THIS GROUP. Lock the row to prevent concurrent removals.
    -- ============================================================

    SELECT *
    INTO   v_target_gm_row
    FROM   groups.group_members
    WHERE  group_id      = p_group_id
      AND  member_id     = p_member_id
      AND  member_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Distinguish between "never a member" and "already removed"
        IF EXISTS (
            SELECT 1
            FROM   groups.group_members
            WHERE  group_id  = p_group_id
              AND  member_id = p_member_id
        ) THEN
            RAISE EXCEPTION 'ALREADY_REMOVED: This member has already been removed from the group.';
        ELSE
            RAISE EXCEPTION 'NOT_A_MEMBER: The specified member is not part of this group.';
        END IF;
    END IF;
    v_target_gm_id := v_target_gm_row.id;

    -- Store the target group_member_id and member name for later use in deletions and messaging.

    SELECT first_name || ' ' || last_name 
    INTO v_target_gm_name 
    FROM public.members 
    WHERE id = p_member_id;

    -- ============================================================
    -- PHASE 4 — ROTATION LOCK CHECK
    --
    -- Scan ALL rotation plans this member actively participates in.
    -- If ANY of them are both active AND locked, block the entire
    -- ============================================================

    SELECT string_agg(rp.rotation_name, ', ' ORDER BY rp.rotation_name)
    INTO   v_locked_rotations
    FROM   groups.rotation_plan_members rpm
    JOIN   groups.rotation_plan         rp  ON rp.id = rpm.rotation_plan_id
    WHERE  rpm.group_member_id        = v_target_gm_id
      AND  rpm.rotation_member_status = 'active'
      AND  rp.rotation_status         = 'active'
      AND  rp.rotation_locked         = TRUE;

    IF v_locked_rotations IS NOT NULL THEN
        RAISE EXCEPTION
            E'LEAVE BLOCKED: %\n\nYou are an active participant in one or more locked rotation plans.\nRotation plans must be unlocked before you can leave the group.\n\nBelow are your locked rotations:\n%',
            v_target_gm_name,
            v_locked_rotations;
    END IF;

    --PHASE 4b. ADMIN CHECK
    -- Check if the member is an admin and if there are other active members in the group. If so, block the leave action until another admin is assigned or all other members are removed.

    SELECT COUNT(member_id)
    INTO   v_members_in_Group
    FROM   groups.group_members gm
    WHERE  gm.group_id = p_group_id
      AND  gm.member_status = 'active';
      

    IF v_members_in_Group > 1 AND  v_target_gm_row.member_role = 'admin'
    THEN
        RAISE EXCEPTION
            E'LEAVE BLOCKED: %\n\nYou are an admin in this group. There are currently % active members in the group.\nPlease assign another member as admin before you can leave the group.',
            v_target_gm_name,
            v_members_in_Group
        ;
    END IF;



    -- ============================================================
    -- PHASE 5 — EXECUTE SOFT DELETES
    -- Order: children first, parent last.
    -- ============================================================

    -- 5a. Soft-delete from all active rotation plan memberships.
    --     Unlocked active rotations are allowed — only locked ones
    --     are blocked (handled above). Contribution schedules,
    --     disbursements and penalty records are untouched.
    UPDATE groups.rotation_plan_members
    SET    rotation_member_status = 'removed',
           updated_at             = NOW()
    WHERE  group_member_id        = v_target_gm_id
      AND  rotation_member_status = 'active';

    -- 5b. Cancel all pending rotation invites for this member.
    --     The WHERE clause is scoped to this member's group_member_id
    --     so no other member's invites are touched.
    UPDATE groups.rotation_invites
    SET    invite_status = 'cancelled',
           updated_at    = NOW()
    WHERE  group_member_id = v_target_gm_id
      AND  invite_status   = 'pending';

      -- 5d. Cancel any pending group invites sent to this member
    UPDATE groups.group_invites
    SET    invite_status = 'cancelled',
           updated_at    = NOW()
    WHERE  group_id      = p_group_id
      AND  invite_status = 'pending';

    -- 5e. Soft-delete the group_members row itself — last, after
    --     all child records are already settled.
    UPDATE groups.group_members
    SET    member_status = 'deleted',
           updated_at    = NOW()
    WHERE  id = v_target_gm_id;

    -- 5F. If the departing member is the last active member in the group, set the group's status to 'inactive'.

    IF v_members_in_Group = 1 AND  v_target_gm_row.member_role = 'admin'
    THEN
        UPDATE public.groups
        SET    group_status = 'dormant',
               updated_at    = NOW()
        WHERE  id = p_group_id;
    END IF;


    -- ============================================================
    -- PHASE 6 — RETURN STRUCTURED RESULT
    -- ============================================================

    RETURN jsonb_build_object(
        'success',    true,
        'message',    'Member removed from group and all active rotation memberships.',
        'group_id',   p_group_id,
        'member_id',  p_member_id,
        'reason',     p_reason,
        'removed_at', NOW()
    );

END;
$$;