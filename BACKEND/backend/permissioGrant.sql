-- GRANTING PERMISSIONS () FOR GROUPS SCHEMA

-- 1. Grant schema usage
GRANT USAGE ON SCHEMA groups TO authenticated;
GRANT USAGE ON SCHEMA groups TO anon;

-- 2. Grant access to all existing tables in groups schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA groups TO authenticated;

-- 3. Grant access to all existing sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA groups TO authenticated;

-- 4. Grant execute on the create_group function (correct signature: 7 parameters)
GRANT EXECUTE ON FUNCTION groups.create_group(
    UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC
) TO authenticated;

-- 5. Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA groups
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA groups
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- SET SECURITY DEFINER ON FUNCTIONS 
ALTER FUNCTION groups.create_group(
    UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC
) SECURITY DEFINER;

ALTER FUNCTION public.get_member_entity(UUID) SECURITY DEFINER;

ALTER FUNCTION groups.get_all_member_group(UUID) SECURITY DEFINER;
