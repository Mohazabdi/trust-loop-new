CREATE OR REPLACE FUNCTION groups.get_member_rotation_report(
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
        FROM groups.rotation_plan_members rpm
        JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
        JOIN groups.rotation_plan rp ON rpi.rotation_plan_id = rp.id
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
        FROM groups.rotation_reserve_amount_collected rrac
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
        FROM groups.schedule_amount_collected sac
        JOIN groups.rotation_schedule rs ON sac.rotation_schedule = rs.id
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
        FROM groups.schedule_amount_disbursed sad
        JOIN groups.rotation_schedule rs ON sad.rotation_schedule = rs.id
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
        FROM groups.rotation_schedule rs
        LEFT JOIN LATERAL (
            SELECT SUM(sac.amount_recorded) AS total
            FROM groups.schedule_amount_collected sac
            WHERE sac.rotation_schedule = rs.id
        ) sac_collected ON true
        LEFT JOIN LATERAL (
            SELECT SUM(sad.amount_recorded) AS total
            FROM groups.schedule_amount_disbursed sad
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