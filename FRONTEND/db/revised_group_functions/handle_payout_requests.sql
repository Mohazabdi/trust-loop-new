CREATE OR REPLACE FUNCTION groups.handle_payout_request_response(
  p_payout_request_id UUID,
  p_response_type groups.payout_request_status,
  p_reviewer_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_message TEXT;
    v_rows_updated INT;
    v_schedule_id UUID;
BEGIN
    -- Validate response type
    IF p_response_type NOT IN ('approved', 'rejected') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid response type. Must be "approved" or "rejected".'
        );
    END IF;

    -- Update the payout request
    UPDATE groups.payout_request
    SET 
        status = p_response_type,
        reviewer_id = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_payout_request_id
      AND status = 'pending';

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
        IF p_response_type = 'approved' THEN
            v_message := 'Payout request approved successfully.';
        ELSE
            v_message := 'Payout request rejected successfully.';
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'message', v_message
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Payout request not found or already reviewed.'
        );
    END IF;
END;
$$;