CREATE OR REPLACE FUNCTION groups.get_due_collections(
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
    FROM groups.rotation_schedule rs
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
    JOIN groups.plans p ON p.id = rp.id
    JOIN groups.group_members gm ON rpi.group_member_id = gm.id
		JOIN public.groups g ON p.group_id =g.id
    JOIN public.members m ON gm.member_id = m.id

    -- Total contributions only (from rotation_reserve_amount_collected)
    LEFT JOIN LATERAL (
        SELECT SUM(ft.trans_amount) AS total
        FROM groups.rotation_reserve_amount_collected rrac
        JOIN finance.transactions ft ON rrac.transaction_id = ft.id
        WHERE rrac.rotation_plan_member_id = rpm.id
    ) member_reserve ON true

    -- Already collected for this specific schedule
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total_collected
        FROM groups.schedule_amount_collected sac
        WHERE sac.rotation_schedule = rs.id
    ) sched_collected ON true

    -- Total collected across all schedules for this member
    LEFT JOIN LATERAL (
        SELECT SUM(sac.amount_recorded) AS total_collected
        FROM groups.schedule_amount_collected sac
        JOIN groups.rotation_schedule rs2 ON sac.rotation_schedule = rs2.id
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