-- ============================================================
-- STEP 1 – Add missing columns to public.members
-- (using the correct data types already defined in your schema)
-- ============================================================
ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS primary_phone TEXT,
    ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
    ADD COLUMN IF NOT EXISTS display_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS national_id TEXT,
    ADD COLUMN IF NOT EXISTS about TEXT,
    ADD COLUMN IF NOT EXISTS gender public.gender,   -- uses your existing enum
    ADD COLUMN IF NOT EXISTS verification_status public.verification_status DEFAULT 'unverified'::public.verification_status;

-- ============================================================
-- STEP 2 – Replace groups.get_group_members_details
-- with a version that selects the new columns
-- ============================================================
CREATE OR REPLACE FUNCTION groups.get_group_members_details(p_group_id UUID)
RETURNS TABLE (
    group_member_id   UUID,
    member_id         UUID,
    first_name        TEXT,
    last_name         TEXT,
    other_name        TEXT,
    email             TEXT,
    primary_phone     TEXT,
    secondary_phone   TEXT,
    date_of_birth     TIMESTAMPTZ,
    gender            public.gender,
    national_id       TEXT,
    verification_status public.verification_status,
    cover_photo_url   TEXT,
    display_photo_url TEXT,
    about             TEXT,
    member_role       TEXT,
    member_status     TEXT,
    joined_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = groups, public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = p_group_id
          AND group_status != 'deleted'
    ) THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND: Group not found or has been deleted (ID: %).', p_group_id;
    END IF;

    RETURN QUERY
    SELECT
        gm.id                       AS group_member_id,
        m.id                        AS member_id,
        m.first_name,
        m.last_name,
        m.other_name,
        m.email,
        m.primary_phone,            -- now exists
        m.secondary_phone,          -- now exists
        m.date_of_birth,            -- now exists
        m.gender,                   -- now exists
        m.national_id,              -- now exists
        m.verification_status,      -- now exists
        m.cover_photo_url,          -- now exists
        m.display_photo_url,        -- now exists
        m.about,                    -- now exists
        gm.member_role::TEXT,
        gm.member_status::TEXT,
        gm.created_at               AS joined_at
    FROM  groups.group_members gm
    INNER JOIN public.members m ON m.id = gm.member_id
    WHERE gm.group_id      = p_group_id
      AND gm.member_status = 'active'
    ORDER BY gm.created_at ASC;
END;
$$;

ALTER FUNCTION groups.get_group_members_details(UUID) SECURITY DEFINER;