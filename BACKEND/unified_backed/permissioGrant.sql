   
-- GRANTING PERMISSIONS
-- 1. Grant schema usage
GRANT USAGE ON SCHEMA groups TO authenticated;
GRANT USAGE ON SCHEMA groups TO anon;

-- 2. Grant access to all existing tables in groups schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA groups TO authenticated;

-- 3. Grant access to all existing sequences (needed for gen_ref_code and UUIDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA groups TO authenticated;

-- 4. Grant execute on the create_group function specifically
GRANT EXECUTE ON FUNCTION groups.create_group(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;

-- 5. Make sure future tables/sequences in groups schema are also covered
ALTER DEFAULT PRIVILEGES IN SCHEMA groups GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA groups GRANT USAGE, SELECT ON SEQUENCES TO authenticated;


-- SECURITY DEFINER FOR FUNCTION THAT CREATES A GROUP AND GET MEMBER FROM ENTITY TABLE.
ALTER FUNCTION groups.create_group(
    UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC
) SECURITY DEFINER;

ALTER FUNCTION public.get_member_entity(UUID)
<<<<<<< HEAD
SECURITY DEFINER;

ALTER FUNCTION groups.get_all_member_group(UUID) SECURITY DEFINER;
=======
SECURITY DEFINER;
>>>>>>> a04c3ef03989b3e47c73cbded295e68de11b5dfe
