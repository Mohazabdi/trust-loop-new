CREATE OR REPLACE FUNCTION groups.assign_payout_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = groups, public
AS $$
DECLARE
    v_next_order INTEGER;
BEGIN
    IF NEW.payout_order IS NULL AND NEW.rotation_member_status = 'active' THEN
        SELECT COALESCE(MAX(payout_order), 0) + 1
        INTO v_next_order
        FROM groups.rotation_plan_members
        WHERE rotation_plan_id = NEW.rotation_plan_id
          AND rotation_member_status = 'active'
          AND payout_order IS NOT NULL;
        NEW.payout_order := v_next_order;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_payout_order ON groups.rotation_plan_members;
CREATE TRIGGER trg_assign_payout_order
    BEFORE INSERT ON groups.rotation_plan_members
    FOR EACH ROW
    EXECUTE FUNCTION groups.assign_payout_order();