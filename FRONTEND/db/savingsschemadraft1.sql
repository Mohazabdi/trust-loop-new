CREATE SCHEMA savings;
SET SEARCH_PATH TO savings, public, finance, groups;


CREATE TYPE savings.contribution_status AS ENUM (
    'pending', 
    'paid', 
    'overdue', 
    'waived');
CREATE TYPE savings.withdrawal_status AS ENUM (
    'pending', 
    'approved', 
    'rejected', 
    'completed'
);
CREATE TYPE groups.plan_members_status AS ENUM (
    'active', 
    'pending', 
    'removed', 
    'suspended'
);
CREATE TYPE groups.plan_invite_status AS ENUM (
    'pending', 
    'accepted', 
    'declined', 
    'expired'
);
CREATE TYPE groups.plan_member_role AS ENUM (
    'admin', 
    'member',
    'viewer'
);

CREATE TABLE savings.plan_details (
    id                   UUID PRIMARY KEY REFERENCES groups.plans(id) ON DELETE CASCADE,
    target_amount        NUMERIC, --NOT NULL CHECK (target_amount > 0),
    contribution_interval INTERVAL,-- NOT NULL DEFAULT '1 month', -- e.g., '1 week', '1 month'
    --interest_rate        NUMERIC DEFAULT 0 CHECK (interest_rate >= 0),
    maturity_date        TIMESTAMPTZ, --NOT NULL= no end date, can be null for open-ended plans
    reserve_account_id   UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT, --

    min_contribution     NUMERIC DEFAULT 0 CHECK (min_contribution >= 0),
    max_contribution     NUMERIC CHECK (max_contribution > min_contribution),
    -- allow_withdrawal     BOOLEAN DEFAULT false,  -- if true, members can withdraw before maturity (maybe with penalty)
    -- withdrawal_penalty   NUMERIC DEFAULT 0,
    created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE groups.plan_members (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id          UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    member_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    role             groups.plan_member_role NOT NULL DEFAULT 'member',
    status           groups.plan_members_status NOT NULL DEFAULT 'active',
    joined_at        TIMESTAMPTZ DEFAULT now(),
    --added_by         UUID REFERENCES public.entities(id) ON DELETE SET NULL,  -- who added this member
    UNIQUE(plan_id, member_entity_id)
);

CREATE TABLE savings.contribution_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    member_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    due_date        TIMESTAMPTZ NOT NULL,
    amount_due      NUMERIC NOT NULL CHECK (amount_due >= 0),
    status          savings.contribution_status NOT NULL DEFAULT 'pending', -- pending, paid, overdue, waived
    schedule_index  INTEGER NOT NULL, -- to maintain order
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(plan_id, member_entity_id, due_date)
);


CREATE TABLE savings.contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    member_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    transaction_id  UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    amount          NUMERIC NOT NULL CHECK (amount >= 0),
    contribution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    schedule_id     UUID REFERENCES savings.contribution_schedules(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}'
);

CREATE TABLE savings.withdrawals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    member_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    amount          NUMERIC NOT NULL CHECK (amount >= 0),
    withdrawal_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_id  UUID REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    status          savings.withdrawal_status NOT NULL DEFAULT 'pending',
    reviewed_by   UUID REFERENCES public.entities(id) ON DELETE SET NULL, -- Who reviewed it (approve/reject)
    reviewed_at   TIMESTAMPTZ, -- When they reviewed it
    metadata        JSONB DEFAULT '{}'
);


CREATE TABLE savings.goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
    deadline    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE savings.withdrawal_policies (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id           UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    allow_early       BOOLEAN DEFAULT false, -- if true, members can withdraw before maturity (maybe with penalty) 
    penalty_percent   NUMERIC DEFAULT 0 CHECK (penalty_percent >= 0 AND penalty_percent <= 100),
    --penalty_applied NUMERIC DEFAULT 0,
    min_holding_days  INTEGER DEFAULT 0,  -- minimum days before withdrawal allowed
    approval_required BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE groups.plan_invites (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id           UUID NOT NULL REFERENCES groups.plans(id) ON DELETE CASCADE,
    inviter_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
    invitee_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
    status            groups.plan_invite_status NOT NULL DEFAULT 'pending',
    expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    created_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE(plan_id, invitee_entity_id)
);



-- Indexes for performance (add as needed)
CREATE INDEX idx_contribution_schedules_plan ON savings.contribution_schedules(plan_id);
CREATE INDEX idx_contributions_plan ON savings.contributions(plan_id);
CREATE INDEX idx_withdrawals_plan ON savings.withdrawals(plan_id);
CREATE INDEX idx_goals_plan ON savings.goals(plan_id);
CREATE INDEX idx_withdrawal_policies_plan ON savings.withdrawal_policies(plan_id);