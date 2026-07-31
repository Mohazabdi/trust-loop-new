
-- ── 1. Create the join requests table  ────────────────

CREATE TYPE groups.request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS groups.group_join_requests (
    id               UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id         UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    requester_id     UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    -- reviewed_by is NULL until an admin acts; FK → groups.group_members
    reviewed_by      UUID        NULL REFERENCES groups.group_members(id) ON DELETE SET NULL,
    request_message  TEXT        NULL,
    admin_message    TEXT        NULL,
    request_status   groups.request_status NOT NULL DEFAULT 'pending',
    join_code        TEXT        NOT NULL DEFAULT gen_ref_code('GJR'),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at      TIMESTAMPTZ NULL,
    UNIQUE (group_id, requester_id)  -- one active request per member per group
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_gjr_requester
    ON groups.group_join_requests (requester_id, request_status);

CREATE INDEX IF NOT EXISTS idx_gjr_group_pending
    ON groups.group_join_requests (group_id, request_status)
    WHERE request_status = 'pending';

-- ── 2. Grant access ──────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
    ON groups.group_join_requests TO authenticated;

-- ============================================================
-- FUNCTION: create_group_join_request
-- PURPOSE:  Any active member may request to join a group.
--           A request is idempotent: re-submitting while
--           pending returns the existing request without error.
--           If a prior request was rejected the member may
--           re-apply, which creates a fresh pending request.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_group_join_request(
    p_group_id        UUID,
    p_requester_id    UUID,
    p_request_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_request_id     UUID;
    v_existing_status groups.request_status;
    v_group_name     TEXT;
    -- The admin's group_members row id (used for notification lookup)
    v_admin_member_id UUID;
BEGIN
    -- ── 1. Input validation ───────────────────────────────────
    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_GROUP_ID: p_group_id is required.';
    END IF;

    IF p_requester_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_REQUESTER_ID: p_requester_id is required.';
    END IF;

    -- ── 2. Group must exist and be active ─────────────────────
    SELECT g.group_name
    INTO   v_group_name
    FROM   public.groups g
    WHERE  g.id           = p_group_id
      AND  g.group_status = 'active';

    IF v_group_name IS NULL THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: No active group found for id %.', p_group_id;
    END IF;

    -- ── 3. Requester must be an active member ─────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.members
        WHERE  id        = p_requester_id
          AND  is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'MEMBER_NOT_FOUND: Member % does not exist or is inactive.', p_requester_id;
    END IF;

    -- ── 4. Must not already be a group member ─────────────────
    IF EXISTS (
        SELECT 1 FROM groups.group_members
        WHERE  group_id      = p_group_id
          AND  member_id     = p_requester_id
          AND  member_status = 'active'
    ) THEN
        RAISE EXCEPTION 'ALREADY_A_MEMBER: You are already a member of this group.';
    END IF;

    -- ── 5. Check for existing request ────────────────────────
    SELECT request_status
    INTO   v_existing_status
    FROM   groups.group_join_requests
    WHERE  group_id      = p_group_id
      AND  requester_id  = p_requester_id;

    IF FOUND THEN
        IF v_existing_status = 'pending' THEN
            -- Idempotent: return the existing pending request
            SELECT id INTO v_request_id
            FROM   groups.group_join_requests
            WHERE  group_id     = p_group_id
              AND  requester_id = p_requester_id;

            RETURN jsonb_build_object(
                'status',          'duplicate',
                'message',         'You already have a pending request for this group.',
                'request_id',      v_request_id,
                'group_id',        p_group_id,
                'requester_id',    p_requester_id,
                'request_status',  'pending'
            );
        END IF;

        IF v_existing_status = 'approved' THEN
            RAISE EXCEPTION 'REQUEST_ALREADY_APPROVED: Your request has already been approved. Check your invitations.';
        END IF;

        -- Rejected: allow re-apply by updating the existing row
        IF v_existing_status = 'rejected' THEN
            UPDATE groups.group_join_requests
            SET    request_message = p_request_message,
                   request_status  = 'pending',
                   admin_message   = NULL,
                   reviewed_by     = NULL,
                   reviewed_at     = NULL,
                   created_at      = now()
            WHERE  group_id     = p_group_id
              AND  requester_id = p_requester_id
            RETURNING id INTO v_request_id;

            -- Notify group admin(s) of the re-application
            INSERT INTO groups.notifications (
                member_id,
                notification_type,
                title,
                message,
                related_entity_id,
                is_system
            )
            SELECT
                gm.member_id,
                'join_request',
                'New Join Request',
                (SELECT m.first_name || ' ' || m.last_name
                 FROM   public.members m WHERE m.id = p_requester_id)
                || ' has re-applied to join ' || v_group_name || '.',
                v_request_id,
                FALSE
            FROM groups.group_members gm
            WHERE gm.group_id      = p_group_id
              AND gm.member_role   = 'admin'
              AND gm.member_status = 'active';

            RETURN jsonb_build_object(
                'status',         'success',
                'message',        'Your re-application has been submitted.',
                'request_id',     v_request_id,
                'group_id',       p_group_id,
                'requester_id',   p_requester_id,
                'request_status', 'pending'
            );
        END IF;
    END IF;

    -- ── 6. Insert fresh request ───────────────────────────────
    INSERT INTO groups.group_join_requests (
        group_id,
        requester_id,
        request_message
    )
    VALUES (
        p_group_id,
        p_requester_id,
        p_request_message
    )
    RETURNING id INTO v_request_id;

    -- ── 7. Notify all active admins of the group ──────────────
    INSERT INTO groups.notifications (
        member_id,
        notification_type,
        title,
        message,
        related_entity_id,
        is_system
    )
    SELECT
        gm.member_id,
        'join_request',
        'New Join Request',
        (SELECT m.first_name || ' ' || m.last_name
         FROM   public.members m WHERE m.id = p_requester_id)
        || ' has requested to join ' || v_group_name || '.',
        v_request_id,
        FALSE
    FROM groups.group_members gm
    WHERE gm.group_id      = p_group_id
      AND gm.member_role   = 'admin'
      AND gm.member_status = 'active';

    -- ── 8. Return result ──────────────────────────────────────
    RETURN jsonb_build_object(
        'status',         'success',
        'message',        'Your request has been submitted successfully.',
        'request_id',     v_request_id,
        'group_id',       p_group_id,
        'requester_id',   p_requester_id,
        'request_status', 'pending'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_join_request(UUID, UUID, TEXT)
    TO authenticated;


-- ============================================================
-- FUNCTION: get_member_join_requests
-- PURPOSE:  Returns all join requests for a given member
--           so the frontend can build its requestMap
--           (groupId → status).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_member_join_requests(
    p_member_id UUID
)
RETURNS TABLE (
    group_id        UUID,
    request_id      UUID,
    request_status  TEXT,
    request_message TEXT,
    admin_message   TEXT,
    created_at      TIMESTAMPTZ,
    reviewed_at     TIMESTAMPTZ,
    group_name      TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gjr.group_id,
        gjr.id              AS request_id,
        gjr.request_status::TEXT,
        gjr.request_message,
        gjr.admin_message,
        gjr.created_at,
        gjr.reviewed_at,
        g.group_name
    FROM  groups.group_join_requests gjr
    JOIN  public.groups g ON g.id = gjr.group_id
    WHERE gjr.requester_id = p_member_id
    ORDER BY gjr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_join_requests(UUID)
    TO authenticated;


-- ============================================================
--  Approve / Reject Join Requests
-- ── approve ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.group_join_request_approve(
    p_group_join_request_id UUID,
    p_reviewed_by           UUID,   -- public.members.id of the reviewing admin
    p_admin_message         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_request               groups.group_join_requests%ROWTYPE;
    v_invite_result         JSONB;
    v_admin_gm_id           UUID;   -- groups.group_members.id of the admin
    v_requester_name        TEXT;
    v_group_name            TEXT;
BEGIN
    -- ── 1. Input validation ───────────────────────────────────
    IF p_group_join_request_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_REQUEST_ID: p_group_join_request_id is required.';
    END IF;
    IF p_reviewed_by IS NULL THEN
        RAISE EXCEPTION 'MISSING_REVIEWER: p_reviewed_by is required.';
    END IF;
    IF p_admin_message IS NULL OR trim(p_admin_message) = '' THEN
        RAISE EXCEPTION 'MISSING_ADMIN_MESSAGE: An approval message is required.';
    END IF;

    -- ── 2. Fetch and lock the join request ────────────────────
    SELECT *
    INTO   v_request
    FROM   groups.group_join_requests
    WHERE  id = p_group_join_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND: No join request found for id %.', p_group_join_request_id;
    END IF;

    -- ── 3. Must not already be reviewed ──────────────────────
    IF v_request.request_status <> 'pending' THEN
        RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: This request has already been % .', v_request.request_status;
    END IF;

    -- ── 4. Reviewer must be an active admin of the group ──────
    SELECT gm.id
    INTO   v_admin_gm_id
    FROM   groups.group_members gm
    WHERE  gm.group_id      = v_request.group_id
      AND  gm.member_id     = p_reviewed_by
      AND  gm.member_role   = 'admin'
      AND  gm.member_status = 'active';

    IF v_admin_gm_id IS NULL THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Member % is not an active admin of this group.', p_reviewed_by;
    END IF;

    -- ── 5. Requester must still be active ────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.members
        WHERE  id        = v_request.requester_id
          AND  is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'MEMBER_INACTIVE: The requesting member is no longer active.';
    END IF;

    -- ── 6. Update the request ─────────────────────────────────
    UPDATE groups.group_join_requests
    SET    request_status = 'approved',
           admin_message  = p_admin_message,
           reviewed_by    = v_admin_gm_id,
           reviewed_at    = now()
    WHERE  id = p_group_join_request_id;

    -- ── 7. Generate invitation via existing function ──────────
    -- invite_members_to_group expects p_invited_by = public.members.id
    SELECT row_to_json(t)::JSONB
    INTO   v_invite_result
    FROM (
        SELECT *
        FROM   public.invite_members_to_group(
            p_group_id    := v_request.group_id,
            p_invited_by  := p_reviewed_by,
            p_invitee_ids := ARRAY[v_request.requester_id]
        )
    ) t;

    -- ── 8. Look up names for notification ────────────────────
    SELECT first_name || ' ' || last_name
    INTO   v_requester_name
    FROM   public.members
    WHERE  id = v_request.requester_id;

    SELECT group_name
    INTO   v_group_name
    FROM   public.groups
    WHERE  id = v_request.group_id;

    -- ── 9. Notify the requester ───────────────────────────────
    INSERT INTO groups.notifications (
        member_id,
        notification_type,
        title,
        message,
        related_entity_id,
        is_system
    ) VALUES (
        v_request.requester_id,
        'join_request_approved',
        'Join Request Approved',
        'Your request to join ' || v_group_name
            || ' has been approved! Check your invitations to complete joining.',
        p_group_join_request_id,
        FALSE
    );

    -- ── 10. Return ────────────────────────────────────────────
    RETURN jsonb_build_object(
        'status',         'success',
        'message',        'Request approved and invitation sent.',
        'group_id',       v_request.group_id,
        'requester_id',   v_request.requester_id,
        'reviewed_by',    p_reviewed_by,
        'admin_message',  p_admin_message,
        'request_status', 'approved',
        'reviewed_at',    now(),
        'invite_result',  v_invite_result
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.group_join_request_approve(UUID, UUID, TEXT)
    TO authenticated;


-- ── reject ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.group_join_request_reject(
    p_group_join_request_id UUID,
    p_reviewed_by           UUID,   -- public.members.id of the reviewing admin
    p_admin_message         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_request       groups.group_join_requests%ROWTYPE;
    v_admin_gm_id   UUID;
    v_group_name    TEXT;
BEGIN
    -- ── 1. Input validation ───────────────────────────────────
    IF p_group_join_request_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_REQUEST_ID: p_group_join_request_id is required.';
    END IF;
    IF p_reviewed_by IS NULL THEN
        RAISE EXCEPTION 'MISSING_REVIEWER: p_reviewed_by is required.';
    END IF;
    IF p_admin_message IS NULL OR trim(p_admin_message) = '' THEN
        RAISE EXCEPTION 'MISSING_REJECTION_REASON: A rejection reason is required.';
    END IF;

    -- ── 2. Fetch and lock the join request ────────────────────
    SELECT *
    INTO   v_request
    FROM   groups.group_join_requests
    WHERE  id = p_group_join_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND: No join request found for id %.', p_group_join_request_id;
    END IF;

    -- ── 3. Must be pending ────────────────────────────────────
    IF v_request.request_status <> 'pending' THEN
        RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: This request has already been %.', v_request.request_status;
    END IF;

    -- ── 4. Reviewer must be active admin ─────────────────────
    SELECT gm.id
    INTO   v_admin_gm_id
    FROM   groups.group_members gm
    WHERE  gm.group_id      = v_request.group_id
      AND  gm.member_id     = p_reviewed_by
      AND  gm.member_role   = 'admin'
      AND  gm.member_status = 'active';

    IF v_admin_gm_id IS NULL THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Member % is not an active admin of this group.', p_reviewed_by;
    END IF;

    -- ── 5. Update request ─────────────────────────────────────
    UPDATE groups.group_join_requests
    SET    request_status = 'rejected',
           admin_message  = p_admin_message,
           reviewed_by    = v_admin_gm_id,
           reviewed_at    = now()
    WHERE  id = p_group_join_request_id;

    -- ── 6. Look up group name for notification ────────────────
    SELECT group_name INTO v_group_name
    FROM   public.groups WHERE id = v_request.group_id;

    -- ── 7. Notify the requester ───────────────────────────────
    INSERT INTO groups.notifications (
        member_id,
        notification_type,
        title,
        message,
        related_entity_id,
        is_system
    ) VALUES (
        v_request.requester_id,
        'join_request_rejected',
        'Join Request Update',
        'Your request to join ' || v_group_name
            || ' was not approved at this time. Open the Groups section to see the reason.',
        p_group_join_request_id,
        FALSE
    );

    -- ── 8. Return ─────────────────────────────────────────────
    RETURN jsonb_build_object(
        'status',         'success',
        'message',        'Request rejected and member notified.',
        'group_id',       v_request.group_id,
        'requester_id',   v_request.requester_id,
        'reviewed_by',    p_reviewed_by,
        'admin_message',  p_admin_message,
        'request_status', 'rejected',
        'reviewed_at',    now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.group_join_request_reject(UUID, UUID, TEXT)
    TO authenticated;


-- ============================================================
-- FUNCTION: get_group_join_requests
-- PURPOSE:  Returns all join requests for a group.
--           Used by the admin dashboard. Joins with
--           public.members to surface requester names.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_group_join_requests(
    p_group_id    UUID,
    p_admin_id    UUID
)
RETURNS TABLE (
    request_id       UUID,
    group_id         UUID,
    requester_id     UUID,
    requester_name   TEXT,
    member_code      TEXT,
    request_message  TEXT,
    admin_message    TEXT,
    request_status   TEXT,
    created_at       TIMESTAMPTZ,
    reviewed_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- Enforce admin check
    IF NOT EXISTS (
        SELECT 1 FROM groups.group_members gm
        WHERE  gm.group_id      = p_group_id
          AND  gm.member_id     = p_admin_id
          AND  gm.member_role   = 'admin'
          AND  gm.member_status = 'active'
    ) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Member % is not an active admin of group %.', p_admin_id, p_group_id;
    END IF;

    RETURN QUERY
    SELECT
        gjr.id                                              AS request_id,
        gjr.group_id,
        gjr.requester_id,
        (m.first_name || ' ' || m.last_name)::TEXT         AS requester_name,
        -- member_code only exists if they're already a group member (they won't be)
        -- LEFT JOIN so non-members still appear; member_code will be NULL
        gm.member_code::TEXT,
        gjr.request_message,
        gjr.admin_message,
        gjr.request_status::TEXT,
        gjr.created_at,
        gjr.reviewed_at
    FROM  groups.group_join_requests gjr
    JOIN  public.members m        ON m.id        = gjr.requester_id
    LEFT JOIN groups.group_members gm ON gm.member_id = gjr.requester_id
                                     AND gm.group_id  = gjr.group_id
    WHERE gjr.group_id = p_group_id
    ORDER BY
        CASE gjr.request_status WHEN 'pending' THEN 0 ELSE 1 END,
        gjr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_join_requests(UUID, UUID)
    TO authenticated;

-- ============================================================
-- PURPOSE:   Single RPC call that returns everything the
--            Group Preview screen needs:
--            • Group identity + description
--            • Aggregated stats (total/active members, admins)
--            • Admin profiles (name)
--            • Sample member list (up to 8)
--            • Privacy flag
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_group_preview(
    p_group_id UUID
)
RETURNS TABLE (
    out_group_id          UUID,
    out_group_name        TEXT,
    out_group_description TEXT,
    out_group_status      TEXT,
    out_max_capacity      NUMERIC,
    out_is_private        BOOLEAN,
    out_created_at        TIMESTAMPTZ,
    out_total_members     BIGINT,
    out_active_members    BIGINT,
    out_admin_count       BIGINT,
    out_admins            JSONB,
    out_sample_members    JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_group public.groups%ROWTYPE;
BEGIN
    SELECT *
    INTO   v_group
    FROM   public.groups
    WHERE  id           = p_group_id
      AND  group_status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: No active group found for id %.', p_group_id;
    END IF;

    RETURN QUERY
    SELECT
        v_group.id,
        v_group.group_name::TEXT,
        v_group.group_description::TEXT,
        v_group.group_status::TEXT,
        v_group.max_capacity,
        COALESCE(v_group.is_private, TRUE),
        v_group.created_at,

        (SELECT COUNT(*) FROM groups.group_members gm
         WHERE gm.group_id = p_group_id),

        (SELECT COUNT(*) FROM groups.group_members gm
         WHERE gm.group_id = p_group_id AND gm.member_status = 'active'),

        (SELECT COUNT(*) FROM groups.group_members gm
         WHERE gm.group_id = p_group_id AND gm.member_role = 'admin' AND gm.member_status = 'active'),

        (SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'member_id',  m.id,
                    'first_name', m.first_name,
                    'last_name',  m.last_name
                ) ORDER BY gm.created_at ASC
            ), '[]'::JSONB)
         FROM groups.group_members gm
         JOIN public.members m ON m.id = gm.member_id
         WHERE gm.group_id = p_group_id AND gm.member_role = 'admin' AND gm.member_status = 'active'),

        (SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'member_id',  sub.id,
                    'first_name', sub.first_name,
                    'last_name',  sub.last_name
                )
            ), '[]'::JSONB)
         FROM (
             SELECT m.id, m.first_name, m.last_name
             FROM groups.group_members gm
             JOIN public.members m ON m.id = gm.member_id
             WHERE gm.group_id = p_group_id AND gm.member_role = 'member' AND gm.member_status = 'active'
             ORDER BY gm.created_at ASC
             LIMIT 8
         ) sub);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_preview(UUID)
    TO authenticated, anon;


-- ============================================================
-- SUPPORTING: is_private column guard
-- If public.groups does not yet have an is_private column
-- ============================================================
ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT TRUE;  

GRANT EXECUTE ON FUNCTION public.get_group_preview(UUID)
    TO authenticated,anon;      