
CREATE OR REPLACE FUNCTION groups.create_rotation_plan(
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

INSERT  INTO groups.rotation_plan (
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
INSERT INTO groups.rotation_plan_invite(
group_member_id,
rotation_plan_id,
rotation_invite_status
)
VALUES(
p_created_by_id,
v_plan_id,
'accepted'
)
 RETURNING id INTO v_invite_id;
 INSERT INTO groups.rotation_plan_members(
    intive_id,-- this spelling mistake was intentional
    rotation_plan_members_status
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