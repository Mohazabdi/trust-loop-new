CREATE SCHEMA IF NOT EXISTS groups;
CREATE TYPE groups.disbursement_type AS ENUM ('auto', 'approval');
CREATE TYPE groups.interval_status AS ENUM ('active', 'dormant', 'deleted');
CREATE TYPE groups.interval_type AS ENUM ('system', 'custom');
CREATE TYPE groups.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE groups.low_funds_options AS ENUM ('distribute', 'hold', 'approval');
CREATE TYPE groups.member_role AS ENUM ('admin', 'member');
CREATE TYPE groups.member_status AS ENUM ('active', 'suspended', 'banned', 'deleted');
CREATE TYPE groups.rotation_collection_schedule_status AS ENUM ('upcoming', 'completed', 'due');
CREATE TYPE groups.rotation_penalty_applied_status AS ENUM ('paid', 'pending');
CREATE TYPE groups.rotation_plan_members_status AS ENUM ('pending', 'completed');
CREATE TYPE groups.rotation_status AS ENUM ('active', 'dormant', 'completed', 'deleted');

-- Table: group_invites
CREATE TABLE IF NOT EXISTS groups.group_invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    invitee_id uuid,
    invitee_email text,
    invite_status groups.invite_status NOT NULL DEFAULT 'pending'::groups.invite_status,
    invite_code text NOT NULL DEFAULT gen_ref_code('GIV'::text),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: group_members
CREATE TABLE IF NOT EXISTS groups.group_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    member_id uuid NOT NULL,
    member_role groups.member_role NOT NULL DEFAULT 'member'::groups.member_role,
    member_code text NOT NULL DEFAULT gen_ref_code('GMC'::text),
    member_status groups.member_status DEFAULT 'active'::groups.member_status,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: "interval"
CREATE TABLE IF NOT EXISTS groups."interval" (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    interval_name text NOT NULL,
    interval_description text,
    no_of_days numeric NOT NULL DEFAULT 1,
    interval_status groups.interval_status NOT NULL DEFAULT 'active'::groups.interval_status,
    created_by uuid NOT NULL,
    interval_type groups.interval_type NOT NULL DEFAULT 'system'::groups.interval_type,
    interval_code text NOT NULL DEFAULT gen_ref_code('GIC'::text),
    PRIMARY KEY (id)
);

-- Table: member_schedule_settings
CREATE TABLE IF NOT EXISTS groups.member_schedule_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rotation_interval_id uuid,
    rotation_plan_member_id uuid,
    amount_payable numeric NOT NULL DEFAULT 0,
    schedule_index numeric NOT NULL DEFAULT 0,
    member_schedule_settings_code text NOT NULL DEFAULT gen_ref_code('MSS'::text),
    PRIMARY KEY (id)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS groups.notifications (
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
    PRIMARY KEY (id)
);

-- Table: plan_types
CREATE TABLE IF NOT EXISTS groups.plan_types (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type_name text NOT NULL,
    type_description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: plans
CREATE TABLE IF NOT EXISTS groups.plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    plan_type_id uuid NOT NULL,
    plan_name text NOT NULL,
    plan_description text,
    plan_status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: rotation_collection_schedule
CREATE TABLE IF NOT EXISTS groups.rotation_collection_schedule (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    member_schedule_settings_id uuid NOT NULL,
    due_date timestamp with time zone,
    amount_collected numeric NOT NULL DEFAULT 0,
    rotation_collection_schedule_status groups.rotation_collection_schedule_status NOT NULL DEFAULT 'upcoming'::groups.rotation_collection_schedule_status,
    rotation_collection_schedule_code text NOT NULL DEFAULT gen_ref_code('RCS'::text),
    PRIMARY KEY (id)
);

-- Table: rotation_disbursed
CREATE TABLE IF NOT EXISTS groups.rotation_disbursed (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    rotation_plan_member_id uuid,
    amount_disbursed numeric NOT NULL DEFAULT 0,
    rotation_disbursed_code text NOT NULL DEFAULT gen_ref_code('RDC'::text),
    PRIMARY KEY (id)
);

-- Table: rotation_interval
CREATE TABLE IF NOT EXISTS groups.rotation_interval (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rotation_plan_id uuid NOT NULL,
    interval_id uuid NOT NULL,
    rotation_interval_code text NOT NULL DEFAULT gen_ref_code('RIC'::text),
    PRIMARY KEY (id)
);

-- Table: rotation_invites
CREATE TABLE IF NOT EXISTS groups.rotation_invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rotation_plan_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    group_member_id uuid NOT NULL,
    invite_status groups.invite_status NOT NULL DEFAULT 'pending'::groups.invite_status,
    invite_code text NOT NULL DEFAULT gen_ref_code('RIV'::text),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: rotation_penalty_applied
CREATE TABLE IF NOT EXISTS groups.rotation_penalty_applied (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    amount_applied numeric NOT NULL DEFAULT 0,
    rotation_collection_schedule_id uuid,
    rotation_penalty_applied_status groups.rotation_penalty_applied_status NOT NULL DEFAULT 'pending'::groups.rotation_penalty_applied_status,
    rotation_penalty_applied_code text NOT NULL DEFAULT gen_ref_code('RCS'::text),
    deducted_from_schedule_id uuid,
    penalty_status text DEFAULT 'pending'::text,
    PRIMARY KEY (id)
);

-- Table: rotation_plan
CREATE TABLE IF NOT EXISTS groups.rotation_plan (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rotation_name text NOT NULL DEFAULT 'Group Rotation'::text,
    rotation_description text,
    start_date timestamp with time zone,
    rotation_status groups.rotation_status NOT NULL DEFAULT 'active'::groups.rotation_status,
    penalty_amount numeric DEFAULT 0,
    grace_period numeric DEFAULT 0,
    created_by uuid NOT NULL,
    amount_distributable numeric NOT NULL DEFAULT 0,
    disbursement_type groups.disbursement_type NOT NULL DEFAULT 'auto'::groups.disbursement_type,
    low_funds_options groups.low_funds_options NOT NULL DEFAULT 'approval'::groups.low_funds_options,
    current_cycle integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    rotation_plan_code text NOT NULL DEFAULT gen_ref_code('RPC'::text),
    rotation_locked boolean DEFAULT false,
    penalty_type text DEFAULT 'fixed'::text,
    penalty_value numeric DEFAULT 0,
    penalty_grace_days numeric DEFAULT 0,
    plan_id uuid NOT NULL,
    PRIMARY KEY (id)
);

-- Table: rotation_plan_members
CREATE TABLE IF NOT EXISTS groups.rotation_plan_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    group_member_id uuid,
    rotation_plan_id uuid,
    amount_recievable numeric NOT NULL DEFAULT 0,
    rotation_plan_members_status groups.rotation_plan_members_status NOT NULL DEFAULT 'pending'::groups.rotation_plan_members_status,
    payout_order integer,
    rotation_plan_members_code text NOT NULL DEFAULT gen_ref_code('RPM'::text),
    PRIMARY KEY (id)
);

ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.members (id);
ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups (id);
ALTER TABLE groups.group_invites ADD CONSTRAINT group_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES groups.group_members (id);
ALTER TABLE groups.group_members ADD CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.entities (id);
ALTER TABLE groups.group_members ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups (id);
ALTER TABLE groups.group_members ADD CONSTRAINT group_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members (id);
ALTER TABLE groups."interval" ADD CONSTRAINT interval_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.entities (id);
ALTER TABLE groups.member_schedule_settings ADD CONSTRAINT member_schedule_settings_rotation_plan_member_id_fkey FOREIGN KEY (rotation_plan_member_id) REFERENCES groups.rotation_plan_members (id);
ALTER TABLE groups.member_schedule_settings ADD CONSTRAINT member_schedule_settings_rotation_interval_id_fkey FOREIGN KEY (rotation_interval_id) REFERENCES groups.rotation_interval (id);
ALTER TABLE groups.notifications ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.members (id);
ALTER TABLE groups.notifications ADD CONSTRAINT notifications_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members (id);
ALTER TABLE groups.plans ADD CONSTRAINT plans_plan_type_id_fkey FOREIGN KEY (plan_type_id) REFERENCES groups.plan_types (id);
ALTER TABLE groups.plans ADD CONSTRAINT plans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups (id);
ALTER TABLE groups.rotation_collection_schedule ADD CONSTRAINT rotation_collection_schedule_member_schedule_settings_id_fkey FOREIGN KEY (member_schedule_settings_id) REFERENCES groups.member_schedule_settings (id);
ALTER TABLE groups.rotation_disbursed ADD CONSTRAINT rotation_disbursed_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions (id);
ALTER TABLE groups.rotation_disbursed ADD CONSTRAINT rotation_disbursed_rotation_plan_member_id_fkey FOREIGN KEY (rotation_plan_member_id) REFERENCES groups.rotation_plan_members (id);
ALTER TABLE groups.rotation_interval ADD CONSTRAINT rotation_interval_rotation_plan_id_fkey FOREIGN KEY (rotation_plan_id) REFERENCES groups.rotation_plan (id);
ALTER TABLE groups.rotation_interval ADD CONSTRAINT rotation_interval_interval_id_fkey FOREIGN KEY (interval_id) REFERENCES groups."interval" (id);
ALTER TABLE groups.rotation_invites ADD CONSTRAINT rotation_invites_group_member_id_fkey FOREIGN KEY (group_member_id) REFERENCES groups.group_members (id);
ALTER TABLE groups.rotation_invites ADD CONSTRAINT rotation_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES groups.group_members (id);
ALTER TABLE groups.rotation_invites ADD CONSTRAINT rotation_invites_rotation_plan_id_fkey FOREIGN KEY (rotation_plan_id) REFERENCES groups.rotation_plan (id);
ALTER TABLE groups.rotation_penalty_applied ADD CONSTRAINT rotation_penalty_applied_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions (id);
ALTER TABLE groups.rotation_penalty_applied ADD CONSTRAINT rotation_penalty_applied_rotation_collection_schedule_id_fkey FOREIGN KEY (rotation_collection_schedule_id) REFERENCES groups.rotation_collection_schedule (id);
ALTER TABLE groups.rotation_penalty_applied ADD CONSTRAINT rotation_penalty_applied_deducted_from_schedule_id_fkey FOREIGN KEY (deducted_from_schedule_id) REFERENCES groups.rotation_collection_schedule (id);
ALTER TABLE groups.rotation_plan ADD CONSTRAINT rotation_plan_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES groups.plans (id);
ALTER TABLE groups.rotation_plan ADD CONSTRAINT rotation_plan_created_by_fkey FOREIGN KEY (created_by) REFERENCES groups.group_members (id);
ALTER TABLE groups.rotation_plan_members ADD CONSTRAINT rotation_plan_members_group_member_id_fkey FOREIGN KEY (group_member_id) REFERENCES groups.group_members (id);
ALTER TABLE groups.rotation_plan_members ADD CONSTRAINT rotation_plan_members_rotation_plan_id_fkey FOREIGN KEY (rotation_plan_id) REFERENCES groups.rotation_plan (id);
