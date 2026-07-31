CREATE OR REPLACE FUNCTION public.create_group_entity(
    p_group_name TEXT,
    p_created_by UUID,                     -- reference to member entity ID
    p_currency_code TEXT,
    p_is_active TEXT DEFAULT 'true',
    p_group_description TEXT DEFAULT NULL,
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = public,finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_entity_id UUID;
    v_group_name TEXT;
    v_group_description TEXT;
    v_created_by_member_id UUID;
    v_created_by_entity_id UUID;           -- member's entity ID
    v_is_active BOOLEAN;
    v_system_entity_id UUID;
    v_group_account_id UUID;
    v_group_account_name TEXT;
    v_overdraft_account_id UUID;
    v_overdraft_account_name TEXT;
    v_wallet_id UUID;
    v_wallet_name TEXT;
    v_wallet_access_level TEXT;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
v_is_active := public.parse_boolean(p_is_active,TRUE);
    -- 2. Validate created_by exists in members table
    SELECT public.check_field_existance(p_created_by, 'public', 'members') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_created_by_member_id := (v_result->'data'->>'id')::UUID;

    -- Also need the member's entity ID (same as member id, because members.id = entities.id)
    v_created_by_entity_id := v_created_by_member_id;

    -- 3. Create entity (type = 'group')
    SELECT public.create_entity(
        'group',
        v_group_name,
        p_entity_status,
        '@group.ent'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_entity_id := (v_result->'data'->>'id')::UUID;

    -- 4. Insert into groups table
    INSERT INTO public.groups (
        id, group_name, group_description, created_by, is_active
    ) VALUES (
        v_entity_id, v_group_name, v_group_description, v_created_by_member_id, v_is_active
    );

    -- 5. Get system entity ID for created_by in accounts/wallet
    SELECT public.get_system_entity() INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_system_entity_id := (v_result->'data'->>'id')::UUID;

    -- 6. Create group account (acc_type = 'group')
    SELECT finance.create_account(
        p_acc_type := 'group',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'active',
        p_acc_name := format('%s Group Account',v_group_name),
        p_acc_description := format('Main operating account for group %s',v_group_name),
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

    -- 7. Create overdraft account for the group
    SELECT finance.create_account(
        p_acc_type := 'overdraft',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'dormant',
        p_acc_name := format('%s  Overdraft Account',v_group_name ),
        p_acc_description := format('Overdraft facility for group %s' , v_group_name),
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

    -- 8. Create group wallet (type = 'group')
    SELECT finance.create_wallet(
        p_wallet_name := format('%s  Group Wallet',v_group_name),
        p_owner_entity_id := v_entity_id,
        p_wallet_status := 'active',
        p_wallet_type := 'group',
        p_wallet_description := format('Wallet for group ', v_group_name)
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
        p_entity_id := v_created_by_entity_id,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_access_level := (v_result->'data'->>'access_level')::finance.wallet_access_level;

    -- 12. Return success response
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'group_entity_id', v_entity_id,
            'group_name', v_group_name,
            'group_description', v_group_description,
            'created_by', v_created_by_member_id,
            'is_active', v_is_active,
            'group_account_id', v_group_account_id,
            'group_account_name', v_group_account_name,
            'overdraft_account_id', v_overdraft_account_id,
            'overdraft_account_name', v_overdraft_account_name,
            'wallet_id', v_wallet_id,
            'wallet_name', v_wallet_name,
            'wallet_access_level', v_wallet_access_level
        )
    );

EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME, v_detail = PG_EXCEPTION_DETAIL;
        -- IF v_constraint_name = 'groups_group_name_key' THEN
        --     RETURN public.build_response(
        --         false, NULL, 'P0002',
        --         'Group name already exists',
        --         format('Name %s already used', v_group_name)
        --     );
       
        IF v_constraint_name = 'groups_group_ref_key' THEN
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Group reference already exists',
                v_detail
            );
        ELSE
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Duplicate group record',
                v_detail
            );
        END IF;
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
