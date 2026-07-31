
-- ============================================================
-- get_group_members_details
-- Bug: function body SELECTs m.verification_status in the
-- position declared as national_id TEXT, causing a column
-- type/position mismatch in the return set.
-- Fixed by selecting the correct columns in the correct order
-- matching the RETURNS TABLE declaration.
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
    national_id       TEXT,
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
        m.first_name                AS first_name,
        m.last_name                 AS last_name,
        m.other_name                AS other_name,
        m.email                     AS email,
        -- public.members schema does not have
        -- primary_phone / secondary_phone / date_of_birth /
        -- national_id / cover_photo_url — return NULL for
        -- columns that don't exist in the live schema.
        -- If you add these columns, by running the ALTER TABLE command 
        -- DOWN below, replace NULL with m.column_name.
        NULL::TEXT                  AS primary_phone,
        NULL::TEXT                  AS secondary_phone,
        NULL::TIMESTAMPTZ           AS date_of_birth,
        NULL::TEXT                  AS national_id,
        NULL::TEXT                  AS cover_photo_url,
        NULL::TEXT                  AS display_photo_url,
        m.about                     AS about,
        gm.member_role::TEXT        AS member_role,
        gm.member_status::TEXT      AS member_status,
        gm.created_at               AS joined_at
    FROM  groups.group_members gm
    INNER JOIN public.members m ON m.id = gm.member_id
    WHERE gm.group_id      = p_group_id
      AND gm.member_status = 'active'
    ORDER BY gm.created_at ASC;
END;
$$;


-- Add missing columns to public.members
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS primary_phone TEXT ,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS display_photo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';



ALTER FUNCTION groups.get_group_members_details(UUID) SECURITY DEFINER;