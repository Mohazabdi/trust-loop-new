CREATE OR REPLACE FUNCTION groups.get_group_members_details(p_group_id UUID)
RETURNS TABLE(
    group_member_id UUID,
    member_id UUID,
    first_name TEXT,
    last_name TEXT,
    other_name TEXT,
    email TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    date_of_birth TIMESTAMPTZ,
    gender public.gender,
    national_id TEXT,
    verification_status public.verification_status,
    cover_photo_url TEXT,
    display_photo_url TEXT,
    about TEXT,
    member_role TEXT,
    member_status TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SET search_path = groups, public
AS $$
BEGIN
    -- Validate group exists and is not deleted
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND group_status != 'deleted') THEN
        RAISE EXCEPTION 'Group not found or has been deleted (ID: %)', p_group_id;
    END IF;

    -- Return full member details (only active members)
    RETURN QUERY
    SELECT
        gm.id AS group_member_id,
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.other_name,
        m.email,
        m.primary_phone,
        m.secondary_phone,
        m.date_of_birth,
        m.gender,
        m.national_id,
        m.verification_status,
        m.cover_photo_url,
        m.display_photo_url,
        m.about,
        gm.member_role::TEXT,
        gm.member_status::TEXT,
        gm.created_at AS joined_at
    FROM groups.group_members gm
    INNER JOIN public.members m ON m.id = gm.member_id
    WHERE gm.group_id = p_group_id
      AND gm.member_status = 'active'
    ORDER BY gm.created_at ASC;
END;
$$;