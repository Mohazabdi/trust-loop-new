CREATE OR REPLACE FUNCTION groups.get_rotation_plan_schedules(
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
            gm.id AS member_id,
            m.first_name,
            m.last_name,
            -- Assign a cycle number based on distinct dates, ordered
            DENSE_RANK() OVER (ORDER BY rs.date_scheduled) AS cycle_num
        FROM groups.rotation_schedule rs
        JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
        JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
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
                    'status', schedule_status,
                    'member_id',member_id
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
