CREATE OR REPLACE FUNCTION groups.get_rotation_plan(
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
    SELECT 
        jsonb_build_object(
            'rotation_plan_id', rp.id,
            'created_by',rp.created_by,
            'rotation_name', rp.rotation_name,
            'rotation_description',rp.rotation_description,
            'start_date',rp.start_date,
            'rotation_status',rp.rotation_status,
            'amount_collectable',rp.amount_collectable,
            'account_id', a.id,
            'account_number',a.acc_number,
            'account_name',a.acc_name,
            'account_type',a.acc_type,
            'currency_code',a.acc_currency,
            'current_balance',a.current_balance,
            'available_balance',a.available_balance,
            'account_status',a.acc_status,
            'hold_balance',a.hold_balance
        )
    INTO v_result
    FROM groups.rotation_plan rp
    INNER JOIN finance.accounts a 
         ON rp.rotation_plan_reserve_account_id=a.id
    WHERE rp.id = p_rotation_plan_id;
    RETURN public.build_response(
        true,
        jsonb_build_object('rotation_plan',v_result)
    );
END;
$$;
