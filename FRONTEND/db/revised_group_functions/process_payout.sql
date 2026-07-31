CREATE OR REPLACE FUNCTION groups.process_approved_payout(
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
    FROM groups.payout_request pr
    JOIN groups.rotation_schedule rs ON pr.rotation_schedule_id = rs.id
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
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
    INSERT INTO groups.schedule_amount_disbursed (
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
    UPDATE groups.rotation_schedule
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