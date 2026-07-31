CREATE OR REPLACE FUNCTION groups.get_reserve_contributions(
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
    SELECT  jsonb_agg(
        jsonb_build_object(
            'id',rrac.id,
            'transaction_id',rrac.transaction_id,
						'trans_amount',t.trans_amount,
						'date_of_transaction',t.created_at
            
        ))
    INTO v_result
    FROM groups.rotation_reserve_amount_collected rrac
    JOIN finance.transactions t ON t.id=rrac.transaction_id
    WHERE rrac.rotation_plan_member_id=p_rotation_plan_member_id ;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_reserve_amounts',COALESCE(v_result, '[]'::jsonb))
    );
END;
$$;