CREATE OR REPLACE FUNCTION groups.record_rotation_reservation_amount(
p_rotation_plan_member_id UUID,
p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$

BEGIN
 INSERT INTO groups.rotation_reserve_amount_collected(rotation_plan_member_id,transaction_id)
      VALUES (p_rotation_plan_member_id,p_transaction_id);
  RETURN jsonb_build_object(
            'success', false,
            'message', 'Transaction Recorded successfully'
        );
END;
$$;