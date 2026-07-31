CREATE OR REPLACE FUNCTION finance.get_transaction_history(
    p_entity_id UUID;
)
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id',le.id,
            'trans_id',le.trans_id ,
            'entry_type', le.entry_type,
            'trans_category', le.trans_category,
            'entry_amount', le.entry_amount,
            'entry_status', le.entry_status,
            'date_of_transaction',le.created_at
        ) ORDER BY le.created_at
    )
    INTO v_result
    FROM finance.ledger_entries le
    INNER JOIN finance.accounts a
        ON le.acc_id = a.id
        WHERE a.owner_entity_id=p_entity_id;

    RETURN public.build_response(
        true,
        jsonb_build_object('transaction_history',COALESCE(v_result, '[]'::jsonb))
    );
END;
