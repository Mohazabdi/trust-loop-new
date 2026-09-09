DROP SCHEMA IF EXISTS groups CASCADE;
CREATE SCHEMA groups;
SET SEARCH_PATH TO groups, public, finance;
CREATE TYPE groups.plan_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TYPE groups.member_role AS ENUM(
    'admin',
    'member'
);
CREATE TYPE groups.invite_status AS ENUM (
    'pending', 
    'accepted', 
    'declined', 
    'expired', 
    'revoked');

CREATE TYPE groups.member_status AS ENUM(
    'active',
    'suspended',
    'banned',
    'deleted'
);
CREATE TYPE groups.request_status AS ENUM (
    'pending', 
    'approved', 
    'rejected');

CREATE TYPE groups.interval_status AS ENUM(
    'active',
    'dormant',
    'deleted'
);

CREATE TYPE groups.interval_type AS ENUM(
    'system',
    'custom'
);

CREATE TYPE groups.plan_member_status AS ENUM(
    'pending',
    'completed'
);

CREATE TABLE IF NOT EXISTS groups.group_members(
    id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_role groups.member_role NOT NULL DEFAULT 'member',
    member_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('GMC') ,
    member_status groups.member_status DEFAULT 'active',
    invited_by UUID REFERENCES  groups.group_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, member_id)
);


CREATE TABLE groups.group_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  invitee_id uuid,
  invitee_email text,
  invite_status groups.invite_status NOT NULL DEFAULT 'pending'::groups.invite_status,
  invite_code text NOT NULL DEFAULT gen_ref_code('GIV'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_invites_pkey PRIMARY KEY (id),
  CONSTRAINT group_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.members(id),
  CONSTRAINT group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES groups.group_members(id)
);

-- CREATE TABLE groups.group_join_requests (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   group_id uuid NOT NULL,
--   requester_id uuid NOT NULL,
--   reviewed_by uuid,
--   request_message text,
--   admin_message text,
--   request_status groups.request_status NOT NULL DEFAULT 'pending',
--   join_code text NOT NULL DEFAULT gen_ref_code('GJR'::text),
--   created_at timestamp with time zone NOT NULL DEFAULT now(),
--   reviewed_at timestamp with time zone,
--   CONSTRAINT group_join_requests_pkey PRIMARY KEY (id),
--   CONSTRAINT group_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES groups.group_members(id),
--   CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
--   CONSTRAINT group_join_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.members(id)
-- );

CREATE TABLE groups.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  is_system boolean DEFAULT false,
  sender_id uuid,
  link text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.members(id),
  CONSTRAINT notifications_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);



CREATE INDEX members_group_id_idx ON groups.group_members(group_id);
CREATE INDEX members_member_id_idx ON groups.group_members(member_id);
CREATE INDEX members_invited_by_idx ON groups.group_members(invited_by);
CREATE INDEX members_member_code_idx ON groups.group_members(member_code);

CREATE TABLE IF NOT EXISTS groups.interval(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interval_name TEXT NOT NULL,
    interval_description TEXT,
    no_of_days NUMERIC NOT NULL DEFAULT 1 CHECK(no_of_days > 0),
    interval_status groups.interval_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT, -- REFERENCE PUBLIC.ENTITY
    interval_type groups.interval_type NOT NULL DEFAULT 'system',
    interval_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('GIC')
);

CREATE INDEX group_interval_code_idx ON groups.interval(interval_code);
CREATE INDEX group_created_by_idx ON groups.interval(created_by);
-- added the account id ie the escrow reserve account created when a rotation plan is created
CREATE TABLE IF NOT EXISTS groups.plan_types (
    type_name text PRIMARY KEY,
    type_description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TYPE groups.plan_status AS ENUM ('active', 'dormant', 'deleted');
CREATE TABLE IF NOT EXISTS groups.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE ,
    plan_type TEXT NOT NULL REFERENCES groups.plan_types(type_name) ON DELETE RESTRICT ON UPDATE CASCADE,
    plan_name text NOT NULL,
    plan_description text,
    plan_status groups.plan_status NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
    
);

CREATE TABLE IF NOT EXISTS groups.plan_invite(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_member_id UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES groups.plans(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    plan_invite_status groups.plan_invite_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS groups.plan_members(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id UUID NOT NULL UNIQUE REFERENCES groups.plan_invite(id) ON DELETE RESTRICT,
    -- amount_recievable NUMERIC  NOT NULL DEFAULT 0 CHECK(amount_recievable >= 0),
    plan_member_status groups.plan_member_status NOT NULL DEFAULT 'pending',
    plan_member_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('PMC'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
    -- UNIQUE(group_member_id, rotation_plan_id)
);

CREATE INDEX group_plan_member_code_idx ON groups.plan_members(plan_member_code);

--- functions


-- CREATE TYPE groups.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled','declined');
-- CREATE TABLE IF NOT EXISTS groups.group_invites (
--     id uuid NOT NULL DEFAULT gen_random_uuid(),
--     group_id uuid NOT NULL,
--     invited_by uuid NOT NULL,
--     invitee_id uuid,
--     invitee_email text,
--     invite_status groups.invite_status NOT NULL DEFAULT 'pending'::groups.invite_status,
--     invite_code text NOT NULL DEFAULT gen_ref_code('GIV'::text),
--     created_at timestamp with time zone NOT NULL DEFAULT now(),
--     updated_at timestamp with time zone NOT NULL DEFAULT now(),
--     PRIMARY KEY (id)
-- );

-- ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.members (id);
-- ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups (id);
-- ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES groups.group_members (id);



CREATE OR REPLACE FUNCTION groups.list_discoverable_groups(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    member_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = groups, public
AS $$
    -- 1. Ensure limit is between 1 and 100
    -- (PostgreSQL will handle the default, but we can add a CHECK later)
    -- 2. Return public, active groups that the user has not joined
    SELECT
        g.id,
        g.group_name,
        g.group_description,
        COUNT(gm.id) AS member_count,
        g.created_at
    FROM public.groups g
    LEFT JOIN groups.group_members gm ON gm.group_id = g.id AND gm.member_status = 'active'
    WHERE g.group_visibility = 'public'
      AND g.group_status <> 'deleted'
      AND NOT EXISTS (
          SELECT 1 FROM groups.group_members gm2
          WHERE gm2.group_id = g.id
            AND gm2.member_id = p_user_id
            AND gm2.member_status = 'active'
      )
    GROUP BY g.id
    ORDER BY g.created_at DESC
    LIMIT p_limit;
$$;





-- ============================================================
-- FUNCTION: get_member_group_invites
-- PURPOSE:  Returns paginated pending invitations for a
--           specific member. Used to populate a member's
--           invitation inbox so they can accept or decline.
-- SCHEMA:   public
--
-- INPUTS:
--   p_member_id   UUID   – public.members id of the requesting user
--   p_limit       INT    – Page size (default 20, max 100)
--   p_offset      INT    – Pagination offset (default 0)
--
-- FILTERS APPLIED:
--   • Only returns invitations where invitee_id = p_member_id
--   • Only returns invite_status = 'pending'
--     (accepted, expired, cancelled are excluded — they are
--     terminal states and no longer actionable)
--   • 'expired' status is excluded because an expired invite
--     cannot be acted upon. The enum has no expires_at
--     timestamp column; expiry is managed by status value only.
--
-- RETURN COLUMNS:
--   invitation_id       – groups.group_invites primary key
--   invite_code         – Unique invite reference code
--   invite_status       – Always 'pending' given the filter
--   invited_at          – When the invitation was created
--   group_id            – The parent group being invited to
--   group_name          – Group display name (for UI render)
--   group_description   – Group description (for UI render)
--   group_display_photo – Group photo (for UI render)
--   inviter_member_id   – public.members id of the admin who invited
--   inviter_first_name  – Inviter's first name (for UI render)
--   inviter_last_name   – Inviter's last name (for UI render)
--   total_count         – Total pending invites (for pagination)
--
-- NOTE ON invited_by FK CHAIN:
--   group_invites.invited_by → groups.group_members(id)
--   groups.group_members.member_id → public.members(id)
--   So inviter details require two joins to reach public.members.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_member_group_invites(
    p_member_id   UUID,

    -- Pagination
    p_limit       INT   DEFAULT 20,
    p_offset      INT   DEFAULT 0
)
RETURNS TABLE (
    invitation_id         UUID,
    invite_code           TEXT,
    invite_status         groups.invite_status,
    invited_at            TIMESTAMPTZ,
    group_id              UUID,
    group_name            TEXT,
    group_description     TEXT,
    group_display_photo   TEXT,
    inviter_member_id     UUID,
    inviter_first_name    TEXT,
    inviter_last_name     TEXT,
    total_count           BIGINT
)
LANGUAGE plpgsql
STABLE                      -- Read-only; allows query planner optimisations
SECURITY DEFINER
AS $$
BEGIN

    -- ============================================================
    -- PHASE 1 – INPUT VALIDATION
    -- ============================================================

    -- ── 1a. Member id must be supplied ────────────────────────
    IF p_member_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_MEMBER_ID: p_member_id is required.';
    END IF;

    -- ── 1b. Member must exist and be active ───────────────────
    -- An inactive or non-existent member has no valid inbox.
    IF NOT EXISTS (
        SELECT 1
        FROM   public.members m
        WHERE  m.id        = p_member_id
          AND  m.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'MEMBER_NOT_FOUND: No active member found for id %.', p_member_id;
    END IF;

    -- ── 1c. Validate pagination ───────────────────────────────
    IF p_limit IS NULL OR p_limit <= 0 THEN
        RAISE EXCEPTION 'INVALID_LIMIT: p_limit must be a positive integer.';
    END IF;

    IF p_limit > 100 THEN
        RAISE EXCEPTION 'LIMIT_TOO_LARGE: p_limit cannot exceed 100 records per page.';
    END IF;

    IF p_offset IS NULL OR p_offset < 0 THEN
        RAISE EXCEPTION 'INVALID_OFFSET: p_offset must be zero or a positive integer.';
    END IF;

    -- ============================================================
    -- FETCH: Pending invitations for this member.
    --
    -- JOIN chain for inviter details:
    --   group_invites.invited_by → group_members.id  (gm)
    --   group_members.member_id  → members.id        (inviter)
    --
    -- JOIN for group details:
    --   group_invites.group_id → public.groups.id    (g)
    --
    -- Filter: invite_status = 'pending' only.
    --   'accepted', 'cancelled', and 'expired' are terminal
    --   states — not actionable, not shown in the inbox.
    --
    -- Uses existing index: idx_group_invites_invitee_status
    --   ON (invitee_id, invite_status) — covers both filter
    --   columns in the WHERE clause exactly.
    --
    -- ORDER: newest invites first so the most recent ones
    --   appear at the top of the inbox.
    -- ============================================================

    RETURN QUERY
    SELECT
        gi.id                           AS invitation_id,
        gi.invite_code                  AS invite_code,
        gi.invite_status                AS invite_status,
        gi.created_at                   AS invited_at,

        -- Group context (enough for the frontend to render
        -- an invite card without a second query)
        g.id                            AS group_id,
        g.group_name                    AS group_name,
        g.group_description             AS group_description,
        g.group_display_photo_url       AS group_display_photo,

        -- Inviter context
        -- gm.member_id is the admin's public.members id
        inviter.id                      AS inviter_member_id,
        inviter.first_name              AS inviter_first_name,
        inviter.last_name               AS inviter_last_name,

        COUNT(*) OVER()                 AS total_count

    FROM  groups.group_invites    gi

    -- Resolve the inviter: invited_by → group_members → members
    JOIN  groups.group_members    gm
          ON  gm.id               = gi.invited_by

    JOIN  public.members          inviter
          ON  inviter.id          = gm.member_id

    -- Resolve group details
    JOIN  public.groups           g
          ON  g.id                = gi.group_id

    WHERE
        -- Core: only this member's invitations
        gi.invitee_id     = p_member_id

        -- Core: only pending (actionable) invitations
        -- Uses idx_group_invites_invitee_status (invitee_id, invite_status)
        AND gi.invite_status = 'pending'

    ORDER BY
        gi.created_at DESC      -- Newest invitations first

    LIMIT  p_limit
    OFFSET p_offset;

END;
$$;

-- ============================================================
-- FUNCTION: invite_members_to_group
-- PURPOSE:  Admin-only. Creates invitation records in
--           groups.group_invites for a batch of members to
--           join a parent group. Returns a structured summary
--           of invited vs skipped members with reasons.
-- SCHEMA:   public
--
-- INPUTS:
--   p_group_id        UUID        – Target parent group
--   p_invited_by      UUID        – Calling admin's public.members id
--   p_invitee_ids     UUID[]      – Array of public.members ids to invite
--
-- RATE LIMIT:
--   An admin may not send more than 50 invitations to the same
--   group within a rolling 1-hour window. Checked before any
--   insert. Raise the constant v_rate_limit_max to relax it.
--
-- IDEMPOTENCY:
--   Members who already have a pending invite are silently
--   skipped (not errored). Re-running with the same list is
--   safe — only net-new invitations are created.
--
-- TRANSACTION:
--   All inserts succeed together or none do. Per-row validation
--   errors do NOT roll back the batch; they accumulate in the
--   skip list. Only unexpected runtime errors trigger a rollback.
--
-- CAPACITY:
--   Available slots = max_capacity
--                     - current active members
--                     - current pending invites
--   Invitees are processed in input order; once slots are
--   exhausted the remainder are skipped with reason
--   'capacity_full'.
--
-- RETURN (single JSON row):
--   status          TEXT    – 'success' | 'partial' | 'skipped'
--   message         TEXT    – Human-readable summary
--   invited_count   INT     – Invitations actually created
--   skipped_count   INT     – Members not invited
--   invited_ids     UUID[]  – public.members ids that were invited
--   skipped_details JSONB   – Array of {member_id, reason} objects
-- ============================================================

CREATE OR REPLACE FUNCTION public.invite_members_to_group(
    p_group_id     UUID,
    p_invited_by   UUID,       -- Must be an active admin in this group
    p_invitee_ids  UUID[]      -- Batch of public.members ids
)
RETURNS TABLE (
    status          TEXT,
    message         TEXT,
    invited_count   INT,
    skipped_count   INT,
    invited_ids     UUID[],
    skipped_details JSONB
)
LANGUAGE plpgsql
VOLATILE                        -- Writes data; cannot be STABLE
SECURITY DEFINER
AS $$
DECLARE
    -- ── Rate limit ────────────────────────────────────────────
    v_rate_limit_max     CONSTANT INT  := 50;   -- max invites per admin per group per hour
    v_rate_window        CONSTANT TEXT := '1 hour';
    v_recent_invite_count         INT;

    -- ── Group state ───────────────────────────────────────────
    v_group_max_capacity NUMERIC;
    v_current_members    INT;
    v_current_pending    INT;
    v_available_slots    INT;

    -- ── Admin identity ────────────────────────────────────────
    -- invited_by FK on group_invites → groups.group_members(id)
    -- so we need the admin's group_members row id, not their member id
    v_admin_gm_id        UUID;

    -- ── Loop / accumulator ────────────────────────────────────
    v_invitee_id         UUID;
    v_invited_ids        UUID[]  := ARRAY[]::UUID[];
    v_skipped_details    JSONB   := '[]'::JSONB;
    v_invited_count      INT     := 0;
    v_skipped_count      INT     := 0;

    -- ── Per-iteration state ───────────────────────────────────
    v_member_active      BOOLEAN;
    v_already_member     BOOLEAN;
    v_already_invited    BOOLEAN;
    v_skip_reason        TEXT;
BEGIN

    -- ============================================================
    -- PHASE 1 – PERMISSION VALIDATION
    -- Rule: validate permissions first, business rules second,
    --       state change last.
    -- ============================================================

    -- ── 1a. Input presence ────────────────────────────────────
    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_GROUP_ID: p_group_id is required.';
    END IF;

    IF p_invited_by IS NULL THEN
        RAISE EXCEPTION 'MISSING_INVITER: p_invited_by is required.';
    END IF;

    IF p_invitee_ids IS NULL OR array_length(p_invitee_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'MISSING_INVITEES: p_invitee_ids must be a non-empty array.';
    END IF;

    -- ── 1b. Batch size guard (prevent runaway inputs) ─────────
    IF array_length(p_invitee_ids, 1) > 200 THEN
        RAISE EXCEPTION 'BATCH_TOO_LARGE: Cannot process more than 200 invitees per call. Got %.', array_length(p_invitee_ids, 1);
    END IF;

    -- ── 1c. Caller must be an ACTIVE ADMIN in this group ──────
    -- Fetch the group_members id at the same time — needed as
    -- the invited_by FK value when inserting into group_invites.
    SELECT gm.id
    INTO   v_admin_gm_id
    FROM   groups.group_members gm
    WHERE  gm.group_id      = p_group_id
      AND  gm.member_id     = p_invited_by
      AND  gm.member_role   = 'admin'
      AND  gm.member_status = 'active';

    IF v_admin_gm_id IS NULL THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Member % is not an active admin of group %.', p_invited_by, p_group_id;
    END IF;

    -- ============================================================
    -- PHASE 2 – BUSINESS RULE VALIDATION
    -- ============================================================

    -- ── 2a. Group must be active ──────────────────────────────
    SELECT g.max_capacity
    INTO   v_group_max_capacity
    FROM   public.groups g
    WHERE  g.id           = p_group_id
      AND  g.group_status = 'active';

    IF v_group_max_capacity IS NULL THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: No active group found for id %.', p_group_id;
    END IF;

    -- ── 2b. Rate-limit check ──────────────────────────────────
    -- Count invitations this admin has created for this group
    -- in the rolling window. Uses the group_invites created_at
    -- index (group_id + invited_by + created_at).
    SELECT COUNT(*)
    INTO   v_recent_invite_count
    FROM   groups.group_invites gi
    WHERE  gi.group_id    = p_group_id
      AND  gi.invited_by  = v_admin_gm_id
      AND  gi.created_at >= NOW() - v_rate_window::INTERVAL;

    IF v_recent_invite_count >= v_rate_limit_max THEN
        RAISE EXCEPTION
            'RATE_LIMIT_EXCEEDED: Admin has sent % invitations to this group in the last hour (limit: %).',
            v_recent_invite_count, v_rate_limit_max;
    END IF;

    -- ── 2c. Available capacity ────────────────────────────────
    -- Slots = max_capacity - active members - pending invites.
    -- Pending invites are counted because they represent
    -- "reserved" seats that may be accepted at any time.
    SELECT COUNT(*)
    INTO   v_current_members
    FROM   groups.group_members gm
    WHERE  gm.group_id      = p_group_id
      AND  gm.member_status = 'active';

    SELECT COUNT(*)
    INTO   v_current_pending
    FROM   groups.group_invites gi
    WHERE  gi.group_id      = p_group_id
      AND  gi.invite_status = 'pending';

    v_available_slots := v_group_max_capacity::INT - v_current_members - v_current_pending;

    -- ============================================================
    -- PHASE 3 – PER-INVITEE VALIDATION AND INSERT
    -- Process each invitee in input order.
    -- Validation failures accumulate in the skip list; they do
    -- NOT raise exceptions (keeps the batch going).
    -- Capacity exhaustion stops further inserts but still
    -- processes remaining items as skipped.
    -- ============================================================

    FOREACH v_invitee_id IN ARRAY p_invitee_ids
    LOOP
        v_skip_reason := NULL;

        -- ── 3a. Null / empty element guard ────────────────────
        IF v_invitee_id IS NULL THEN
            v_skip_reason := 'invalid_id';

        ELSE

            -- ── 3b. Member must exist and be active ───────────
            SELECT m.is_active
            INTO   v_member_active
            FROM   public.members m
            WHERE  m.id = v_invitee_id;

            IF v_member_active IS NULL THEN
                v_skip_reason := 'member_not_found';

            ELSIF v_member_active = FALSE THEN
                v_skip_reason := 'member_inactive';

            ELSE

                -- ── 3c. Must not already be a group member ────
                SELECT EXISTS (
                    SELECT 1
                    FROM   groups.group_members gm
                    WHERE  gm.group_id  = p_group_id
                      AND  gm.member_id = v_invitee_id
                )
                INTO v_already_member;

                IF v_already_member THEN
                    v_skip_reason := 'already_a_member';

                ELSE

                    -- ── 3d. Must not have a live pending invite ──
                    -- Cancelled invites are allowed to be re-sent;
                    -- only 'pending' is blocked (idempotency).
                    SELECT EXISTS (
                        SELECT 1
                        FROM   groups.group_invites gi
                        WHERE  gi.group_id      = p_group_id
                          AND  gi.invitee_id    = v_invitee_id
                          AND  gi.invite_status = 'pending'
                    )
                    INTO v_already_invited;

                    IF v_already_invited THEN
                        v_skip_reason := 'invite_already_pending';

                    ELSE

                        -- ── 3e. Admin cannot invite themselves ──
                        IF v_invitee_id = p_invited_by THEN
                            v_skip_reason := 'cannot_invite_self';
                        END IF;

                    END IF;
                END IF;
            END IF;
        END IF;

        -- ── 3f. Capacity gate (applied only to valid invitees) ─
        IF v_skip_reason IS NULL AND v_available_slots <= 0 THEN
            v_skip_reason := 'capacity_full';
        END IF;

        -- ── 3g. Route: insert or skip ─────────────────────────
        IF v_skip_reason IS NULL THEN

            -- All validations passed — insert the invitation.
            -- invite_code and id are generated by column defaults
            -- (gen_ref_code / gen_random_uuid), so we don't supply them.
            INSERT INTO groups.group_invites (
                group_id,
                invited_by,     -- groups.group_members(id) of admin
                invitee_id,     -- public.members(id) of recipient
                invite_status
            )
            VALUES (
                p_group_id,
                v_admin_gm_id,
                v_invitee_id,
                'pending'
            );

            v_invited_ids   := v_invited_ids || v_invitee_id;
            v_invited_count := v_invited_count + 1;
            v_available_slots := v_available_slots - 1;   -- consume one slot

        ELSE

            -- Accumulate skip details as a JSONB array element.
            v_skipped_details := v_skipped_details || jsonb_build_object(
                'member_id', v_invitee_id,
                'reason',    v_skip_reason
            );
            v_skipped_count := v_skipped_count + 1;

        END IF;

    END LOOP;

    -- ============================================================
    -- PHASE 4 – RETURN STRUCTURED RESULT
    -- ============================================================

    RETURN QUERY
    SELECT
        -- status: 'success'  → at least one invited, none skipped
        --         'partial'  → at least one invited, some skipped
        --         'skipped'  → nothing invited at all
        CASE
            WHEN v_invited_count > 0 AND v_skipped_count = 0 THEN 'success'
            WHEN v_invited_count > 0 AND v_skipped_count > 0 THEN 'partial'
            ELSE 'skipped'
        END::TEXT                                                    AS status,

        FORMAT(
            '%s invitation(s) sent, %s skipped.',
            v_invited_count,
            v_skipped_count
        )::TEXT                                                      AS message,

        v_invited_count                                              AS invited_count,
        v_skipped_count                                              AS skipped_count,
        v_invited_ids                                                AS invited_ids,
        v_skipped_details                                            AS skipped_details;

END;
$$;


-- ============================================================
-- SUPPORTING INDEX
-- Speeds up the rate-limit query and the pending-invite
-- duplicate check inside the function. Run once after
-- deploying.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_group_invites_rate_limit
    ON groups.group_invites (group_id, invited_by, created_at)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_group_invites_pending_lookup
    ON groups.group_invites (group_id, invitee_id, invite_status)
    TABLESPACE pg_default;


CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS grp_name_trgm_idx
    ON public.groups
    USING GIN (group_name gin_trgm_ops)
    TABLESPACE pg_default;

-- ============================================================
-- FUNCTION: get_available_members_for_invitation
-- PURPOSE:  Returns paginated active members who are NOT yet
--           members of a specific parent group.
--           Used by admins to discover invitable members
-- SCHEMA:   public
--
-- RULES APPLIED:
--   • Excludes members already in the group (any status)
--   • Excludes inactive members (is_active = false)
--   • Optional search by first/last name, email, or phone
--   • Validates group existence before querying
--   • Returns structured result with total_count for pagination
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_members_for_invitation(
    p_group_id   UUID,

    -- Pagination
    p_limit      INT     DEFAULT 20,
    p_offset     INT     DEFAULT 0,

    -- Optional search (admin efficiency: name, email, or phone)
    p_search     TEXT    DEFAULT NULL
)
RETURNS TABLE (
    member_id           UUID,
    member_ref          TEXT,
    first_name          TEXT,
    last_name           TEXT,
    email               TEXT,
    primary_phone       TEXT,
    display_photo_url   TEXT,
    total_count         BIGINT   -- Total available members (for frontend pagination)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN

    -- --------------------------------------------------------
    -- RULE 1: p_group_id must be supplied
    -- --------------------------------------------------------
    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_GROUP_ID: p_group_id is required.';
    END IF;

    -- --------------------------------------------------------
    -- RULE 2: Group must exist and be active
    -- --------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id            = p_group_id
          AND g.group_status  = 'active'
    ) THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: No active group found for id %.', p_group_id;
    END IF;

    -- --------------------------------------------------------
    -- RULE 3: Validate pagination
    -- --------------------------------------------------------
    IF p_limit IS NULL OR p_limit <= 0 THEN
        RAISE EXCEPTION 'INVALID_LIMIT: p_limit must be a positive integer.';
    END IF;

    IF p_limit > 100 THEN
        RAISE EXCEPTION 'LIMIT_TOO_LARGE: p_limit cannot exceed 100 records per page.';
    END IF;

    IF p_offset IS NULL OR p_offset < 0 THEN
        RAISE EXCEPTION 'INVALID_OFFSET: p_offset must be zero or a positive integer.';
    END IF;

    -- --------------------------------------------------------
    -- FETCH: Active members not yet in the group.
    --
    -- Exclusion uses NOT EXISTS (rather than LEFT JOIN / NOT IN)
    -- because it short-circuits on the first match and handles
    -- NULLs safely — important as group_members can have
    -- multiple rows per member across different groups.
    --
    -- Search targets: name (trigram via pg_trgm), email prefix,
    -- and phone prefix. Trigram search on name is intentionally
    -- loose (threshold 0.1) to catch partial matches an admin
    -- might type. Email/phone use ILIKE 'term%' (prefix) which
    -- is efficient on a btree index.
    -- --------------------------------------------------------
    RETURN QUERY
    SELECT
        m.id                    AS member_id,
        m.member_ref            AS member_ref,
        m.first_name            AS first_name,
        m.last_name             AS last_name,
        m.email                 AS email,
        m.primary_phone         AS primary_phone,
        m.display_photo_url     AS display_photo_url,
        COUNT(*) OVER()         AS total_count

    FROM public.members m

    WHERE
        -- Core: only active members
        m.is_active = TRUE

        -- Core: exclude only ACTIVE members of this group.
        -- Members who previously left (member_status != 'active')
        -- are included so admins can re-invite them.
        AND NOT EXISTS (
            SELECT 1
            FROM groups.group_members gm
            WHERE gm.member_id     = m.id
              AND gm.group_id      = p_group_id
              AND gm.member_status = 'active'
        )

        -- Optional: search by name (trigram), email prefix, or phone prefix
        AND (
            p_search IS NULL
            OR similarity(m.first_name || ' ' || m.last_name, TRIM(p_search)) > 0.1
            OR m.email         ILIKE TRIM(p_search) || '%'
            OR m.primary_phone ILIKE TRIM(p_search) || '%'
        )

    ORDER BY
        -- Prioritise closer name matches when a search term is given;
        -- fall back to registration date (newest first) for browsing.
        CASE
            WHEN p_search IS NOT NULL
            THEN similarity(m.first_name || ' ' || m.last_name, TRIM(p_search))
            ELSE NULL
        END DESC NULLS LAST,
        m.date_of_register DESC

    LIMIT  p_limit
    OFFSET p_offset;

END;
$$;

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


CREATE OR REPLACE FUNCTION groups.create_group(
    p_created_by        UUID,
    p_group_name        TEXT,
    p_currency_code     TEXT,
    p_group_description TEXT DEFAULT NULL,
    p_group_visibility  TEXT DEFAULT 'private',
    p_max_capacity      NUMERIC DEFAULT 50,
    p_min_capacity      NUMERIC DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = groups, public
AS $$
DECLARE
    v_entity_id    UUID;
    v_group_id     UUID;
    v_group_code   TEXT;
    v_member_code  TEXT;
    v_system_entity_id UUID;
    v_result JSONB;
    v_group_account_id UUID;
    v_group_account_name TEXT;
    v_overdraft_account_id UUID;
    v_overdraft_account_name TEXT;
    v_wallet_id UUID;
    v_wallet_name TEXT;
    v_wallet_access_level TEXT;
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
         SELECT public.create_entity(
        'group',
        p_group_name,
        'active',
        '@group.ent'
    ) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_entity_id := (v_result->'data'->>'id')::UUID;

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
    ---7  CREATE GROUP ACCOUNTING ATTRIBUTES
 SELECT public.get_system_entity() INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_system_entity_id := (v_result->'data'->>'id')::UUID;


    SELECT finance.create_account(
        p_acc_type := 'group',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'active',
        p_acc_name := format('%s Group Account',p_group_name),
        p_acc_description := format('Main operating account for group %s',p_group_name),
        p_min_balance := 0,
        p_max_balance := 1000000,
        p_max_transfer_amount := 500000
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_group_account_id := (v_result->'data'->>'id')::UUID;
    v_group_account_name := (v_result->'data'->>'acc_name');

 SELECT finance.create_account(
        p_acc_type := 'overdraft',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'dormant',
        p_acc_name := format('%s  Overdraft Account',p_group_name ),
        p_acc_description := format('Overdraft facility for group %s' , p_group_name),
        p_min_balance := 0,
        p_max_balance := 0,
        p_max_transfer_amount := 0
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_overdraft_account_id := (v_result->'data'->>'id')::UUID;
    v_overdraft_account_name := (v_result->'data'->>'acc_name');

     SELECT finance.create_wallet(
        p_wallet_name := format('%s  Group Wallet',p_group_name),
        p_owner_entity_id := v_entity_id,
        p_wallet_status := 'active',
        p_wallet_type := 'group',
        p_wallet_description := format('Wallet for group %s ', p_group_name)
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_id := (v_result->'data'->>'id')::UUID;
    v_wallet_name := (v_result->'data'->>'wallet_name');

    -- 9. Link accounts to wallet
    SELECT finance.link_account_to_wallet(v_wallet_id, v_group_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN 
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
    END IF;

    SELECT finance.link_account_to_wallet(v_wallet_id, v_overdraft_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
             RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
     END IF;

    -- 10. Grant wallet access to the creator (the member)
    SELECT finance.grant_wallet_access(
        p_wallet_id := v_wallet_id,
        p_entity_id := p_created_by,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_access_level := (v_result->'data'->>'access_level')::finance.wallet_access_level;
       -- 10. Grant wallet access to the groupEntity
    SELECT finance.grant_wallet_access(
        p_wallet_id := v_wallet_id,
        p_entity_id := v_entity_id,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_access_level := (v_result->'data'->>'access_level')::finance.wallet_access_level;

    -- 8. Return consistent JSON response
    RETURN jsonb_build_object(
        'group_id',    v_group_id,
        'group_ref',   v_group_code,
        'entity_id',   v_entity_id,
        'member_code', v_member_code,
        'status',      'created'
    );
END;
$$;


CREATE OR REPLACE FUNCTION groups.get_all_member_group(p_member_id UUID)
RETURNS TABLE(
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    number_of_members BIGINT,
    group_display_photo_url TEXT,
    group_status TEXT,
    no_of_unread_notifications BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = groups, public
AS $$
    -- 1. Validate member exists? (optional – left to caller)
    -- 2. List all active groups where the member is active
    SELECT
        g.id,
        g.group_name,
        g.group_description,
        (SELECT COUNT(*) FROM groups.group_members gm2
         WHERE gm2.group_id = g.id AND gm2.member_status = 'active') AS number_of_members,
        g.group_display_photo_url,
        g.group_status::TEXT,
        COALESCE((
            SELECT COUNT(*)
            FROM groups.notifications n
            WHERE n.member_id = p_member_id AND n.is_read = false
        ), 0)::BIGINT AS no_of_unread_notifications
    FROM public.groups g
    INNER JOIN groups.group_members gm ON gm.group_id = g.id
    WHERE gm.member_id = p_member_id
      AND gm.member_status = 'active'
      AND g.group_status != 'deleted'
    ORDER BY g.created_at DESC;
$$;
CREATE OR REPLACE FUNCTION groups.get_group_members_details(p_group_id UUID)
RETURNS TABLE(
    group_member_id UUID,
    member_id UUID,
    first_name TEXT,
    last_name TEXT,
    other_name TEXT,
    email TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    date_of_birth TIMESTAMPTZ,
    gender public.gender,
    national_id TEXT,
    verification_status public.verification_status,
    cover_photo_url TEXT,
    display_photo_url TEXT,
    about TEXT,
    member_role TEXT,
    member_status TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SET search_path = groups, public
AS $$
BEGIN
    -- Validate group exists and is not deleted
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND group_status != 'deleted') THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- Return full member details (only active members)
    RETURN QUERY
    SELECT
        gm.id AS group_member_id,
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.other_name,
        m.email,
        m.primary_phone,
        m.secondary_phone,
        m.date_of_birth,
        m.gender,
        m.national_id,
        m.verification_status,
        m.cover_photo_url,
        m.display_photo_url,
        m.about,
        gm.member_role::TEXT,
        gm.member_status::TEXT,
        gm.created_at AS joined_at
    FROM groups.group_members gm
    INNER JOIN public.members m ON m.id = gm.member_id
    WHERE gm.group_id = p_group_id
      AND gm.member_status = 'active'
    ORDER BY gm.created_at ASC;
END;
$$;





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
    FROM   groups.plan_members rpm
    JOIN   rotations.rotation_plan         rp  ON rp.id = rpm.rotation_plan_id
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
    UPDATE groups.plan_members
    SET    rotation_member_status = 'removed',
           updated_at             = NOW()
    WHERE  group_member_id        = v_target_gm_id
      AND  rotation_member_status = 'active';

    -- 5b. Cancel all pending rotation invites for this member.
    --     The WHERE clause is scoped to this member's group_member_id
    --     so no other member's invites are touched.
    UPDATE groups.plan_invite
    SET    plan_invite_status = 'cancelled',
           updated_at    = NOW()
    WHERE  group_member_id = v_target_gm_id
      AND  plan_invite_status   = 'pending';

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



