
DROP SCHEMA IF EXISTS groups CASCADE;
CREATE SCHEMA groups;
SET SEARCH_PATH TO groups, public, finance;



-- Rotation‑specific enums (original)
CREATE TYPE groups.rotation_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE groups.rotation_penalty_applied_status AS ENUM ('paid', 'pending');
CREATE TYPE groups.member_role AS ENUM ('admin', 'member');
CREATE TYPE groups.member_status AS ENUM ('active', 'suspended', 'banned', 'deleted');
CREATE TYPE groups.rotation_status AS ENUM ('active', 'dormant', 'completed', 'deleted');
CREATE TYPE groups.disbursement_type AS ENUM ('auto', 'approval');
CREATE TYPE groups.low_funds_options AS ENUM ('distribute', 'hold', 'approval');
CREATE TYPE groups.interval_status AS ENUM ('active', 'dormant', 'deleted');
CREATE TYPE groups.interval_type AS ENUM ('system', 'custom');
CREATE TYPE groups.rotation_plan_members_status AS ENUM ('pending', 'completed');
CREATE TYPE groups.schedule_status AS ENUM ('upcoming', 'disbursed', 'pending', 'canceled');
CREATE TYPE groups.schedule_action AS ENUM ('payout', 'collection');
CREATE TYPE groups.schedule_amount_status AS ENUM ('full', 'partial', 'null');

-- Generic plan enums (NEW)
CREATE TYPE groups.plan_status AS ENUM ('active', 'dormant', 'deleted');
CREATE TYPE groups.plan_members_status AS ENUM ('active', 'pending', 'removed', 'suspended');
CREATE TYPE groups.plan_invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');



-- 3.1 interval (unchanged)
CREATE TABLE IF NOT EXISTS groups.interval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interval_name TEXT NOT NULL,
    interval_description TEXT,
    no_of_days NUMERIC NOT NULL DEFAULT 1 CHECK (no_of_days > 0),
    interval_status groups.interval_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
    interval_type groups.interval_type NOT NULL DEFAULT 'system',
    interval_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('GIC')
);

-- 3.2 plan_types (unchanged)
CREATE TABLE IF NOT EXISTS groups.plan_types (
    type_name TEXT PRIMARY KEY,
    type_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.3 plans (MODIFIED: group_id → owner_entity_id, uncommented plan_name & description)
CREATE TABLE IF NOT EXISTS groups.plans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_entity_id  UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    plan_type        TEXT NOT NULL REFERENCES groups.plan_types(type_name) ON DELETE RESTRICT ON UPDATE CASCADE,
    plan_name        TEXT NOT NULL,                 -- uncommented and made NOT NULL
    plan_description TEXT,
    plan_status      groups.plan_status NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 3.4 group_members (unchanged)
CREATE TABLE IF NOT EXISTS groups.group_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id     UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_role   groups.member_role NOT NULL DEFAULT 'member',
    member_code   TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('GMC'),
    member_status groups.member_status DEFAULT 'active',
    invited_by    UUID REFERENCES groups.group_members(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, member_id)
);

-- 3.5 rotation_plan (unchanged except referencing groups.plans)
CREATE TABLE IF NOT EXISTS groups.rotation_plan (
    id                               UUID PRIMARY KEY REFERENCES groups.plans(id),
    rotation_name                    TEXT NOT NULL DEFAULT 'groups rotation',
    rotation_description             TEXT,
    start_date                       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    interval_id                      UUID NOT NULL REFERENCES groups.interval(id) ON DELETE RESTRICT,
    rotation_status                  groups.rotation_status DEFAULT 'active' NOT NULL,
    penalty_amount                   NUMERIC CHECK (penalty_amount >= 0) DEFAULT 0,
    grace_period                     NUMERIC DEFAULT 0 CHECK (grace_period >= 0),
    created_by                       UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT,
    amount_collectable               NUMERIC DEFAULT 0 NOT NULL CHECK (amount_collectable >= 0),
    disbursement_type                groups.disbursement_type NOT NULL DEFAULT 'auto',
    low_funds_options                groups.low_funds_options NOT NULL DEFAULT 'approval',
    created_at                       TIMESTAMPTZ DEFAULT now(),
    rotation_plan_code               TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RPC'),
    rotation_plan_reserve_account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    CONSTRAINT valid_start_date CHECK (start_date >= now())
);

-- 3.6 rotation_plan_invite (unchanged)
CREATE TABLE IF NOT EXISTS groups.rotation_plan_invite (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_member_id        UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT,
    rotation_plan_id       UUID NOT NULL REFERENCES groups.rotation_plan(id) ON DELETE RESTRICT,
    rotation_invite_status groups.rotation_invite_status,
    expires_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
);

-- 3.7 rotation_plan_members (unchanged)
CREATE TABLE IF NOT EXISTS groups.rotation_plan_members (
    id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intive_id                        UUID NOT NULL UNIQUE REFERENCES groups.rotation_plan_invite(id) ON DELETE RESTRICT,
    rotation_plan_members_status     groups.rotation_plan_members_status NOT NULL DEFAULT 'pending',
    rotation_plan_members_code       TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RPM')
);

-- 3.8 rotation_schedule (unchanged)
CREATE TABLE IF NOT EXISTS groups.rotation_schedule (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    date_scheduled          TIMESTAMPTZ NOT NULL,
    schedule_action         groups.schedule_action NOT NULL,
    rotation_schedule_index NUMERIC,
    schedule_status         groups.schedule_status NOT NULL DEFAULT 'upcoming',
    amount_involved         NUMERIC NOT NULL DEFAULT 0
);

-- 3.9 rotation_penalty_applied (unchanged)
CREATE TABLE IF NOT EXISTS groups.rotation_penalty_applied (
    id                                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id                     UUID REFERENCES finance.transactions(id) ON DELETE RESTRICT NOT NULL,
    amount_applied                     NUMERIC NOT NULL DEFAULT 0 CHECK (amount_applied >= 0),
    rotation_schedule_id               UUID REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    rotation_penalty_applied_status    groups.rotation_penalty_applied_status DEFAULT 'pending' NOT NULL,
    rotation_penalty_applied_code      TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RCS')
);

-- 3.10 rotation_reserve_amount_collected (unchanged)
CREATE TABLE IF NOT EXISTS groups.rotation_reserve_amount_collected (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    transaction_id          UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT
);

-- 3.11 schedule_amount_collected (unchanged)
CREATE TABLE IF NOT EXISTS groups.schedule_amount_collected (
    id                                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule                    UUID NOT NULL REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded                      NUMERIC NOT NULL DEFAULT 0 CHECK (amount_recorded >= 0),
    transaction_id                       UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_collected_status     groups.schedule_amount_status NOT NULL,
    date_collected                       TIMESTAMPTZ NOT NULL
);

-- 3.12 schedule_amount_disbursed (unchanged)
CREATE TABLE IF NOT EXISTS groups.schedule_amount_disbursed (
    id                                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule                      UUID NOT NULL REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded                        NUMERIC NOT NULL DEFAULT 0 CHECK (amount_recorded >= 0),
    transaction_id                         UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_disbursed_status       groups.schedule_amount_status NOT NULL,
    date_collected                         TIMESTAMPTZ NOT NULL
);


-- 4.1 Generic plan members (shared across rotation, savings, etc.)
CREATE TABLE IF NOT EXISTS groups.plan_members (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id          UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    member_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    role             TEXT DEFAULT 'member',  -- 'admin' or 'member'
    status           groups.plan_members_status NOT NULL DEFAULT 'active',
    joined_at        TIMESTAMPTZ DEFAULT now(),
    added_by         UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    UNIQUE(plan_id, member_entity_id)
);

-- 4.2 Generic plan invites
CREATE TABLE IF NOT EXISTS groups.plan_invites (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id           UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    inviter_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
    invitee_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
    status            groups.plan_invite_status NOT NULL DEFAULT 'pending',
    expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    created_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE(plan_id, invitee_entity_id)
);



-- Original indexes
CREATE INDEX members_group_id_idx ON groups.group_members(group_id);
CREATE INDEX members_member_id_idx ON groups.group_members(member_id);
CREATE INDEX members_invited_by_idx ON groups.group_members(invited_by);
CREATE INDEX members_member_code_idx ON groups.group_members(member_code);

CREATE INDEX group_interval_code_idx ON groups.interval(interval_code);
CREATE INDEX group_created_by_idx ON groups.interval(created_by);

CREATE INDEX group_rotation_plan_created_by_idx ON groups.rotation_plan(created_by);
CREATE INDEX group_rotation_plan_code_idx ON groups.rotation_plan(rotation_plan_code);

CREATE INDEX group_rotation_plan_members_code_idx ON groups.rotation_plan_members(rotation_plan_members_code);

CREATE INDEX group_rotation_penalty_applied_code_idx ON groups.rotation_penalty_applied(rotation_penalty_applied_code);
CREATE INDEX group_rotation_penalty_transaction_id_idx ON groups.rotation_penalty_applied(transaction_id);
CREATE INDEX group_rotation_rotation_collection_schedule_id_idx ON groups.rotation_penalty_applied(rotation_schedule_id);

-- New indexes for generic tables
CREATE INDEX idx_plan_members_plan ON groups.plan_members(plan_id);
CREATE INDEX idx_plan_members_member ON groups.plan_members(member_entity_id);
CREATE INDEX idx_plan_invites_plan ON groups.plan_invites(plan_id);
CREATE INDEX idx_plan_invites_invitee ON groups.plan_invites(invitee_entity_id);