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