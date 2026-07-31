CREATE OR REPLACE FUNCTION groups.get_due_payouts(
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
    FROM groups.rotation_schedule rs
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.plans p ON p.id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
    JOIN public.members m ON gm.member_id = m.id

    -- Total collected for THIS cycle (all collection schedules on the same date)
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM groups.schedule_amount_collected sac
        JOIN groups.rotation_schedule rs2 ON sac.rotation_schedule = rs2.id
        JOIN groups.rotation_plan_members rpm2 ON rs2.rotation_plan_member_id = rpm2.id
        JOIN groups.rotation_plan_invite rpi2 ON rpm2.intive_id = rpi2.id
        WHERE rpi2.rotation_plan_id = p_plan_id
          AND rs2.schedule_action = 'collection'
          AND rs2.date_scheduled::date = rs.date_scheduled::date
    ) cycle_collected ON true

    -- Individual collected for this schedule (if any, likely 0 for payouts)
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM groups.schedule_amount_collected sac
        WHERE sac.rotation_schedule = rs.id
    ) sched_collected ON true

    -- Member's total contributions
    LEFT JOIN LATERAL (
        SELECT SUM(ft.trans_amount) AS total
        FROM groups.rotation_reserve_amount_collected rrac
        JOIN finance.transactions ft ON rrac.transaction_id = ft.id
        WHERE rrac.rotation_plan_member_id = rpm.id
    ) member_reserve ON true

    -- Member's total collected across all schedules
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total
        FROM groups.schedule_amount_collected sac
        JOIN groups.rotation_schedule rs3 ON sac.rotation_schedule = rs3.id
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
        INSERT INTO groups.payout_request (
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
            UPDATE groups.payout_request
            SET requested_amount = (v_item->>'amount_to_distribute')::NUMERIC,
                status = 'pending',
                created_at = now()
            WHERE rotation_schedule_id = (v_item->>'schedule_id')::UUID
              AND status != 'approved';
        END IF;

        -- Mark schedule as pending
        UPDATE groups.rotation_schedule
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