-- Corrected ALTER FUNCTION (with 7 parameters)
ALTER FUNCTION groups.create_group(
    UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC
) SECURITY DEFINER;

ALTER FUNCTION groups.get_all_member_group(UUID) SECURITY DEFINER;
ALTER FUNCTION public.get_member_entity(UUID) SECURITY DEFINER;
ALTER FUNCTION groups.list_discoverable_groups(UUID, INTEGER) SECURITY DEFINER;
ALTER FUNCTION public.get_member_group_invites(UUID, INTEGER, INTEGER) SECURITY DEFINER;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA groups
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA groups
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Grant permissions on existing objects
GRANT USAGE ON SCHEMA groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA groups TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA groups TO authenticated;

-- Optional check query
SELECT proname, prosecdef
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE proname IN ('get_member_entity', 'create_group')
AND nspname IN ('public', 'groups');