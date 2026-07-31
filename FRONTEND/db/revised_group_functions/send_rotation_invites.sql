CREATE OR REPLACE FUNCTION groups.send_rotation_invites(
  p_group_member_id UUID[],
  p_rotation_plan_id UUID,
  p_invite_status groups.rotation_invite_status DEFAULT 'pending'

)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted_ids jsonb;
BEGIN
    WITH inserted_rows AS (
        INSERT INTO groups.rotation_plan_invite (
            group_member_id,
            rotation_plan_id,
            rotation_invite_status
        )
        SELECT 
            unnested_member_id,
            p_rotation_plan_id,
            p_invite_status
        FROM 
            unnest(p_group_member_id) AS unnested_member_id
        RETURNING id -- Capture all newly generated IDs
    )
    SELECT jsonb_agg(id) INTO v_inserted_ids FROM inserted_rows;
RETURN public.build_response(
    true,
    jsonb_build_object('rotation_plan_invite_ids', COALESCE(v_inserted_ids, '[]'::jsonb))
);
END;
$$;