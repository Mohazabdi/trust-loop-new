CREATE OR REPLACE FUNCTION groups.get_rotation_plan_report(
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
             FROM groups.rotation_plan_members rpm2
             JOIN groups.rotation_plan_invite rpi2 ON rpm2.intive_id = rpi2.id
             WHERE rpi2.rotation_plan_id = p_rotation_plan_id
            ) AS total_members
        FROM groups.rotation_plan rp
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
                FROM groups.rotation_reserve_amount_collected rrac
                JOIN finance.transactions ft ON rrac.transaction_id = ft.id
                WHERE rrac.rotation_plan_member_id = rpm.id
            ) AS total_contributed,

            -- Total collected: sum from schedule_amount_collected for this member's collection schedules in this plan
            (
                SELECT COALESCE(SUM(sac.amount_recorded), 0)
                FROM groups.schedule_amount_collected sac
                JOIN groups.rotation_schedule rs ON sac.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'collection'
            ) AS total_collected,

            -- Total disbursed: sum from schedule_amount_disbursed for this member's payout schedules in this plan
            (
                SELECT COALESCE(SUM(sad.amount_recorded), 0)
                FROM groups.schedule_amount_disbursed sad
                JOIN groups.rotation_schedule rs ON sad.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'payout'
            ) AS total_disbursed,

            -- Net balance
            (
                SELECT COALESCE(SUM(ft.trans_amount), 0)
                FROM groups.rotation_reserve_amount_collected rrac
                JOIN finance.transactions ft ON rrac.transaction_id = ft.id
                WHERE rrac.rotation_plan_member_id = rpm.id
            ) - (
                SELECT COALESCE(SUM(sac.amount_recorded), 0)
                FROM groups.schedule_amount_collected sac
                JOIN groups.rotation_schedule rs ON sac.rotation_schedule = rs.id
                WHERE rs.rotation_plan_member_id = rpm.id
                  AND rs.schedule_action = 'collection'
            ) AS net_balance

        FROM groups.rotation_plan_members rpm
        JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
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
