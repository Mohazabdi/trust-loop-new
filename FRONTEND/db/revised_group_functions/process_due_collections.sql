
CREATE OR REPLACE FUNCTION groups.process_due_collections(
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
    v_status groups.schedule_amount_status;
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
 v_collections := (groups.get_due_collections(p_plan_id, p_scheduled_date))->'data'->'due_collections';
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
        
        INSERT INTO groups.schedule_amount_collected (
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
        UPDATE groups.rotation_schedule
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
