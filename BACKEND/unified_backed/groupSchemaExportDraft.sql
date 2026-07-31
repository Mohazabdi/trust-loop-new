-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE groups.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  member_id uuid NOT NULL,
  member_role USER-DEFINED NOT NULL DEFAULT 'member'::groups.member_role,
  member_code text NOT NULL DEFAULT gen_ref_code('GMC'::text) UNIQUE,
  member_status USER-DEFINED DEFAULT 'active'::groups.member_status,
  invited_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.entities(id)
);
CREATE TABLE groups.interval (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  interval_name text NOT NULL,
  interval_description text,
  no_of_days numeric NOT NULL DEFAULT 1 CHECK (no_of_days > 0::numeric),
  interval_status USER-DEFINED NOT NULL DEFAULT 'active'::groups.interval_status,
  created_by uuid NOT NULL,
  interval_type USER-DEFINED NOT NULL DEFAULT 'system'::groups.interval_type,
  interval_code text NOT NULL DEFAULT gen_ref_code('GIC'::text) UNIQUE,
  CONSTRAINT interval_pkey PRIMARY KEY (id),
  CONSTRAINT interval_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.entities(id)
);
CREATE TABLE groups.plan_types (
  type_name text NOT NULL,
  type_description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plan_types_pkey PRIMARY KEY (type_name)
);
CREATE TABLE groups.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  plan_type text NOT NULL,
  plan_name text NOT NULL,
  plan_description text,
  plan_status USER-DEFINED NOT NULL DEFAULT 'active'::groups.plan_status,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT plans_plan_type_fkey FOREIGN KEY (plan_type) REFERENCES groups.plan_types(type_name)
);
CREATE TABLE groups.rotation_plan (
  id uuid NOT NULL,
  rotation_name text NOT NULL DEFAULT 'groups rotation'::text,
  rotation_description text,
  start_date timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval) CHECK (start_date >= now()),
  interval_id uuid NOT NULL,
  rotation_status USER-DEFINED NOT NULL DEFAULT 'active'::groups.rotation_status,
  penalty_amount numeric DEFAULT 0 CHECK (penalty_amount >= 0::numeric),
  grace_period numeric DEFAULT 0 CHECK (grace_period >= 0::numeric),
  created_by uuid NOT NULL,
  amount_collectable numeric NOT NULL DEFAULT 0 CHECK (amount_collectable >= 0::numeric),
  disbursement_type USER-DEFINED NOT NULL DEFAULT 'auto'::groups.disbursement_type,
  low_funds_options USER-DEFINED NOT NULL DEFAULT 'approval'::groups.low_funds_options,
  created_at timestamp with time zone DEFAULT now(),
  rotation_plan_code text NOT NULL DEFAULT gen_ref_code('RPC'::text) UNIQUE,
  rotation_plan_reserve_account_id uuid NOT NULL,
  end_date timestamp with time zone,
  CONSTRAINT rotation_plan_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_plan_interval_id_fkey FOREIGN KEY (interval_id) REFERENCES groups.interval(id),
  CONSTRAINT rotation_plan_created_by_fkey FOREIGN KEY (created_by) REFERENCES groups.group_members(id),
  CONSTRAINT rotation_plan_rotation_plan_reserve_account_id_fkey FOREIGN KEY (rotation_plan_reserve_account_id) REFERENCES finance.accounts(id),
  CONSTRAINT rotation_plan_id_fkey FOREIGN KEY (id) REFERENCES groups.plans(id)
);
CREATE TABLE groups.rotation_plan_invite (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_member_id uuid NOT NULL,
  rotation_plan_id uuid NOT NULL,
  rotation_invite_status USER-DEFINED,
  expires_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP + '30 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rotation_plan_invite_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_plan_invite_group_member_id_fkey FOREIGN KEY (group_member_id) REFERENCES groups.group_members(id),
  CONSTRAINT rotation_plan_invite_rotation_plan_id_fkey FOREIGN KEY (rotation_plan_id) REFERENCES groups.rotation_plan(id)
);
CREATE TABLE groups.rotation_plan_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intive_id uuid NOT NULL UNIQUE,
  rotation_plan_members_status USER-DEFINED NOT NULL DEFAULT 'pending'::groups.rotation_plan_members_status,
  rotation_plan_members_code text NOT NULL DEFAULT gen_ref_code('RPM'::text) UNIQUE,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotation_plan_members_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_plan_members_intive_id_fkey FOREIGN KEY (intive_id) REFERENCES groups.rotation_plan_invite(id)
);
CREATE TABLE groups.rotation_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rotation_plan_member_id uuid NOT NULL,
  date_scheduled timestamp with time zone NOT NULL,
  schedule_action USER-DEFINED NOT NULL,
  rotation_schedule_index numeric,
  schedule_status USER-DEFINED NOT NULL DEFAULT 'upcoming'::groups.schedule_status,
  amount_involved numeric NOT NULL DEFAULT 0,
  CONSTRAINT rotation_schedule_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_schedule_rotation_plan_member_id_fkey FOREIGN KEY (rotation_plan_member_id) REFERENCES groups.rotation_plan_members(id)
);
CREATE TABLE groups.rotation_penalty_applied (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  amount_applied numeric NOT NULL DEFAULT 0 CHECK (amount_applied >= 0::numeric),
  rotation_schedule_id uuid,
  rotation_penalty_applied_status USER-DEFINED NOT NULL DEFAULT 'pending'::groups.rotation_penalty_applied_status,
  rotation_penalty_applied_code text NOT NULL DEFAULT gen_ref_code('RCS'::text) UNIQUE,
  CONSTRAINT rotation_penalty_applied_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_penalty_applied_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions(id),
  CONSTRAINT rotation_penalty_applied_rotation_schedule_id_fkey FOREIGN KEY (rotation_schedule_id) REFERENCES groups.rotation_schedule(id)
);
CREATE TABLE groups.rotation_reserve_amount_collected (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rotation_plan_member_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  CONSTRAINT rotation_reserve_amount_collected_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_reserve_amount_collected_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions(id),
  CONSTRAINT rotation_reserve_amount_collected_rotation_plan_member_id_fkey FOREIGN KEY (rotation_plan_member_id) REFERENCES groups.rotation_plan_members(id)
);
CREATE TABLE groups.schedule_amount_collected (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rotation_schedule uuid NOT NULL,
  amount_recorded numeric NOT NULL DEFAULT 0 CHECK (amount_recorded >= 0::numeric),
  transaction_id uuid NOT NULL,
  schedule_amount_collected_status USER-DEFINED NOT NULL,
  date_collected timestamp with time zone NOT NULL,
  CONSTRAINT schedule_amount_collected_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_amount_collected_rotation_schedule_fkey FOREIGN KEY (rotation_schedule) REFERENCES groups.rotation_schedule(id),
  CONSTRAINT schedule_amount_collected_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions(id)
);
CREATE TABLE groups.schedule_amount_disbursed (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rotation_schedule uuid NOT NULL,
  amount_recorded numeric NOT NULL DEFAULT 0 CHECK (amount_recorded >= 0::numeric),
  transaction_id uuid NOT NULL,
  schedule_amount_disbursed_status USER-DEFINED NOT NULL,
  date_collected timestamp with time zone NOT NULL,
  CONSTRAINT schedule_amount_disbursed_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_amount_disbursed_rotation_schedule_fkey FOREIGN KEY (rotation_schedule) REFERENCES groups.rotation_schedule(id),
  CONSTRAINT schedule_amount_disbursed_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.transactions(id)
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
CREATE TABLE groups.payout_request (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rotation_schedule_id uuid NOT NULL UNIQUE,
  requested_amount numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::groups.payout_request_status,
  requested_to uuid NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewer_id uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT payout_request_pkey PRIMARY KEY (id),
  CONSTRAINT payout_request_requested_to_fkey FOREIGN KEY (requested_to) REFERENCES groups.group_members(id),
  CONSTRAINT payout_request_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES groups.group_members(id),
  CONSTRAINT payout_request_rotation_schedule_id_fkey FOREIGN KEY (rotation_schedule_id) REFERENCES groups.rotation_schedule(id)
);
CREATE TABLE groups.group_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  reviewed_by uuid,
  request_message text,
  admin_message text,
  request_status USER-DEFINED NOT NULL DEFAULT 'pending'::groups.request_status,
  join_code text NOT NULL DEFAULT gen_ref_code('GJR'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT group_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT group_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES groups.group_members(id),
  CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_join_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.members(id)
);