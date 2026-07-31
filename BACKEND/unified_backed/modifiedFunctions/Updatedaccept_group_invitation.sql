-- ============================================================
-- accept_group_invitation
-- Fix: fully qualify RETURNING columns on both UPDATE and INSERT
-- to resolve "member_code is ambiguous" PL/pgSQL error.
-- ============================================================
DROP FUNCTION IF EXISTS public.accept_group_invitation(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.accept_group_invitation(
    p_invitation_id UUID,
    p_member_id     UUID
)
RETURNS TABLE (
    status          TEXT,
    message         TEXT,
    group_id        UUID,
    group_member_id UUID,
    member_code     TEXT
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_group_id               UUID;
    v_invitee_id             UUID;
    v_invite_status          groups.invite_status;
    v_inviter_entity_id      UUID;
    v_group_max_capacity     NUMERIC;
    v_current_members        INT;
    v_available_slots        INT;
    v_group_member_id        UUID;
    v_member_code            TEXT;
    v_already_active         BOOLEAN := FALSE;
    v_existing_member_id     UUID;
    v_existing_member_code   TEXT;
    v_existing_member_status groups.member_status;
BEGIN
    -- ── 1. Input validation ───────────────────────────────────
    IF p_invitation_id IS NULL OR p_member_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_PARAMS: p_invitation_id and p_member_id are required.';
    END IF;

    -- ── 2. Fetch and lock the invitation row ──────────────────
    -- FOR UPDATE prevents a concurrent accept + decline from
    -- both succeeding on the same invite.
    SELECT
        gi.group_id,
        gi.invitee_id,
        gi.invite_status,
        gm.member_id          -- admin's public.members.id → used as invited_by entity
    INTO
        v_group_id,
        v_invitee_id,
        v_invite_status,
        v_inviter_entity_id
    FROM  groups.group_invites gi
    JOIN  groups.group_members gm ON gm.id = gi.invited_by
    WHERE gi.id = p_invitation_id
    FOR UPDATE OF gi;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'INVITATION_NOT_FOUND: No invitation found for id %.', p_invitation_id;
    END IF;

    -- ── 3. Ownership check ────────────────────────────────────
    IF v_invitee_id <> p_member_id THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Invitation % does not belong to member %.', p_invitation_id, p_member_id;
    END IF;

    -- ── 4. Terminal state checks ──────────────────────────────
    IF v_invite_status = 'accepted' THEN
        RAISE EXCEPTION 'INVITE_ALREADY_ACCEPTED: This invitation has already been accepted.';
    END IF;

    IF v_invite_status = 'cancelled' THEN
        RAISE EXCEPTION 'INVITE_CANCELLED: This invitation has been cancelled by the admin.';
    END IF;

    IF v_invite_status = 'expired' THEN
        RAISE EXCEPTION 'INVITE_EXPIRED: This invitation has expired.';
    END IF;

    IF v_invite_status = 'declined' THEN
        RAISE EXCEPTION 'INVITE_DECLINED: This invitation was already declined.';
    END IF;

    -- ── 5. Member must still be active ───────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.members
        WHERE id = p_member_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'MEMBER_INACTIVE: Member % account is inactive.', p_member_id;
    END IF;

    -- ── 6. Group must still be active ────────────────────────
    SELECT max_capacity
    INTO   v_group_max_capacity
    FROM   public.groups
    WHERE  id = v_group_id
      AND  group_status = 'active';

    IF v_group_max_capacity IS NULL THEN
        RAISE EXCEPTION 'GROUP_NOT_ACTIVE: Group is no longer active.';
    END IF;

    -- ── 7. Check existing membership ─────────────────────────
    SELECT
        groups.group_members.id,
        groups.group_members.member_code,
        groups.group_members.member_status
    INTO
        v_existing_member_id,
        v_existing_member_code,
        v_existing_member_status
    FROM groups.group_members
    WHERE groups.group_members.group_id  = v_group_id
      AND groups.group_members.member_id = p_member_id;

    IF FOUND THEN
        IF v_existing_member_status = 'active' THEN
            -- Already an active member — idempotent success
            v_already_active  := TRUE;
            v_group_member_id := v_existing_member_id;
            v_member_code     := v_existing_member_code;
        ELSE
            -- Returning member: reactivate existing row.
            -- FIX: fully qualify RETURNING columns to avoid
            --      "column reference is ambiguous" PL/pgSQL error.
            UPDATE groups.group_members
            SET    member_status = 'active',
                   member_role   = 'member',
                   invited_by    = v_inviter_entity_id,
                   updated_at    = NOW()
            WHERE  groups.group_members.id = v_existing_member_id
            RETURNING
                groups.group_members.id,
                groups.group_members.member_code
            INTO
                v_group_member_id,
                v_member_code;
        END IF;
    ELSE
        -- ── 8. Capacity check (new members only) ─────────────
        -- Do NOT subtract pending invites here — this acceptance
        -- IS consuming one of those pending slots.
        SELECT COUNT(*)
        INTO   v_current_members
        FROM   groups.group_members
        WHERE  groups.group_members.group_id      = v_group_id
          AND  groups.group_members.member_status = 'active';

        v_available_slots := v_group_max_capacity::INT - v_current_members;

        IF v_available_slots <= 0 THEN
            RAISE EXCEPTION 'GROUP_FULL: This group has reached its maximum capacity.';
        END IF;

        -- ── 9. Insert new member ──────────────────────────────
        -- FIX: fully qualify RETURNING columns.
        INSERT INTO groups.group_members (
            group_id,
            member_id,
            member_role,
            member_status,
            invited_by
        )
        VALUES (
            v_group_id,
            p_member_id,
            'member',
            'active',
            v_inviter_entity_id
        )
        RETURNING
            groups.group_members.id,
            groups.group_members.member_code
        INTO
            v_group_member_id,
            v_member_code;
    END IF;

    -- ── 10. Mark invitation as accepted ──────────────────────
    UPDATE groups.group_invites
    SET    invite_status = 'accepted',
           updated_at    = NOW()
    WHERE  id = p_invitation_id;

    -- ── 11. Return structured result ──────────────────────────
    RETURN QUERY
    SELECT
        CASE WHEN v_already_active
             THEN 'already_member'
             ELSE 'success'
        END::TEXT,
        CASE WHEN v_already_active
             THEN 'You are already a member of this group.'
             ELSE 'Invitation accepted. Welcome to the group!'
        END::TEXT,
        v_group_id,
        v_group_member_id,
        v_member_code;

END;
$$;


-- ============================================================
-- SUPPORTING INDEX
-- Speeds up the invitation lookup by invitee across all groups.
-- The FOR UPDATE lock already uses the PK (id); this index
-- serves future queries like "show all my pending invitations".
-- Run once after deploying.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_group_invites_invitee_status
    ON groups.group_invites (invitee_id, invite_status)
    TABLESPACE pg_default;

ALTER FUNCTION public.accept_group_invitation(UUID, UUID) SECURITY DEFINER;