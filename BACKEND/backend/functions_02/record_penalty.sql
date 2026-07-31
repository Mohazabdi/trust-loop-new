CREATE OR REPLACE FUNCTION groups.record_penalty(
    p_collection_schedule_id UUID,
    p_amount                 NUMERIC,
    p_transaction_id         UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = groups, public, finance
AS $$
DECLARE
    v_schedule RECORD;
    v_pen_id   UUID;
    v_code     TEXT;
BEGIN
    -- Lock schedule to avoid race conditions
    SELECT * INTO v_schedule FROM groups.rotation_collection_schedule
    WHERE id = p_collection_schedule_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collection schedule not found (ID: %)', p_collection_schedule_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM finance.transactions WHERE id = p_transaction_id) THEN
        RAISE EXCEPTION 'Transaction not found (ID: %)', p_transaction_id;
    END IF;
    INSERT INTO groups.rotation_penalty_applied (
        transaction_id,
        amount_applied,
        rotation_collection_schedule_id,
        rotation_penalty_applied_status,
        penalty_status
    )
    VALUES (
        p_transaction_id,
        p_amount,
        p_collection_schedule_id,
        'pending',
        'pending'
    )
    ON CONFLICT (transaction_id, rotation_collection_schedule_id) DO NOTHING
    RETURNING id, rotation_penalty_applied_code INTO v_pen_id, v_code;
    IF v_pen_id IS NULL THEN
        RAISE EXCEPTION 'Penalty already recorded for this transaction and schedule';
    END IF;
    RETURN jsonb_build_object(
        'penalty_id', v_pen_id,
        'code', v_code,
        'status', 'recorded',
        'amount', p_amount
    );
END;
$$;