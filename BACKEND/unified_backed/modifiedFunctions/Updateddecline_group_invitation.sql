-- ============================================================
-- FIX 2: decline_group_invitation
-- Two bugs fixed:
--   (a) Was setting invite_status = 'cancelled' instead of
--       'declined' — wrong status written to DB.
--   (b) Was treating 'cancelled' as 'already_declined' —
--       wrong terminal state logic.
-- ============================================================

CREATE OR REPLACE FUNCTION public.decline_group_invitation(
    p_invitation_id UUID,
    p_member_id     UUID
)
RETURNS TABLE (
    status        TEXT,
    message       TEXT,
    group_id      UUID,
    invitation_id UUID
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_invite_group_id   UUID;
    v_invite_invitee_id UUID;
    v_invite_status     groups.invite_status;
BEGIN

    -- ── 1. Input validation ───────────────────────────────────
    IF p_invitation_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_INVITATION_ID: p_invitation_id is required.';
    END IF;

    IF p_member_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_MEMBER_ID: p_member_id is required.';
    END IF;

    -- ── 2. Fetch and lock the invitation row ──────────────────
    SELECT
        gi.group_id,
        gi.invitee_id,
        gi.invite_status
    INTO
        v_invite_group_id,
        v_invite_invitee_id,
        v_invite_status
    FROM  groups.group_invites gi
    WHERE gi.id = p_invitation_id
    FOR UPDATE;

    -- ── 3. Must exist ─────────────────────────────────────────
    IF v_invite_group_id IS NULL THEN
        RAISE EXCEPTION 'INVITATION_NOT_FOUND: No invitation found for id %.', p_invitation_id;
    END IF;

    -- ── 4. Must belong to this member ────────────────────────
    IF v_invite_invitee_id <> p_member_id THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Invitation % does not belong to member %.', p_invitation_id, p_member_id;
    END IF;

    -- ── 5. Terminal state handling ────────────────────────────

    -- FIX (b): 'declined' is the idempotency case, NOT 'cancelled'
    IF v_invite_status = 'declined' THEN
        RETURN QUERY
        SELECT
            'already_declined'::TEXT,
            'This invitation has already been declined.'::TEXT,
            v_invite_group_id,
            p_invitation_id;
        RETURN;
    END IF;

    IF v_invite_status = 'accepted' THEN
        RAISE EXCEPTION 'INVITE_ALREADY_ACCEPTED: Cannot decline an already accepted invitation.';
    END IF;

    -- FIX (b): 'cancelled' is a separate terminal state — admin retracted it
    IF v_invite_status = 'cancelled' THEN
        RAISE EXCEPTION 'INVITE_CANCELLED: This invitation was cancelled by the admin and cannot be declined.';
    END IF;

    IF v_invite_status = 'expired' THEN
        RAISE EXCEPTION 'INVITE_EXPIRED: This invitation has expired and cannot be declined.';
    END IF;

    -- ── 6. Member must be active ──────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.members m
        WHERE  m.id        = p_member_id
          AND  m.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'MEMBER_INACTIVE: Member % account is inactive.', p_member_id;
    END IF;

    -- ── 7. State change ───────────────────────────────────────
    -- FIX (a): was writing 'cancelled', must write 'declined'
    UPDATE groups.group_invites
    SET    invite_status = 'declined',
           updated_at    = NOW()
    WHERE  id = p_invitation_id;

    -- ── 8. Return result ──────────────────────────────────────
    RETURN QUERY
    SELECT
        'success'::TEXT,
        'Invitation declined successfully.'::TEXT,
        v_invite_group_id,
        p_invitation_id;

END;
$$;

ALTER FUNCTION public.decline_group_invitation(UUID, UUID) SECURITY DEFINER;