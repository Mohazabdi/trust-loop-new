DROP SCHEMA IF EXISTS groups CASCADE;
CREATE SCHEMA groups;
SET SEARCH_PATH TO groups, public, finance;
CREATE TYPE groups.rotation_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE groups.rotation_penalty_applied_status AS ENUM(
    'paid',
    'pending'
);

CREATE TYPE groups.member_role AS ENUM(
    'admin',
    'member'
);

CREATE TYPE groups.member_status AS ENUM(
    'active',
    'suspended',
    'banned',
    'deleted'
);

CREATE TYPE groups.rotation_status AS ENUM(
    'active',
    'dormant',
    'completed',
    'deleted'
);

CREATE TYPE groups.disbursement_type AS ENUM(
    'auto',
    'approval'
);
CREATE TYPE groups.low_funds_options AS ENUM(
    'distribute',
    'hold',
    'approval'
);

CREATE TYPE groups.interval_status AS ENUM(
    'active',
    'dormant',
    'deleted'
);

CREATE TYPE groups.interval_type AS ENUM(
    'system',
    'custom'
);

CREATE TYPE groups.rotation_plan_members_status AS ENUM(
    'pending',
    'completed'
);

CREATE TYPE groups.schedule_status AS ENUM(
   'upcoming',
    'disbursed',
    'pending',
    'canceled'
);
CREATE TYPE groups.schedule_action AS ENUM(
    'payout',
    'collection'
);
--added to keep track of the amount status collected 
CREATE TYPE groups.schedule_amount_status AS ENUM(
    'full',
    'partial',
    'null'
);
CREATE TYPE groups.payout_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TABLE groups.group_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  invitee_id uuid,
  invitee_email text,
  invite_status USER-DEFINED NOT NULL DEFAULT 'pending'::groups.invite_status,
  invite_code text NOT NULL DEFAULT gen_ref_code('GIV'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_invites_pkey PRIMARY KEY (id),
  CONSTRAINT group_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.members(id),
  CONSTRAINT group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES groups.group_members(id)
);

CREATE TABLE groups.group_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  reviewed_by uuid,
  request_message text,
  admin_message text,
  request_status groups.request_status NOT NULL DEFAULT 'pending',
  join_code text NOT NULL DEFAULT gen_ref_code('GJR'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT group_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT group_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES groups.group_members(id),
  CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_join_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.members(id)
);

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
    -- plan_name text NOT NULL,
    -- plan_description text,
    plan_status groups.plan_status NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
    
);
CREATE TABLE IF NOT EXISTS groups.rotation_plan(
    id UUID PRIMARY KEY REFERENCES groups.plans(id),
    rotation_name TEXT NOT NULL DEFAULT 'groups rotation',--use a seq to autoname the groups later on
    rotation_description TEXT,
    start_date   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days', -- DEFAULT now()
    interval_id UUID NOT NULL REFERENCES groups.interval(id) ON DELETE RESTRICT,
    rotation_status groups.rotation_status DEFAULT 'active' NOT NULL,
    penalty_amount NUMERIC CHECK(penalty_amount >= 0) DEFAULT 0,
    grace_period NUMERIC DEFAULT 0 CHECK(grace_period >= 0),
    created_by UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT, -- REFERENCE GROUP GROUP_MEMBERS
    -- amount_distributable NUMERIC DEFAULT 0 NOT NULL CHECK(amount_distributable >= 0),-- redundant
    amount_collectable NUMERIC DEFAULT 0 NOT NULL CHECK(amount_collectable >= 0),-- set the amount to collect per member for a plan 
    disbursement_type groups.disbursement_type NOT NULL DEFAULT 'auto' ,
    low_funds_options groups.low_funds_options NOT NULL DEFAULT 'approval',
    created_at TIMESTAMPTZ DEFAULT now(),
    rotation_plan_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RPC') ,
    rotation_plan_reserve_account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,-- the reserve account to collected accumulative collections from groups
    CONSTRAINT valid_start_date CHECK(start_date >= now())
);

CREATE INDEX group_rotation_plan_created_by_idx ON groups.rotation_plan(created_by);
-- CREATE INDEX group_rotation_plan_group_id_idx ON groups.rotation_plan(group_id);
CREATE INDEX group_rotation_plan_code_idx ON groups.rotation_plan(rotation_plan_code);



-- added a rotatoion plan invite table
CREATE TABLE IF NOT EXISTS groups.rotation_plan_invite(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_member_id UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT,
    rotation_plan_id UUID NOT NULL REFERENCES groups.rotation_plan(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    rotation_invite_status groups.rotation_invite_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS groups.rotation_plan_members(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intive_id UUID NOT NULL UNIQUE REFERENCES groups.rotation_plan_invite(id) ON DELETE RESTRICT,
    -- amount_recievable NUMERIC  NOT NULL DEFAULT 0 CHECK(amount_recievable >= 0),
    rotation_plan_members_status groups.rotation_plan_members_status NOT NULL DEFAULT 'pending',
    rotation_plan_members_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RPM'),
    updated_at timestamp with time zone DEFAULT now()
    -- UNIQUE(group_member_id, rotation_plan_id)
);

--CREATE INDEX group_group_member_id_idx ON groups.rotation_plan_members(group_member_id);
CREATE INDEX group_rotation_plan_members_code_idx ON groups.rotation_plan_members(rotation_plan_members_code);

CREATE TABLE IF NOT EXISTS groups.rotation_schedule(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    date_scheduled TIMESTAMPTZ NOT NULL,
    schedule_action groups.schedule_action NOT NULL ,
    rotation_schedule_index NUMERIC,
    schedule_status groups.schedule_status NOT NULL DEFAULT 'upcoming',
    amount_involved NUMERIC NOT NULL DEFAULT 0
    );


CREATE TABLE IF NOT EXISTS groups.rotation_penalty_applied(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES finance.transactions(id) ON DELETE RESTRICT NOT NULL,
    amount_applied NUMERIC NOT NULL DEFAULT 0 CHECK(amount_applied >= 0),
    rotation_schedule_id UUID REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    rotation_penalty_applied_status   groups.rotation_penalty_applied_status  DEFAULT 'pending' NOT NULL,
    rotation_penalty_applied_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RCS')
);
CREATE INDEX group_rotation_penalty_applied_code_idx ON  groups.rotation_penalty_applied(rotation_penalty_applied_code);
CREATE INDEX group_rotation_penalty_transaction_id_idx ON  groups.rotation_penalty_applied(transaction_id);
CREATE INDEX group_rotation_rotation_collection_schedule_id_idx ON  groups.rotation_penalty_applied(rotation_schedule_id);
-- added reserve table to keep track of amounts collected over time for members in a certain rotation plan 
CREATE TABLE IF NOT EXISTS groups.rotation_reserve_amount_collected(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT
    -- amount_recorded NUMERIC NOT NULL DEFAULT 0 CHECK(amount_recorded>=0),

);
-- added amount_collected_record table to keep track of the amounts removed from reserve by the system to settle the amount collected for a certain interval schedule
CREATE TABLE IF NOT EXISTS groups.schedule_amount_collected(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule UUID NOT NULL REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded NUMERIC NOT NULL DEFAULT 0  CHECK(amount_recorded>=0),
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_collected_status groups.schedule_amount_status NOT NULL,
    date_collected TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS groups.schedule_amount_disbursed(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule UUID NOT NULL REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded NUMERIC NOT NULL DEFAULT 0 CHECK(amount_recorded>=0),
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_disbursed_status groups.schedule_amount_status NOT NULL,
    date_collected TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS groups.payout_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule_id UUID NOT NULL UNIQUE REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    requested_amount NUMERIC NOT NULL DEFAULT 0,
    status groups.payout_request_status NOT NULL DEFAULT 'pending',
    requested_to UUID NOT NULL REFERENCES groups.group_members(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_id UUID REFERENCES public.group_members(id),
    reviewed_at TIMESTAMPTZ
);
