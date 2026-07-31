CREATE OR REPLACE FUNCTION groups.get_rotation_progress(
  p_rotation_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_schedules    INT;
    v_completed_schedules INT;
    v_percentage         NUMERIC;
BEGIN
    -- Count all schedules for this rotation plan
    SELECT COUNT(*)
    INTO v_total_schedules
    FROM groups.rotation_schedule rs
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    WHERE rpi.rotation_plan_id = p_rotation_plan_id;

    -- Count schedules that are completed or disbursed
    SELECT COUNT(*)
    INTO v_completed_schedules
    FROM groups.rotation_schedule rs
    JOIN groups.rotation_plan_members rpm ON rs.rotation_plan_member_id = rpm.id
    JOIN groups.rotation_plan_invite rpi ON rpm.intive_id = rpi.id
    WHERE rpi.rotation_plan_id = p_rotation_plan_id
      AND rs.schedule_status IN ('disbursed');

    IF v_total_schedules > 0 THEN
        v_percentage := (v_completed_schedules::NUMERIC / v_total_schedules) * 100;
    ELSE
        v_percentage := 0;
    END IF;

    RETURN public.build_response(
        true,
        jsonb_build_object(
            'total_schedules', v_total_schedules,
            'completed_schedules', v_completed_schedules,
            'progress_percentage', ROUND(v_percentage, 1)
        )
    );
END;
$$;

--SELECT groups.get_rotation_progress('80d2b6d4-a17f-4c8f-a852-5dd06937e0ca');