CREATE OR REPLACE FUNCTION groups.getRotationMemberId(
p_group_member_id UUID,
p_rotation_plan_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
v_rotation_member_id UUID;
BEGIN
 
 SELECT rpm.id INTO v_rotation_member_id  from groups.rotation_plan_members rpm
 JOIN groups.rotation_plan_invite rpi ON rpi.id =rpm.intive_id 
 WHERE rpi.group_member_id=p_group_member_id AND rpi.rotation_plan_id=p_rotation_plan_id
 LIMIT 1;
 return v_rotation_member_id;
END;
$$;