DROP SCHEMA IF EXISTS rotation CASCADE;
CREATE SCHEMA rotation;
SET SEARCH_PATH TO rotation,groups, public, finance;

CREATE TYPE rotations.rotation_status AS ENUM(
    'active',
    'dormant',
    'completed',
    'deleted'
);
CREATE TYPE rotations.rotation_penalty_applied_status AS ENUM(
    'paid',
    'pending'
);
CREATE TYPE rotations.disbursement_type AS ENUM(
    'auto',
    'approval'
);
CREATE TYPE rotations.low_funds_options AS ENUM(
    'distribute',
    'hold',
    'approval'
);
CREATE TYPE rotations.schedule_status AS ENUM(
   'upcoming',
    'disbursed',
    'pending',
    'canceled'
);
CREATE TYPE rotations.schedule_action AS ENUM(
    'payout',
    'collection'
);
--added to keep track of the amount status collected 
CREATE TYPE rotations.schedule_amount_status AS ENUM(
    'full',
    'partial',
    'null'
);
CREATE TYPE rotations.payout_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TABLE IF NOT EXISTS rotations.rotation_plan(
    id UUID PRIMARY KEY REFERENCES groups.plans(id),
    rotation_name TEXT NOT NULL DEFAULT 'groups rotation',--use a seq to autoname the groups later on
    rotation_description TEXT,
    start_date   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days', -- DEFAULT now()
    interval_id UUID NOT NULL REFERENCES groups.interval(id) ON DELETE RESTRICT,
    rotation_status rotations.rotation_status DEFAULT 'active' NOT NULL,
    penalty_amount NUMERIC CHECK(penalty_amount >= 0) DEFAULT 0,
    grace_period NUMERIC DEFAULT 0 CHECK(grace_period >= 0),
    created_by UUID NOT NULL REFERENCES groups.group_members(id) ON DELETE RESTRICT, -- REFERENCE GROUP GROUP_MEMBERS
    -- amount_distributable NUMERIC DEFAULT 0 NOT NULL CHECK(amount_distributable >= 0),-- redundant
    amount_collectable NUMERIC DEFAULT 0 NOT NULL CHECK(amount_collectable >= 0),-- set the amount to collect per member for a plan 
    disbursement_type rotations.disbursement_type NOT NULL DEFAULT 'auto' ,
    low_funds_options rotations.low_funds_options NOT NULL DEFAULT 'approval',
    created_at TIMESTAMPTZ DEFAULT now(),
    rotation_plan_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RPC') ,
    rotation_plan_reserve_account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,-- the reserve account to collected accumulative collections from groups
    CONSTRAINT valid_start_date CHECK(start_date >= now())
);

CREATE INDEX group_rotation_plan_created_by_idx ON rotations.rotation_plan(created_by);
-- CREATE INDEX group_rotation_plan_group_id_idx ON rotations.rotation_plan(group_id);
CREATE INDEX group_rotation_plan_code_idx ON rotations.rotation_plan(rotation_plan_code);

CREATE TABLE IF NOT EXISTS rotations.rotation_schedule(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    date_scheduled TIMESTAMPTZ NOT NULL,
    schedule_action rotations.schedule_action NOT NULL ,
    rotation_schedule_index NUMERIC,
    schedule_status rotations.schedule_status NOT NULL DEFAULT 'upcoming',
    amount_involved NUMERIC NOT NULL DEFAULT 0
    );


CREATE TABLE IF NOT EXISTS rotations.rotation_penalty_applied(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES finance.transactions(id) ON DELETE RESTRICT NOT NULL,
    amount_applied NUMERIC NOT NULL DEFAULT 0 CHECK(amount_applied >= 0),
    rotation_schedule_id UUID REFERENCES rotations.rotation_schedule(id) ON DELETE RESTRICT,
    rotation_penalty_applied_status   rotations.rotation_penalty_applied_status  DEFAULT 'pending' NOT NULL,
    rotation_penalty_applied_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('RCS')
);
CREATE INDEX group_rotation_penalty_applied_code_idx ON  rotations.rotation_penalty_applied(rotation_penalty_applied_code);
CREATE INDEX group_rotation_penalty_transaction_id_idx ON  rotations.rotation_penalty_applied(transaction_id);
CREATE INDEX group_rotation_rotation_collection_schedule_id_idx ON  rotations.rotation_penalty_applied(rotation_schedule_id);
-- added reserve table to keep track of amounts collected over time for members in a certain rotation plan 
CREATE TABLE IF NOT EXISTS rotations.rotation_reserve_amount_collected(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_plan_member_id UUID NOT NULL REFERENCES groups.rotation_plan_members(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT
    -- amount_recorded NUMERIC NOT NULL DEFAULT 0 CHECK(amount_recorded>=0),

);
-- added amount_collected_record table to keep track of the amounts removed from reserve by the system to settle the amount collected for a certain interval schedule
CREATE TABLE IF NOT EXISTS rotations.schedule_amount_collected(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule UUID NOT NULL REFERENCES rotations.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded NUMERIC NOT NULL DEFAULT 0 CHECK(amount_recorded>=0),
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_collected_status rotations.schedule_amount_status NOT NULL,
    date_collected TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rotations.schedule_amount_disbursed(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule UUID NOT NULL REFERENCES rotations.rotation_schedule(id) ON DELETE RESTRICT,
    amount_recorded NUMERIC NOT NULL DEFAULT 0 CHECK(amount_recorded>=0),
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    schedule_amount_disbursed_status rotations.schedule_amount_status NOT NULL,
    date_collected TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rotations.payout_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule_id UUID NOT NULL UNIQUE REFERENCES rotations.rotation_schedule(id) ON DELETE RESTRICT,
    requested_amount NUMERIC NOT NULL DEFAULT 0,
    status rotations.payout_request_status NOT NULL DEFAULT 'pending',
    requested_to UUID NOT NULL REFERENCES groups.group_members(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_id UUID REFERENCES public.group_members(id),
    reviewed_at TIMESTAMPTZ
);



CREATE OR REPLACE FUNCTION rotations.create_rotation_plan(
p_plan_name TEXT,
p_group_id UUID,
p_created_by_id UUID,
p_wallet_id UUID,
p_interval_id UUID,
p_amount_collectable NUMERIC,
p_rotation_description TEXT DEFAULT null
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = finance, pg_catalog,groups
AS $$
DECLARE
    v_result JSONB;
    v_plan_id UUID;
    v_system_entity_id UUID;
    v_escrow_account_id UUID;
    v_invite_id UUID;

BEGIN
 INSERT INTO groups.plans
 (
    group_id,plan_type,plan_name,plan_status
 )
 VALUES(
    p_group_id,
    'ROTATION',
    p_plan_name,
    'active'
 )
 RETURNING id into v_plan_id;
 SELECT public.get_system_entity() INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_system_entity_id := (v_result->'data'->>'id')::UUID;

--  SELECT finance.create_account(
--         p_acc_type := 'escrow',
--         p_owner_entity_id := p_group_id,
--         p_currency_code := 'KES',
--         p_created_by := v_system_entity_id,
--         p_acc_status := 'active',
--         p_acc_name := format('%s  Escrow Account',p_plan_name ),
--         p_acc_description := format('Escrow  facility for rotation %s' , p_plan_name),
--         p_min_balance := 0,
--         p_max_balance := 0,
--         p_max_transfer_amount := 0
--     ) INTO v_result;

--     IF NOT (v_result->>'success')::boolean THEN
--                 RAISE EXCEPTION '%', v_result->>'message'
--             USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
--                   HINT = v_result->>'detail';
--     END IF;

INSERT INTO finance.accounts(
   acc_name,
   acc_type,
   owner_entity_id,
   acc_status,
   acc_currency,
   max_balance,
   created_by
)
VALUES(
format('%s  Escrow Account',p_plan_name ),
'escrow',
p_group_id,
'active',
'KES',
10000000,
v_system_entity_id
)
RETURNING id into v_escrow_account_id;

   --  v_escrow_account_id := (v_result->'data'->>'id')::UUID;

    SELECT finance.link_account_to_wallet(p_wallet_id, v_escrow_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN 
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
    END IF;

INSERT  INTO rotations.rotation_plan (
    id,
    rotation_name,
    rotation_description,
    interval_id,
    rotation_status,
    created_by,
    amount_collectable,
    disbursement_type,
    low_funds_options,
    rotation_plan_reserve_account_id
)
VALUES (
    v_plan_id,
    p_plan_name,
    p_rotation_description,
    p_interval_id,
    'dormant',
    p_created_by_id,
    p_amount_collectable,
    'auto',
    'distribute',
    v_escrow_account_id
);
INSERT INTO groups.plan_invite(
group_member_id,
rotation_plan_id,
plan_invite_status
)
VALUES(
p_created_by_id,
v_plan_id,
'accepted'
)
 RETURNING id INTO v_invite_id;
 INSERT INTO groups.plan_members(
    invite_id,
    plan_member_status
 )
 VALUES(
    v_invite_id,
    'completed'
 );
 RETURN jsonb_build_object(
    'rotation_plan_id',v_plan_id
 );
 END;
 $$;

SELECT cron.schedule(
    'daily-rotation-tasks',            
    '0 0 * * *',                        
    'SELECT groups.process_daily_rotation_tasks();'
);


CREATE OR REPLACE FUNCTION rotations.delete_plan(
  p_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
v_deleted_rows INT;
BEGIN
    DELETE FROM groups.plans WHERE id=p_plan_id;
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
     IF v_deleted_rows > 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Plan deleted successfully.'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Plan not found or already deleted.'
        );
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION rotations.delete_rotation_invite(
  p_rotation_plan_invite_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
v_deleted_rows INT;
BEGIN
    DELETE FROM groups.plan_invite WHERE id=p_rotation_plan_invite_id;
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
     IF v_deleted_rows > 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Invite deleted successfully.'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invite not found or already deleted.'
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_due_collections(
  p_plan_id UUID,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_collections jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'schedule_id', rs.id,
            'rotation_plan_member_id', rpm.id,
						'group_created_by',g.created_by,
						'group_id',p.group_id,
            'group_member_id', rpi.group_member_id,
            'member_id', m.id,
            'member_name', m.first_name || ' ' || m.last_name,
            'amount_to_collect', GREATEST(0,
                LEAST(
                    rs.amount_involved - COALESCE(sched_collected.total_collected, 0),
                    COALESCE(member_reserve.total, 0) - COALESCE(member_total_collected.total_collected, 0)
                )
            ),
            'required_amount', rs.amount_involved,
            'already_collected', COALESCE(sched_collected.total_collected, 0),
            'reserve_balance', COALESCE(member_reserve.total, 0) - COALESCE(member_total_collected.total_collected, 0),
            'plan_reserve_account_id', rp.rotation_plan_reserve_account_id,
            'group_wallet_id', grp.wallet_id,
            'account_currency', grp.acc_currency,
            'group_account_id', grp.account_id,
            'group_account_number', grp.acc_number
        )
        ORDER BY rs.rotation_schedule_index
    )
    INTO v_collections
    FROM rotations.rotation_schedule rs
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.plans p ON p.id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
		JOIN public.groups g ON p.group_id =g.id
    JOIN public.members m ON gm.member_id = m.id

    -- Total contributions only (from rotation_reserve_amount_collected)
    LEFT JOIN LATERAL (
        SELECT SUM(ft.trans_amount) AS total
        FROM rotations.rotation_reserve_amount_collected rrac
        JOIN finance.transactions ft ON rrac.transaction_id = ft.id
        WHERE rrac.rotation_plan_member_id = rpm.id
    ) member_reserve ON true

    -- Already collected for this specific schedule
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total_collected
        FROM rotations.schedule_amount_collected sac
        WHERE sac.rotation_schedule = rs.id
    ) sched_collected ON true

    -- Total collected across all schedules for this member
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total_collected
        FROM rotations.schedule_amount_collected sac
        JOIN rotations.rotation_schedule rs2 ON sac.rotation_schedule = rs2.id
        WHERE rs2.rotation_plan_member_id = rpm.id
    ) member_total_collected ON true

    -- Group wallet and group account
    LEFT JOIN finance.wallets w ON w.owner_entity_id = p.group_id
    LEFT JOIN LATERAL (
        SELECT wa.wallet_id, a.id AS account_id, a.acc_number, a.acc_currency
        FROM finance.wallet_accounts wa
        JOIN finance.accounts a ON a.id = wa.acc_id
        WHERE wa.wallet_id = w.id AND a.acc_type = 'group'
        LIMIT 1
    ) grp ON true

    WHERE rpi.rotation_plan_id = p_plan_id
      AND rs.schedule_action = 'collection'
      AND rs.date_scheduled::date = p_scheduled_date::date
      AND rs.schedule_status = 'upcoming';

    RETURN public.build_response(
        true,
        jsonb_build_object('due_collections', COALESCE(v_collections, '[]'::jsonb))
    );
END;
$$;

-- SELECT groups.get_due_collections(
--     '80d2b6d4-a17f-4c8f-a852-5dd06937e0ca',
--     '2026-06-02 10:39:16.376121+00'
-- );
CREATE OR REPLACE FUNCTION rotations.get_due_payouts(
  p_plan_id UUID,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_payouts jsonb;
    v_new_requests INT := 0;
    v_item jsonb;
BEGIN
    -- Build the list of due payouts with all required fields
    SELECT jsonb_agg(
        jsonb_build_object(
            'schedule_id', rs.id,
            'rotation_plan_member_id', rpm.id,
            'group_member_id', rpi.group_member_id,
            'plan_creator_id',rp.created_by,
            'group_id', p.group_id,
            'member_id', m.id,
            'member_name', m.first_name || ' ' || m.last_name,
            'required_amount', rs.amount_involved,
            'amount_to_distribute', COALESCE(cycle_collected.total, 0),
            'already_collected', COALESCE(sched_collected.total, 0),   -- not strictly needed for payouts but included
            'reserve_balance', COALESCE(member_reserve.total, 0) - COALESCE(member_total_collected.total, 0),
            'plan_reserve_account_id', rp.rotation_plan_reserve_account_id,
            'source_account_id', grp.account_id,
            'source_account_number', grp.acc_number,
            'source_wallet_id', grp.wallet_id,
            'currency', grp.acc_currency,
            'destination_account_id', mem_acc.account_id,
            'destination_account_number', mem_acc.acc_number,
            'destination_wallet_id', mem_acc.wallet_id,
            'schedule_index', rs.rotation_schedule_index
        )
        ORDER BY rs.rotation_schedule_index
    )
    INTO v_payouts
    FROM rotations.rotation_schedule rs
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.plans p ON p.id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
    JOIN public.members m ON gm.member_id = m.id

    -- Total collected for THIS cycle (all collection schedules on the same date)
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM rotations.schedule_amount_collected sac
        JOIN rotations.rotation_schedule rs2 ON sac.rotation_schedule = rs2.id
        JOIN groups.plan_members rpm2 ON rs2.rotation_plan_member_id = rpm2.id
        JOIN groups.plan_invite rpi2 ON rpm2.invite_id = rpi2.id
        WHERE rpi2.rotation_plan_id = p_plan_id
          AND rs2.schedule_action = 'collection'
          AND rs2.date_scheduled::date = rs.date_scheduled::date
    ) cycle_collected ON true

    -- Individual collected for this schedule (if any, likely 0 for payouts)
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM rotations.schedule_amount_collected sac
        WHERE sac.rotation_schedule = rs.id
    ) sched_collected ON true

    -- Member's total contributions
    LEFT JOIN LATERAL (
        SELECT SUM(ft.trans_amount) AS total
        FROM rotations.rotation_reserve_amount_collected rrac
        JOIN finance.transactions ft ON rrac.transaction_id = ft.id
        WHERE rrac.rotation_plan_member_id = rpm.id
    ) member_reserve ON true

    -- Member's total collected across all schedules
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM rotations.schedule_amount_collected sac
        JOIN rotations.rotation_schedule rs3 ON sac.rotation_schedule = rs3.id
        WHERE rs3.rotation_plan_member_id = rpm.id
    ) member_total_collected ON true

    -- Source: group account
    LEFT JOIN finance.wallets w ON w.owner_entity_id = p.group_id
    LEFT JOIN LATERAL (
        SELECT wa.wallet_id, a.id AS account_id, a.acc_number, a.acc_currency
        FROM finance.wallet_accounts wa
        JOIN finance.accounts a ON a.id = wa.acc_id
        WHERE wa.wallet_id = w.id AND a.acc_type = 'group'
        LIMIT 1
    ) grp ON true

    -- Destination: member's personal wallet account
    LEFT JOIN finance.wallets mw ON mw.owner_entity_id = m.id
    LEFT JOIN LATERAL (
        SELECT wa.wallet_id, a.id AS account_id, a.acc_number
        FROM finance.wallet_accounts wa
        JOIN finance.accounts a ON a.id = wa.acc_id
        WHERE wa.wallet_id = mw.id AND a.acc_type = 'personal'   -- adjust if your personal type name differs
        LIMIT 1
    ) mem_acc ON true

   WHERE rpi.rotation_plan_id = p_plan_id
  AND rs.schedule_action = 'payout'
  AND rs.date_scheduled::date = p_scheduled_date::date
  AND rs.schedule_status IN ('upcoming', 'pending');

    -- If there are payouts, create pending payout requests
   IF v_payouts IS NOT NULL AND jsonb_array_length(v_payouts) > 0 THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_payouts)
    LOOP
        -- Skip if nothing to distribute
        IF (v_item->>'amount_to_distribute')::NUMERIC <= 0 THEN
            CONTINUE;
        END IF;

        -- Try to insert a new request
        INSERT INTO rotations.payout_request (
            rotation_schedule_id,
            requested_amount,
            status,
            requested_to,
            description,
            created_at
        ) VALUES (
            (v_item->>'schedule_id')::UUID,
            (v_item->>'amount_to_distribute')::NUMERIC,
            'pending',
            (v_item->>'plan_creator_id')::UUID,
            'Payout request for ' || (v_item->>'member_name'),
            now()
        )
        ON CONFLICT (rotation_schedule_id) DO NOTHING;

        IF FOUND THEN
            v_new_requests := v_new_requests + 1;
        ELSE
            -- Already exists → optionally update amount/status (unless approved)
            UPDATE rotations.payout_request
            SET requested_amount = (v_item->>'amount_to_distribute')::NUMERIC,
                status = 'pending',
                created_at = now()
            WHERE rotation_schedule_id = (v_item->>'schedule_id')::UUID
              AND status != 'approved';
        END IF;

        -- Mark schedule as pending
        UPDATE rotations.rotation_schedule
        SET schedule_status = 'pending'
        WHERE id = (v_item->>'schedule_id')::UUID;
    END LOOP;
END IF;
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'due_payouts', COALESCE(v_payouts, '[]'::jsonb),
            'new_requests', v_new_requests
        )
    );
END;
$$;

-- SELECT groups.get_due_payouts(
--     '80d2b6d4-a17f-4c8f-a852-5dd06937e0ca',
--     '2026-06-02 10:39:16.376121+00'
-- );
CREATE OR REPLACE FUNCTION rotations.get_group_member_detail(
  p_group_id UUID,
  p_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public,groups, pg_catalog
AS $$
DECLARE
    v_result jsonb;
BEGIN
SELECT
    jsonb_build_object(
            'id',gm.id,
            'group_id',gm.group_id ,
            'group_name',g.group_name,
            'group_description',g.group_description,
            'group_ref',g.group_ref,
            'group_visibility',g.group_visibility,
            'group_cover_photo_url',g.group_cover_photo_url,
            'max_capacity',g.max_capacity,
            'min_capacity',g.min_capacity,
            'group_status',g.group_status,
            'group_updated_at',g.updated_at,
            'group_created_at', g.created_at,
            'member_id', gm.member_id,
            'first_name',m.first_name,
            'last_name',m.last_name,
            'member_role', gm.member_role,
            'group_member_code',gm.member_code,
            'group_member_status', gm.member_status,
            'group_member_created_at', gm.created_at
        ) 
    INTO v_result
    FROM groups.group_members gm
    INNER JOIN public.groups g
        ON gm.group_id = g.id
    INNER JOIN public.members m
        ON gm.member_id = m.id
    WHERE gm.group_id=p_group_id AND gm.member_id=p_member_id;

   IF v_result IS NULL THEN
        RETURN public.build_response(
            false,
            NULL,
            'P0001',
            'Group member not found',
            format('No active membership for group %s and member %s', p_group_id, p_member_id)
        );
    END IF;

    RETURN public.build_response(true, jsonb_build_object('group_member_data', v_result));
END;
$$;
CREATE OR REPLACE FUNCTION rotations.get_group_member_rotation_plans(
  p_group_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'rotation_plan_id', rp.id,
            'rotation_name', rp.rotation_name,
            'rotation_description',rp.rotation_description,
            'start_date',rp.start_date,
            'rotation_status',rp.rotation_status,
            'rotation_plan_member_id', rpm.id
        )
    )
    INTO v_result
    FROM groups.plan_members rpm
    INNER JOIN groups.plan_invite rpi 
        ON rpm.invite_id = rpi.id 
        AND rpi.plan_invite_status = 'accepted'
    INNER JOIN rotations.rotation_plan rp
         ON rpi.rotation_plan_id =rp.id
    WHERE rpi.group_member_id =p_group_member_id ;

    RETURN public.build_response(
        true,
        jsonb_build_object('group_member_rotation_plans',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_group_members(
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public,groups, pg_catalog
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id',gm.id,
            'group_id',gm.group_id ,
            'member_id', gm.member_id,
            'member_role', gm.member_role,
            'member_status', gm.member_status,
            'created_at', gm.created_at,
            'first_name',m.first_name,
            'last_name',m.last_name
        ) ORDER BY gm.created_at
    )
    INTO v_result
    FROM groups.group_members gm
    INNER JOIN public.groups g
        ON gm.group_id = g.id
    INNER JOIN public.members m
        ON gm.member_id = m.id
    WHERE gm.group_id=p_group_id;

    RETURN public.build_response(
        true,
        jsonb_build_object('group_members',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_member_cycle_progress(
  p_rotation_plan_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_amount_collectable NUMERIC;
    v_total_contributions NUMERIC;
    v_total_collected    NUMERIC;
    v_net_balance        NUMERIC;
    v_total_cycles       INT;
    v_fully_funded       INT;
    v_partial_amount     NUMERIC;
    v_current_cycle      INT;
    v_progress_pct       NUMERIC;
    v_cycles             jsonb;
BEGIN
    -- 1. Get the required amount per cycle and total cycles for this plan
    SELECT rp.amount_collectable, COUNT(*)
    INTO v_amount_collectable, v_total_cycles
    FROM groups.plan_members rpm
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN rotations.rotation_schedule rs ON rs.rotation_plan_member_id = rpm.id
    WHERE rpm.id = p_rotation_plan_member_id
      AND rs.schedule_action = 'collection'
    GROUP BY rp.amount_collectable;

    IF v_amount_collectable IS NULL THEN
        RETURN public.build_response(false, NULL, 'Rotation member not found');
    END IF;

    -- 2. Net balance (contributions minus already collected)
    SELECT COALESCE(SUM(ft.trans_amount), 0)
    INTO v_total_contributions
    FROM rotations.rotation_reserve_amount_collected rrac
    JOIN finance.transactions ft ON rrac.transaction_id = ft.id
    WHERE rrac.rotation_plan_member_id = p_rotation_plan_member_id;

    SELECT COALESCE(SUM(sac.amount_recorded), 0)
    INTO v_total_collected
    FROM rotations.schedule_amount_collected sac
    JOIN rotations.rotation_schedule rs ON sac.rotation_schedule = rs.id
    WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id;

    v_net_balance := v_total_contributions - v_total_collected;

    -- 3. Calculate cycle statuses
    v_fully_funded := LEAST(FLOOR(v_net_balance / v_amount_collectable)::INT, v_total_cycles);
    v_partial_amount := v_net_balance - (v_fully_funded * v_amount_collectable);
    v_current_cycle := CASE
        WHEN v_fully_funded >= v_total_cycles THEN v_total_cycles
        ELSE v_fully_funded + 1
    END;
    v_progress_pct := LEAST((v_net_balance / (v_total_cycles * v_amount_collectable)) * 100, 100);

    -- 4. Build array of cycles with statuses, joining schedule completion data
    WITH cycle_dates AS (
        -- Each distinct date_scheduled is one cycle
        SELECT
            rs.date_scheduled,
            ROW_NUMBER() OVER (ORDER BY rs.date_scheduled) AS cycle_idx,
            bool_and(rs.schedule_status = 'disbursed') AS all_collections_completed
        FROM rotations.rotation_schedule rs
        WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id
          AND rs.schedule_action = 'collection'
        GROUP BY rs.date_scheduled
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'cycle_number', cd.cycle_idx,
            'is_complete', COALESCE(cd.all_collections_completed, false),
            'is_reserved', cd.cycle_idx <= v_fully_funded
                            OR (cd.cycle_idx = v_current_cycle AND v_partial_amount > 0),
            'contributed_amount', CASE
                WHEN cd.cycle_idx <= v_fully_funded THEN v_amount_collectable
                WHEN cd.cycle_idx = v_current_cycle THEN v_partial_amount
                ELSE 0
            END
        )
        ORDER BY cd.cycle_idx
    )
    INTO v_cycles
    FROM cycle_dates cd;

    -- 5. Return everything
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'net_balance', v_net_balance,
            'amount_collectable', v_amount_collectable,
            'total_cycles', v_total_cycles,
            'fully_funded_cycles', v_fully_funded,
            'current_cycle', v_current_cycle,
            'partial_amount', v_partial_amount,
            'progress_percentage', ROUND(v_progress_pct, 1),
            'cycles', COALESCE(v_cycles, '[]'::jsonb)
        )
    );
END;
$$;

---SELECT groups.get_member_cycle_progress('b6facd34-17d9-4267-9217-1679bb44de29');


CREATE OR REPLACE FUNCTION rotations.get_member_rotation_invites(
  p_group_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT  jsonb_agg(
        jsonb_build_object(
            'id',rpi.id,
            'group_member_id',rpi.group_member_id,
            'expires_at',rpi.expires_at,
            'rotation_description',rp.rotation_description,
            'plan_name',rp.rotation_name,
            'interval_name',i.interval_name,
            'days_in_interval',i.no_of_days,
            'amount_collectable',rp.amount_collectable,
            'invited_by',COALESCE(creator_m.first_name ||' '|| creator_m.last_name,'N/A'),
            'created_at',rpi.created_at
        ))
    INTO v_result
    FROM groups.plan_invite rpi
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id=rp.id  
    JOIN groups.interval i ON rp.interval_id =i.id
    LEFT JOIN groups.group_members creator_gm ON rp.created_by = creator_gm.id
    LEFT JOIN public.members creator_m ON creator_gm.member_id = creator_m.id
    WHERE rpi.group_member_id=p_group_member_id AND rpi.plan_invite_status='pending';
    RETURN public.build_response(
        true,
        jsonb_build_object('member_rotation_invites',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_member_rotation_report(
  p_rotation_plan_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH
    -- Basic member & plan info (currency from reserve account)
    member_info AS (
        SELECT
            rpm.id AS rotation_plan_member_id,
            m.first_name || ' ' || m.last_name AS member_name,
            rp.rotation_name,
            rp.rotation_description,
            rp.amount_collectable,
            rp.start_date,
            rp.end_date,
            rp.rotation_status,
            a.acc_currency AS currency_code
        FROM groups.plan_members rpm
        JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
        JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
        LEFT JOIN finance.accounts a ON rp.rotation_plan_reserve_account_id = a.id
        JOIN groups.group_members gm ON rpi.group_member_id = gm.id
        JOIN public.members m ON gm.member_id = m.id
        WHERE rpm.id = p_rotation_plan_member_id
    ),

    -- Contributions (reserve deposits)
    contributions AS (
        SELECT
            ft.id AS transaction_id,
            ft.trans_amount,
            ft.created_at AS transaction_date
        FROM rotations.rotation_reserve_amount_collected rrac
        JOIN finance.transactions ft ON rrac.transaction_id = ft.id
        WHERE rrac.rotation_plan_member_id = p_rotation_plan_member_id
        ORDER BY ft.created_at
    ),

    -- Collections (money taken from reserve to group account)
    collections AS (
        SELECT
            sac.id AS collection_id,
            sac.amount_recorded,
            sac.date_collected,
            rs.date_scheduled,
            rs.rotation_schedule_index
        FROM rotations.schedule_amount_collected sac
        JOIN rotations.rotation_schedule rs ON sac.rotation_schedule = rs.id
        WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id
          AND rs.schedule_action = 'collection'
        ORDER BY rs.date_scheduled
    ),

    -- Disbursements (payouts received by this member)
    disbursements AS (
        SELECT
            sad.id AS disbursement_id,
            sad.amount_recorded,
            sad.date_collected,
            rs.date_scheduled,
            rs.rotation_schedule_index
        FROM rotations.schedule_amount_disbursed sad
        JOIN rotations.rotation_schedule rs ON sad.rotation_schedule = rs.id
        WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id
          AND rs.schedule_action = 'payout'
        ORDER BY rs.date_scheduled
    ),

    -- Aggregates (independent subqueries to prevent row multiplication)
    totals AS (
        SELECT
            (SELECT COALESCE(SUM(trans_amount), 0) FROM contributions) AS total_contributed,
            (SELECT COALESCE(SUM(amount_recorded), 0) FROM collections) AS total_collected,
            (SELECT COALESCE(SUM(amount_recorded), 0) FROM disbursements) AS total_disbursed
    ),

    -- Per cycle breakdown
    cycles AS (
        SELECT
            rs.date_scheduled,
            rs.rotation_schedule_index,
            COALESCE(sac_collected.total, 0) AS collected,
            COALESCE(sad_disbursed.total, 0) AS disbursed
        FROM rotations.rotation_schedule rs
        LEFT JOIN LATERAL (
            SELECT SUM(sac.amount_recorded) AS total
            FROM rotations.schedule_amount_collected sac
            WHERE sac.rotation_schedule = rs.id
        ) sac_collected ON true
        LEFT JOIN LATERAL (
            SELECT SUM(sad.amount_recorded) AS total
            FROM rotations.schedule_amount_disbursed sad
            WHERE sad.rotation_schedule = rs.id
        ) sad_disbursed ON true
        WHERE rs.rotation_plan_member_id = p_rotation_plan_member_id
        ORDER BY rs.date_scheduled
    )

    SELECT jsonb_build_object(
        'member_info', (SELECT row_to_json(mi.*) FROM member_info mi),
        'contributions', COALESCE((SELECT jsonb_agg(row_to_json(c.*)) FROM contributions c), '[]'::jsonb),
        'collections', COALESCE((SELECT jsonb_agg(row_to_json(col.*)) FROM collections col), '[]'::jsonb),
        'disbursements', COALESCE((SELECT jsonb_agg(row_to_json(d.*)) FROM disbursements d), '[]'::jsonb),
        'totals', (SELECT row_to_json(t.*) FROM totals t),
        'cycles', COALESCE((SELECT jsonb_agg(row_to_json(cy.*)) FROM cycles cy), '[]'::jsonb)
    )
    INTO v_result;

    RETURN public.build_response(
        true,
        jsonb_build_object('member_report', v_result)
    );
END;
$$;

--SELECT groups.get_member_rotation_report('7a1803b1-a782-48e1-b208-821d9d2d5529');

CREATE OR REPLACE FUNCTION rotations.get_payout_requests(
  p_group_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pr.id,
            'schedule_id', pr.rotation_schedule_id,
            'requested_amount', pr.requested_amount,
            'status', pr.status,
            'description', pr.description,
            'created_at', pr.created_at,
            'member_name', m.first_name || ' ' || m.last_name,
            'member_id', m.id,
            'plan_name', rp.rotation_name,
            'plan_id', rpi.rotation_plan_id,
            'date_scheduled', rs.date_scheduled,
            'schedule_index', rs.rotation_schedule_index
        )
        ORDER BY pr.created_at DESC
    )
    INTO v_result
    FROM rotations.payout_request pr
    JOIN rotations.rotation_schedule rs ON pr.rotation_schedule_id = rs.id
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
    JOIN public.members m ON gm.member_id = m.id
    WHERE pr.requested_to = p_group_member_id
      AND pr.status = 'pending';

    RETURN public.build_response(
        true,
        jsonb_build_object('payout_requests', COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;


CREATE OR REPLACE FUNCTION rotations.get_reserve_contributions(
  p_rotation_plan_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT  jsonb_agg(
        jsonb_build_object(
            'id',rrac.id,
            'transaction_id',rrac.transaction_id,
						'trans_amount',t.trans_amount,
						'date_of_transaction',t.created_at
            
        ))
    INTO v_result
    FROM rotations.rotation_reserve_amount_collected rrac
    JOIN finance.transactions t ON t.id=rrac.transaction_id
    WHERE rrac.rotation_plan_member_id=p_rotation_plan_member_id ;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_reserve_amounts',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_rotation_plan_invitees(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT  jsonb_agg(
        jsonb_build_object(
            'id',gm.id,
            'first_name',m.first_name,
            'last_name',m.last_name,
            'group_id',gm.group_id,
            'member_role',gm.member_role
        ))
    INTO v_result
    FROM rotations.rotation_plan rp
    JOIN groups.plans p ON rp.id=p.id 
    JOIN groups.group_members gm ON p.group_id=gm.group_id 
    JOIN public.members m ON gm.member_id=m.id 
    LEFT JOIN groups.plan_invite rpi 
    ON gm.id=rpi.group_member_id 
    AND rpi.rotation_plan_id = p_rotation_plan_id
    WHERE rp.id=p_rotation_plan_id 
    AND rpi.id IS NULL;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_plan_invitees',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_rotation_plan_members(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT  jsonb_agg(
        jsonb_build_object(
            'rotation_plan_invite_id',rpi.id,
            'rotation_plan_id', rp.id,
            'rotation_name', rp.rotation_name,
            'group_member_id',gm.id,
            'member_first_name',m.first_name,
            'member_last_name',m.last_name,
            'member_role',gm.member_role,
            'invitation_status',rpi.plan_invite_status
        
        ))
    INTO v_result
    FROM groups.plan_invite rpi
    INNER JOIN rotations.rotation_plan rp 
        ON rp.id=rpi.rotation_plan_id
    INNER JOIN groups.group_members gm  
         ON rpi.group_member_id=gm.id
    INNER JOIN public.members m 
    ON m.id=gm.member_id  

    WHERE rp.id = p_rotation_plan_id;
    RETURN public.build_response(
        true,
        jsonb_build_object('group_member_rotation_invites',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;
CREATE OR REPLACE FUNCTION rotations.get_rotation_plan_report(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH plan_basics AS (
        SELECT
            rp.rotation_name,
            rp.rotation_description,
            rp.amount_collectable,
            rp.start_date,
            rp.end_date,
            rp.rotation_status,
            a.acc_currency AS currency_code,
            (SELECT COUNT(*)
             FROM groups.plan_members rpm2
             JOIN groups.plan_invite rpi2 ON rpm2.invite_id = rpi2.id
             WHERE rpi2.rotation_plan_id = p_rotation_plan_id
            ) AS total_members
        FROM rotations.rotation_plan rp
        LEFT JOIN finance.accounts a ON rp.rotation_plan_reserve_account_id = a.id
        WHERE rp.id = p_rotation_plan_id
    ),
    member_summaries AS (
        SELECT
            m.first_name || ' ' || m.last_name AS member_name,
            rpm.id AS rotation_plan_member_id,

            -- Total contributions: sum transaction amounts linked via rotation_reserve_amount_collected
            (
                SELECT COALESCE(SUM(ft.trans_amount), 0)
                FROM rotations.rotation_reserve_amount_collected rrac
                JOIN finance.transactions ft ON rrac.transaction_id = ft.id
                WHERE rrac.rotation_plan_member_id = rpm.id
            ) AS total_contributed,

            -- Total collected: sum from schedule_amount_collected for this member's collection schedules in this plan
            (
                SELECT COALESCE(SUM(sac.amount_recorded), 0)
                FROM rotations.schedule_amount_collected sac
                JOIN rotations.rotation_schedule rs ON sac.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'collection'
            ) AS total_collected,

            -- Total disbursed: sum from schedule_amount_disbursed for this member's payout schedules in this plan
            (
                SELECT COALESCE(SUM(sad.amount_recorded), 0)
                FROM rotations.schedule_amount_disbursed sad
                JOIN rotations.rotation_schedule rs ON sad.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'payout'
            ) AS total_disbursed,

            -- Net balance
            (
                SELECT COALESCE(SUM(ft.trans_amount), 0)
                FROM rotations.rotation_reserve_amount_collected rrac
                JOIN finance.transactions ft ON rrac.transaction_id = ft.id
                WHERE rrac.rotation_plan_member_id = rpm.id
            ) - (
                SELECT COALESCE(SUM(sac.amount_recorded), 0)
                FROM rotations.schedule_amount_collected sac
                JOIN rotations.rotation_schedule rs ON sac.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'collection'
            ) AS net_balance

        FROM groups.plan_members rpm
        JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
        JOIN groups.group_members gm ON rpi.group_member_id = gm.id
        JOIN public.members m ON gm.member_id = m.id
        WHERE rpi.rotation_plan_id = p_rotation_plan_id
    ),
    overall_totals AS (
        SELECT
            SUM(total_contributed) AS total_contributed_all,
            SUM(total_collected) AS total_collected_all,
            SUM(total_disbursed) AS total_disbursed_all
        FROM member_summaries
    )
    SELECT jsonb_build_object(
        'plan_info', (SELECT row_to_json(pb.*) FROM plan_basics pb),
        'members', COALESCE((SELECT jsonb_agg(row_to_json(ms.*)) FROM member_summaries ms), '[]'::jsonb),
        'overall_totals', (SELECT row_to_json(ot.*) FROM overall_totals ot)
    )
    INTO v_result;

    RETURN public.build_response(
        true,
        jsonb_build_object('plan_report', v_result)
    );
END;
$$;
-- SELECT groups.get_rotation_plan_report('80d2b6d4-a17f-4c8f-a852-5dd06937e0ca');


CREATE OR REPLACE FUNCTION rotations.get_rotation_plan_schedules(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cycles jsonb;
BEGIN
    WITH scheduled AS (
        SELECT
            rs.id AS schedule_id,
            rs.date_scheduled,
            rs.schedule_action,
            rs.schedule_status,
            rs.amount_involved,
            rpm.id AS member_id,
            m.first_name,
            m.last_name,
            -- Assign a cycle number based on distinct dates, ordered
            DENSE_RANK() OVER (ORDER BY rs.date_scheduled) AS cycle_num
        FROM rotations.rotation_schedule rs
        JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
        JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
        JOIN groups.group_members gm ON rpi.group_member_id = gm.id
        JOIN public.members m ON gm.member_id = m.id
        WHERE rpi.rotation_plan_id = p_rotation_plan_id
    ),
    cycle_aggregates AS (
        SELECT
            cycle_num,
            date_scheduled,
            -- Determine cycle status: if any 'upcoming' → upcoming, else if all 'completed' → completed, else 'pending'
            CASE
                WHEN bool_or(schedule_status = 'upcoming') THEN 'upcoming'
                WHEN bool_and(schedule_status = 'disbursed') THEN 'completed'
                ELSE 'pending'
            END AS cycle_status,
            jsonb_agg(
                jsonb_build_object(
                    'id', schedule_id::text,
                    'names', first_name || ' ' || last_name,
                    'amount', amount_involved,
                    'amountType', CASE WHEN schedule_action = 'collection' THEN 'debit' ELSE 'credit' END,
                    'status', schedule_status
                )
                ORDER BY schedule_action DESC, member_id   -- payouts last if you like
            ) AS members
        FROM scheduled
        GROUP BY cycle_num, date_scheduled
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', 'cycle_' || cycle_num,                     -- e.g., "cycle_1"
            'cycleName', 'Cycle ' || cycle_num,
            'date_scheduled', to_char(date_scheduled, 'DD-Mon-YYYY'),  -- matches mock format
            'cycle_status', cycle_status,
            'members', members
        )
        ORDER BY cycle_num
    )
    INTO v_cycles
    FROM cycle_aggregates;

    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_plan_cycles', COALESCE(v_cycles, '[]'::jsonb))
    );
END;
$$;

CREATE OR REPLACE FUNCTION rotations.get_rotation_plan(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT 
        jsonb_build_object(
            'rotation_plan_id', rp.id,
            'created_by',rp.created_by,
            'rotation_name', rp.rotation_name,
            'rotation_description',rp.rotation_description,
            'start_date',rp.start_date,
            'rotation_status',rp.rotation_status,
            'amount_collectable',rp.amount_collectable,
            'account_id', a.id,
            'account_number',a.acc_number,
            'account_name',a.acc_name,
            'account_type',a.acc_type,
            'currency_code',a.acc_currency,
            'current_balance',a.current_balance,
            'available_balance',a.available_balance,
            'account_status',a.acc_status,
            'hold_balance',a.hold_balance
        )
    INTO v_result
    FROM rotations.rotation_plan rp
    INNER JOIN finance.accounts a 
         ON rp.rotation_plan_reserve_account_id=a.id
    WHERE rp.id = p_rotation_plan_id;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_plan',v_result)
    );
END;
$$;


CREATE OR REPLACE FUNCTION rotations.get_rotation_progress(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_schedules    INT;
    v_completed_schedules INT;
    v_percentage         NUMERIC;
BEGIN
    -- Count all schedules for this rotation plan
    SELECT COUNT(*)
    INTO v_total_schedules
    FROM rotations.rotation_schedule rs
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    WHERE rpi.rotation_plan_id = p_rotation_plan_id;

    -- Count schedules that are completed or disbursed
    SELECT COUNT(*)
    INTO v_completed_schedules
    FROM rotations.rotation_schedule rs
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    WHERE rpi.rotation_plan_id = p_rotation_plan_id
      AND rs.schedule_status IN ('disbursed');

    IF v_total_schedules > 0 THEN
        v_percentage := (v_completed_schedules::NUMERIC / v_total_schedules) * 100;
    ELSE
        v_percentage := 0;
    END IF;

    RETURN public.build_response(
        true,
        jsonb_build_object(
            'total_schedules', v_total_schedules,
            'completed_schedules', v_completed_schedules,
            'progress_percentage', ROUND(v_percentage, 1)
        )
    );
END;
$$;

--SELECT groups.get_rotation_progress('80d2b6d4-a17f-4c8f-a852-5dd06937e0ca');
CREATE OR REPLACE FUNCTION rotations.getRotationMemberId(
p_group_member_id UUID,
p_rotation_plan_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
v_rotation_member_id UUID;
BEGIN
 
 SELECT rpm.id INTO v_rotation_member_id  from groups.plan_members rpm
 JOIN groups.plan_invite rpi ON rpi.id =rpm.invite_id 
 WHERE rpi.group_member_id=p_group_member_id AND rpi.rotation_plan_id=p_rotation_plan_id
 LIMIT 1;
 return v_rotation_member_id;
END;
$$;


CREATE OR REPLACE FUNCTION rotations.handle_payout_request_response(
  p_payout_request_id UUID,
  p_response_type rotations.payout_request_status,
  p_reviewer_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_message TEXT;
    v_rows_updated INT;
    v_schedule_id UUID;
BEGIN
    -- Validate response type
    IF p_response_type NOT IN ('approved', 'rejected') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid response type. Must be "approved" or "rejected".'
        );
    END IF;

    -- Update the payout request
    UPDATE rotations.payout_request
    SET 
        status = p_response_type,
        reviewer_id = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_payout_request_id
      AND status = 'pending';

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
        IF p_response_type = 'approved' THEN
            v_message := 'Payout request approved successfully.';
        ELSE
            v_message := 'Payout request rejected successfully.';
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'message', v_message
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Payout request not found or already reviewed.'
        );
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION rotations.handle_rotation_plan_invite_response(
  p_rotation_plan_invite_id UUID,
  p_response_type groups.plan_invite_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
v_invite_message TEXT;
v_rows_updated INT;
BEGIN
    IF p_response_type='accepted' THEN 
      UPDATE groups.plan_invite 
        SET plan_invite_status =p_response_type 
        WHERE id=p_rotation_plan_invite_id ;
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      if v_rows_updated>0 THEN
      INSERT INTO groups.plan_members(invite_id,plan_member_status)
      VALUES (p_rotation_plan_invite_id,'pending');
      v_invite_message:='Invite has been accepted succesfully';
      END IF;
    ELSIF p_response_type='declined' THEN 
      UPDATE groups.plan_invite 
      SET plan_invite_status =p_response_type 
      WHERE id=p_rotation_plan_invite_id ;
       v_invite_message:='Invite has been declined succesfully';
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    END IF;
    IF v_rows_updated > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', v_invite_message
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invite not found or no changes made.'
        );
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION rotations.process_daily_rotation_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan RECORD;
    v_collection_result jsonb;
    v_payout_result jsonb;
    v_total_collections INT := 0;
    v_total_payouts INT := 0;
BEGIN
    -- Loop through all active rotation plans
    FOR v_plan IN
        SELECT rp.id AS plan_id
        FROM rotations.rotation_plan rp
        WHERE rp.rotation_status = 'active'
    LOOP
        -- 1. Process collections for today
        v_collection_result := rotations.process_due_collections(
            v_plan.plan_id,
            now()::timestamptz
        );
        IF (v_collection_result->>'success')::boolean THEN
            v_total_collections := v_total_collections +
                COALESCE((v_collection_result->'data'->>'total_processed')::INT, 0);
        END IF;

        -- 2. Create payout requests for today
        v_payout_result := rotations.get_due_payouts(
            v_plan.plan_id,
            now()::timestamptz
        );
        IF (v_payout_result->>'success')::boolean THEN
            v_total_payouts := v_total_payouts +
                COALESCE((v_payout_result->'data'->>'new_requests')::INT, 0);
        END IF;
    END LOOP;

    RETURN public.build_response(
        true,
        jsonb_build_object(
            'message', 'Daily rotation tasks completed',
            'collections_processed', v_total_collections,
            'payout_requests_created', v_total_payouts
        )
    );
END;
$$;


CREATE OR REPLACE FUNCTION rotations.process_due_collections(
  p_plan_id UUID,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_collections jsonb;
    v_result jsonb;
    v_internal_provider_id UUID;
    v_system_entity_id UUID;
    v_item jsonb;
    v_txn_response jsonb;
    v_txn_id UUID;
    v_amount NUMERIC;
    v_status rotations.schedule_amount_status;
     v_processed_count INT := 0;
BEGIN
--0 get system entity and providor_id
SELECT public.get_system_entity() INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_system_entity_id:=(v_result->'data'->>'id')::UUID;
SELECT finance.get_internal_provider()INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_internal_provider_id := (v_result->'data'->'internal_provider'->>'id')::UUID;
    -- 1. Get the due collections from our helper
 v_collections := (rotations.get_due_collections(p_plan_id, p_scheduled_date))->'data'->'due_collections';
IF v_collections IS NULL OR jsonb_array_length(v_collections) = 0 THEN
        RETURN public.build_response(
            true,
            jsonb_build_object('message', 'No due collections found')
        );
    END IF;

    -- Debug
    RAISE NOTICE 'Collections to process: %', jsonb_array_length(v_collections);

FOR v_item IN 
        SELECT value FROM jsonb_array_elements(v_collections)
    LOOP
        v_amount := (v_item->>'amount_to_collect')::NUMERIC;

        RAISE NOTICE 'Processing member %, amount %', v_item->>'member_name', v_amount;

        IF v_amount <= 0 THEN
            RAISE NOTICE 'Skipping (amount <= 0)';
            CONTINUE;
        END IF;

        -- 3. Call finance.process_transaction
        v_txn_response := finance.process_transaction(
            p_trans_type       => 'contribution_collection',
            p_trans_amount     => v_amount,
            p_currency         => v_item->>'account_currency',   
            p_trans_category_id => 'Group Rotation Collection',       
            p_initiator_id     => (v_item->>'group_id')::UUID,                             
            p_source_wallet_id => (v_item->>'group_wallet_id')::UUID,
            p_source_acc       => (v_item->>'plan_reserve_account_id')::UUID,
            p_destination_acc  => (v_item->>'group_account_id')::UUID,
            p_providor_id      => v_internal_provider_id,
            p_idempotency_key  => public.gen_ref_code('IDK')::text, 
            p_trans_description => format('Collection for member %s', v_item->>'member_name')
        );
   IF NOT(v_txn_response->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_txn_response->>'message'
USING ERRCODE=COALESCE(v_txn_response->>'error_code','P0001'),
HINT =COALESCE(v_txn_response->>'detail', 'No additional hint available');
END IF;
v_result := finance.finalize_transaction(
                (v_txn_response->'data'->>'transaction_id')::UUID,
                'completed',
                (v_txn_response->'data'->>'idempotency_id')::UUID
            );
IF NOT (v_result->>'success')::boolean THEN 
                RAISE EXCEPTION '%', v_result->>'message'
                USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                HINT = COALESCE(v_result->>'detail', 'No additional hint available');
            END IF;
            v_txn_id := (v_result->'data'->>'transaction_id')::UUID;
            v_processed_count := v_processed_count + 1;   -- count success

        -- 5. Insert into schedule_amount_collected
        v_status := CASE 
            WHEN v_amount = (v_item->>'required_amount')::NUMERIC THEN 'full' 
            ELSE 'partial' 
        END;
        
        INSERT INTO rotations.schedule_amount_collected (
            rotation_schedule,
            amount_recorded,
            transaction_id,
            schedule_amount_collected_status,
            date_collected
        ) VALUES (
            (v_item->>'schedule_id')::UUID,
            v_amount,
            v_txn_id,
            v_status,
            now()
        );

        -- 6. Mark schedule as completed
        UPDATE rotations.rotation_schedule
        SET schedule_status = 'disbursed'
        WHERE id = (v_item->>'schedule_id')::UUID;

    END LOOP;

   RETURN public.build_response(
    true,
    jsonb_build_object(
        'message', 'Collections processed',
        'total_processed', v_processed_count
    )
);
END;
$$;


CREATE OR REPLACE FUNCTION rotations.process_approved_payout(
  p_payout_request_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req RECORD;
    v_txn_response jsonb;
    v_txn_id UUID;
    v_finalize_result jsonb;
    v_system_entity_id UUID;
    v_internal_provider_id UUID;
BEGIN
    -- 1. Fetch the approved request + all required details
    SELECT
        pr.id AS request_id,
        pr.rotation_schedule_id,
        pr.requested_amount,
        rs.id AS schedule_id,
        rs.rotation_plan_member_id,
        rs.schedule_status,
        m.first_name || ' ' || m.last_name AS member_name,
        p.group_id,
        src.account_id AS source_account_id,
        src.acc_number AS source_account_number,
        src.wallet_id AS source_wallet_id,
        src.acc_currency AS currency,
        dst.account_id AS destination_account_id,
        dst.acc_number AS destination_account_number,
        dst.wallet_id AS destination_wallet_id
    INTO v_req
    FROM rotations.payout_request pr
    JOIN rotations.rotation_schedule rs ON pr.rotation_schedule_id = rs.id
    JOIN groups.plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.plan_invite rpi ON rpm.invite_id = rpi.id
    JOIN rotations.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.plans p ON p.id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
    JOIN public.members m ON gm.member_id = m.id
    -- Source: group account
    LEFT JOIN finance.wallets w ON w.owner_entity_id = p.group_id
    LEFT JOIN LATERAL (
        SELECT wa.wallet_id, a.id AS account_id, a.acc_number, a.acc_currency
        FROM finance.wallet_accounts wa
        JOIN finance.accounts a ON a.id = wa.acc_id
        WHERE wa.wallet_id = w.id AND a.acc_type = 'group'
        LIMIT 1
    ) src ON true
    -- Destination: member personal account
    LEFT JOIN finance.wallets mw ON mw.owner_entity_id = m.id
    LEFT JOIN LATERAL (
        SELECT wa.wallet_id, a.id AS account_id, a.acc_number
        FROM finance.wallet_accounts wa
        JOIN finance.accounts a ON a.id = wa.acc_id
        WHERE wa.wallet_id = mw.id AND a.acc_type = 'personal'
        LIMIT 1
    ) dst ON true
    WHERE pr.id = p_payout_request_id
      AND pr.status = 'approved'            -- only approved requests
      AND rs.schedule_status = 'pending';   -- not yet disbursed

    IF NOT FOUND THEN
        RETURN public.build_response(
            false,
            NULL,
            'No approved payout request found or already processed',
            'REQUEST_NOT_FOUND'
        );
    END IF;

    -- 2. Retrieve system entity and internal provider
    SELECT (public.get_system_entity())->'data'->>'id' INTO v_system_entity_id; --not necessary since its not being used as the initiator anymore 
    SELECT (finance.get_internal_provider())->'data'->'internal_provider'->>'id' INTO v_internal_provider_id;

    -- 3. Execute the transaction (move from group account to member account)
    v_txn_response := finance.process_transaction(
        p_trans_type       => 'payout_distribution',
        p_trans_amount     => v_req.requested_amount,
        p_currency         => v_req.currency,
        p_trans_category_id => 'Group Rotation Payout',
        p_initiator_id     => v_req.group_id,
        p_source_wallet_id => v_req.source_wallet_id,
        p_source_acc       => v_req.source_account_id,
        p_destination_acc  => v_req.destination_account_id,
        p_providor_id      => v_internal_provider_id,
        p_idempotency_key  => public.gen_ref_code('PAY')::text,
        p_trans_description => format('Payout to %s', v_req.member_name)
    );

    IF NOT (v_txn_response->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_txn_response->>'message'
        USING ERRCODE = COALESCE(v_txn_response->>'error_code', 'P0001'),
        HINT = COALESCE(v_txn_response->>'detail', 'No additional hint available');
    END IF;

    -- 4. Finalize the transaction
    v_finalize_result := finance.finalize_transaction(
        (v_txn_response->'data'->>'transaction_id')::UUID,
        'completed',
        (v_txn_response->'data'->>'idempotency_id')::UUID
    );

    IF NOT (v_finalize_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_finalize_result->>'message'
        USING ERRCODE = COALESCE(v_finalize_result->>'error_code', 'P0001'),
        HINT = COALESCE(v_finalize_result->>'detail', 'No additional hint available');
    END IF;

    v_txn_id := (v_finalize_result->'data'->>'transaction_id')::UUID;

    -- 5. Record in schedule_amount_disbursed
    INSERT INTO rotations.schedule_amount_disbursed (
        rotation_schedule,
        amount_recorded,
        transaction_id,
        schedule_amount_disbursed_status,
        date_collected
    ) VALUES (
        v_req.schedule_id,
        v_req.requested_amount,
        v_txn_id,
        'full',
        now()
    );

    -- 6. Mark schedule as disbursed
    UPDATE rotations.rotation_schedule
    SET schedule_status = 'disbursed'
    WHERE id = v_req.schedule_id;

    -- 7. (Optional) Update payout request with final timestamps if needed
    --    But approval already set reviewer_id and reviewed_at.
    --    We can keep it as is, or add a disbursed_at field – leaving for now.

    RETURN public.build_response(
        true,
        jsonb_build_object(
            'message', 'Payout processed successfully',
            'transaction_id', v_txn_id,
            'schedule_id', v_req.schedule_id,
            'member', v_req.member_name,
            'amount', v_req.requested_amount
        )
    );
END;
$$;



--SELECT groups.process_approved_payout('d8e7ab5b-7801-461e-943b-057cdabfb925');


CREATE OR REPLACE FUNCTION rotations.record_rotation_reservation_amount(
p_rotation_plan_member_id UUID,
p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$

BEGIN
 INSERT INTO rotations.rotation_reserve_amount_collected(rotation_plan_member_id,transaction_id)
      VALUES (p_rotation_plan_member_id,p_transaction_id);
  RETURN jsonb_build_object(
            'success', false,
            'message', 'Transaction Recorded successfully'
        );
END;
$$;


CREATE OR REPLACE FUNCTION rotations.send_rotation_invites(
  p_group_member_id UUID[],
  p_rotation_plan_id UUID,
  p_invite_status groups.plan_invite_status DEFAULT 'pending'

)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted_ids jsonb;
BEGIN
    WITH inserted_rows AS (
        INSERT INTO groups.plan_invite (
            group_member_id,
            rotation_plan_id,
            plan_invite_status
        )
        SELECT 
            unnested_member_id,
            p_rotation_plan_id,
            p_invite_status
        FROM 
            unnest(p_group_member_id) AS unnested_member_id
        RETURNING id -- Capture all newly generated IDs
    )
    SELECT jsonb_agg(id) INTO v_inserted_ids FROM inserted_rows;
RETURN public.build_response(
    true,
    jsonb_build_object('rotation_plan_invite_ids', COALESCE(v_inserted_ids, '[]'::jsonb))
);
END;
$$;

CREATE OR REPLACE FUNCTION rotations.update_rotation_plan_details(
  p_plan_id UUID,
  p_rotation_name TEXT,
  p_start_date TIMESTAMPTZ,
  p_amount_collectable NUMERIC,
  p_rotation_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
    v_updated_rows INT;
BEGIN
    UPDATE rotations.rotation_plan SET 
        rotation_name = p_rotation_name,
        rotation_description = p_rotation_description,
        start_date = p_start_date,
        amount_collectable = p_amount_collectable
    WHERE id = p_plan_id;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows = 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Plan not found or no changes made.'
        );
    END IF;
    UPDATE groups.plans SET 
        plan_name = p_rotation_name 
    WHERE id = p_plan_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Plan updated successfully.'
    );
END;
$$;
