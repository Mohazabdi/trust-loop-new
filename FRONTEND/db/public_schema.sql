-- THE SCHEMA CREATION HERE 
-- -- uncomment this part to run the 
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS finance CASCADE;
CREATE SCHEMA public;
CREATE SCHEMA finance;
-- Ensure extension is in a safe schema
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
-- Optional: set default for this session
SET search_path TO public, finance;
-- run the functions first in the corresponding functions file ill provide 
--THE ENUM TYPES HERE
CREATE TYPE finance.acc_status AS ENUM(
'active',
'dormant',
'frozen',
'closed',
'deleted' -- this is also for soft delete to avoid bringing inconsistencies
);
CREATE TYPE finance.acc_type AS ENUM(
'personal',
'overdraft',
'group',
'organization',
'escrow',
'savings',
'sys_revenue',
'sys_clearing',
'sys_fee_income',
'sys_settlement',
'loan',
'project'
);
CREATE TYPE finance.wallet_status AS ENUM(
'active',
'dormant',
'closed'
);
CREATE TYPE finance.transaction_type AS ENUM(
'deposit',
'withdrawal',
'transfer',
'reversal',
'fee',
'adjustment',
'interest'

);

CREATE TYPE finance.transaction_status AS ENUM(
'pending',
'processing',
'completed',
'failed',
'canceled',
'deleted' -- this is added to keep track of soft delete
);
CREATE TYPE finance.ext_trans_status AS ENUM(
'completed',
'processing',
'failed'
);
CREATE TYPE finance.transaction_direction AS ENUM(
'inflow',
'outflow',
'internal'
);
CREATE TYPE finance.ledger_entry_type AS ENUM(
'debit',
'credit'
);
CREATE TYPE finance.ledger_entry_status AS ENUM(
'pending',
'posted',
'failed'
);
CREATE TYPE finance.fee_calc_type AS ENUM(
'fixed',
'rate'
);
CREATE TYPE finance.fee_charge_to AS ENUM(
'sender',
'receiver',
'both'
);
CREATE TYPE finance.idemp_key_status AS ENUM(
'active',
'used',
'expired'
);
CREATE TYPE finance.audit_action_type AS ENUM(
'delete',
'insert',
'update'
);
CREATE TYPE finance.wallet_type AS ENUM (
    'personal',
    'group',
    'organization',
    'project'
);
CREATE TYPE finance.wallet_access_level AS ENUM(
    'view',--see balances and transactions
    'use', -- initiate transactions
    'manage' --manage wallet accounts and settings etc
);
CREATE TYPE finance.providor_type AS ENUM(
    'internal',
    'external'
);
CREATE TYPE finance.providor_status AS ENUM(
    'active',
    'dormant',
    'deleted'
);

CREATE TYPE finance.notification_type AS ENUM(
    'error',
    'alert',
    'information',
    'danger',
    'high_priority',
    'security_risk',
    'neutral'
);

CREATE TYPE public.entity_type AS ENUM(
'group',
'organization',
'administrator',
'member',
'system'
);
CREATE TYPE public.entity_status AS ENUM (
    'active',
    'deleted', -- for soft delete ,avoiding inconsistencies for financial layer
    'dormant',
    'suspended'
);
CREATE TYPE public.admin_role AS ENUM (
    'sys_admin',
    'accountant',
    'dev',
    'manager',
    'employee',
    'gov_off'
);

CREATE TYPE finance.providor_type_status AS ENUM(
    'active',
    'dormant',
    'deleted'
);

CREATE SEQUENCE IF NOT EXISTS public.default_ref_seq 
       START 1
       INCREMENT BY 1
       MINVALUE 1
       MAXVALUE 999999
       CYCLE ;
CREATE OR REPLACE FUNCTION public.gen_ref_code(
    p_prefix TEXT,
    p_period TEXT DEFAULT to_char(CURRENT_DATE,'MMYYDD')
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE 
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_prefix_hash INTEGER;
    v_next_seq BIGINT;
    v_suffix TEXT;
    v_prefix TEXT;
BEGIN 
   v_prefix :=UPPER(TRIM(p_prefix));
   v_prefix_hash := hashtext(v_prefix|| p_period);
   PERFORM pg_advisory_xact_lock(v_prefix_hash);
   v_suffix := substr(md5(random()::text),1,1);

   UPDATE public.ref_prefixes 
   SET current_seq_value=current_seq_value +1
   WHERE prefix=v_prefix AND is_active =true
   RETURNING current_seq_value INTO v_next_seq;
  IF v_next_seq is NULL THEN 
  v_next_seq := nextval('default_ref_seq');
  v_prefix :='REF';
  END IF;
  RETURN v_prefix||'-'||p_period||'-'||LPAD(v_next_seq::text,6,'0')||v_suffix;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_enum_fields(
    value TEXT,
     enum_type anyelement
)
RETURNS boolean 
IMMUTABLE
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN 
   RETURN EXISTS(
    SELECT 1
    FROM unnest(enum_range(enum_type)) AS t(val)
    WHERE val::text =value
   );
END;
$$ ;
CREATE TABLE IF NOT EXISTS public.ref_prefixes(
    prefix TEXT PRIMARY KEY CHECK (prefix ~ '^[A-Z]{2,5}'),
    pref_description TEXT,
    is_active BOOLEAN DEFAULT true,
    current_seq_value BIGINT NOT NULL DEFAULT 0,
    current_period TEXT NOT NULL DEFAULT to_char(CURRENT_DATE,'MMYYDD'),
    last_reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ref_prefix_is_active_idx ON public.ref_prefixes(is_active);


CREATE TABLE IF NOT EXISTS public.entities(
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
entity_type public.entity_type NOT NULL DEFAULT 'member',
entity_name  TEXT UNIQUE NOT NULL,--will consider making it unique
entity_ref TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code('ENT'),
entity_status public.entity_status NOT NULL DEFAULT 'dormant',
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_one_sys_entity
ON public.entities (entity_type)
WHERE entity_type='system';
CREATE INDEX entity_ref_idx ON public.entities(entity_ref);


CREATE TABLE IF NOT EXISTS public.members(
id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
member_ref TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code('MBR'),
auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
other_name TEXT,
created_by  UUID NOT NULL   REFERENCES public.entities(id) ON DELETE CASCADE,
email TEXT UNIQUE,
date_of_register TIMESTAMPTZ NOT NULL DEFAULT now(),
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE(first_name,last_name,other_name)
);
CREATE INDEX members_ref_idx ON public.members(member_ref);
CREATE INDEX members_auth_idx ON public.members(auth_id);
CREATE INDEX members_email_idx ON public.members(email);


CREATE TABLE IF NOT EXISTS public.organizations(
    id UUID  PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE, 
    org_name TEXT NOT NULL UNIQUE,
    org_ref TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code('ORG'),
    org_description TEXT,
    created_by UUID   REFERENCES public.members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_ref_idx ON public.organizations(org_ref);
CREATE INDEX org_name_idx ON public.organizations(org_name);

CREATE TABLE IF NOT EXISTS public.groups (
    id uuid NOT NULL,
    group_name text NOT NULL,
    group_ref text NOT NULL DEFAULT gen_ref_code('GRP'::text),
    group_description text,
    group_visibility group_visibility NOT NULL DEFAULT 'private'::group_visibility,
    created_by uuid,
    group_status group_status NOT NULL DEFAULT 'active'::group_status,
    group_cover_photo_url text,
    group_display_photo_url text,
    max_capacity numeric NOT NULL DEFAULT 50,
    min_capacity numeric NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);
ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members (id);
ALTER TABLE public.groups ADD CONSTRAINT groups_id_fkey FOREIGN KEY (id) REFERENCES public.entities (id);
CREATE INDEX grp_name_idx ON public.groups(group_name);
CREATE INDEX grp_ref_idx ON public.groups(group_ref);

CREATE TABLE IF NOT EXISTS public.administrators(
    id UUID  PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
    admin_role public.admin_role NOT NULL DEFAULT 'sys_admin',
    admin_ref TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code('ADM'),
    user_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX adm_user_name_idx ON public.administrators(user_name);
CREATE INDEX adm_ref_idx ON public.administrators(admin_ref);


CREATE OR REPLACE FUNCTION public.validate_name_field(
    p_value TEXT,
    p_min_length INTEGER DEFAULT 2,
    p_max_length INTEGER DEFAULT NULL,
    p_field_name TEXT DEFAULT 'Field',
    p_allow_null BOOLEAN DEFAULT FALSE,
    p_pattern TEXT DEFAULT NULL,  -- Optional regex pattern
    p_transform TEXT DEFAULT 'UPPER',  -- Options: 'UPPER', 'LOWER', 'TRIM', 'NONE'
    p_is_email BOOLEAN DEFAULT FALSE  -- New parameter for email validation
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_processed_value TEXT;
    v_error_message TEXT;
    v_hint TEXT;
BEGIN
    -- Initial trim
    v_processed_value := TRIM(p_value);
    
    -- Null/empty check
    IF (v_processed_value IS NULL OR v_processed_value = '') THEN
        IF NOT p_allow_null THEN
            RAISE EXCEPTION '% cannot be empty or null', p_field_name
            USING ERRCODE = 'P0001', 
                  HINT = format('Please provide a valid %s', lower(p_field_name));
        END IF;
        RETURN NULL;
    END IF;
    
    -- Length validation
    IF LENGTH(v_processed_value) < p_min_length THEN
        RAISE EXCEPTION '% is too short (minimum %s characters)', p_field_name, p_min_length
        USING ERRCODE = 'P0001', 
              HINT = format('The %s must be at least %s characters long. Current length: %s', 
                          lower(p_field_name), p_min_length, LENGTH(v_processed_value));
    END IF;
    
    IF p_max_length IS NOT NULL AND LENGTH(v_processed_value) > p_max_length THEN
        RAISE EXCEPTION '% is too long (maximum %s characters)', p_field_name, p_max_length
        USING ERRCODE = 'P0001', 
              HINT = format('The %s must not exceed %s characters. Current length: %s', 
                          lower(p_field_name), p_max_length, LENGTH(v_processed_value));
    END IF;
    
    -- Email validation if requested
    IF p_is_email THEN
        -- Basic email validation pattern
        -- This pattern allows: username@domain.tld
        -- Username: letters, numbers, dots, underscores, hyphens
        -- Domain: letters, numbers, hyphens, dots
        -- TLD: at least 2 letters
        IF v_processed_value !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email address format%', p_field_name
            USING ERRCODE = 'P0001', 
                  HINT = format('Please provide a valid email address for %s', lower(p_field_name));
        END IF;
    END IF;
    
    -- Pattern validation if specified (only if not already validated as email)
    IF NOT p_is_email AND p_pattern IS NOT NULL AND v_processed_value !~* p_pattern THEN
        RAISE EXCEPTION '% contains invalid characters', p_field_name
        USING ERRCODE = 'P0001', 
              HINT = format('The %s must match pattern: %s', lower(p_field_name), p_pattern);
    END IF;
    
    -- Apply transformation
    CASE p_transform
        WHEN 'UPPER' THEN v_processed_value := UPPER(v_processed_value);
        WHEN 'LOWER' THEN v_processed_value := LOWER(v_processed_value);
        WHEN 'TRIM' THEN v_processed_value := TRIM(v_processed_value);
        WHEN 'NONE' THEN NULL; -- Keep as is
        ELSE v_processed_value := UPPER(v_processed_value); -- Default
    END CASE;
    
    RETURN v_processed_value;
END;
$$ ;

CREATE OR REPLACE FUNCTION public.create_system_entity(
    p_entity_name TEXT,
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE 
SET search_path = public, pg_catalog
AS $$
DECLARE 
v_system_entity_id UUID;
v_entity_name TEXT;
v_query_result jsonb;
v_hint TEXT;
BEGIN 
v_entity_name :=p_entity_name;
SELECT public.create_entity
(
    'system',
    v_entity_name,
    p_entity_status,
    '@system.ent'
) INTO v_query_result;
IF NOT (v_query_result->>'success'):: boolean THEN
   RETURN v_query_result;
END IF;
v_system_entity_id :=(v_query_result->'data'->>'id')::UUID;
RETURN public.build_response(
    true,
    jsonb_build_object('system_entity_id',v_system_entity_id)
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;

 WHEN OTHERS THEN 
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
 $$;


 CREATE OR REPLACE FUNCTION public.create_entity(
    p_entity_type TEXT,
    p_entity_name TEXT,
    p_entity_status TEXT DEFAULT 'active',
    p_postfix TEXT DEFAULT '@default.ent'
)
RETURNS jsonb 
LANGUAGE plpgsql
VOLATILE 
SET search_path = public, pg_catalog
AS $$
DECLARE 
    v_entity_id UUID;
    v_entity_type public.entity_type;
    v_entity_name TEXT;
    v_entity_status public.entity_status;
    v_hint TEXT;
BEGIN 
-- clean then validate the inputs
p_entity_status:=LOWER(TRIM(p_entity_status));
p_entity_type:=LOWER(TRIM(p_entity_type));

v_entity_name := public.validate_name_field(
    p_entity_name, 
    2, 
    100, 
    'Entity Name', 
    FALSE, 
    NULL, --regex ie '^[a-zA-Z0-9_]+$',Only letters, numbers, and underscore
    'NONE'  -- case
) || COALESCE(p_postfix,'');
IF NOT public.check_enum_fields(p_entity_type,NULL::public.entity_type)THEN 
RAISE EXCEPTION 'Entity Type Not Found:%',p_entity_type
USING ERRCODE='P0001',
HINT=format('The entity entered is not found in the available entities: %s',array_to_string(enum_range(NULL::public.entity_type)::TEXT[],', '));
END IF;
IF NOT public.check_enum_fields(p_entity_status,NULL::public.entity_status)THEN 
RAISE EXCEPTION 'Entity Status Not Found:%',p_entity_status
USING ERRCODE='P0001',
HINT=format('The entity status entered is not found in the available entities:%s',array_to_string(enum_range(NULL::public.entity_status)::TEXT[],', '));
END IF;

v_entity_type:=p_entity_type::public.entity_type;
v_entity_status:=p_entity_status::public.entity_status;
INSERT INTO public.entities(
    entity_type,
    entity_name,
    entity_status
) VALUES(
    v_entity_type,
    v_entity_name,
    v_entity_status
) 
RETURNING id INTO v_entity_id;
RETURN public.build_response(
    true,
    jsonb_build_object('id',v_entity_id)
);
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
   WHEN unique_violation THEN 
     RETURN public.build_response(
        false,
        NULL,
        'P0002',
        'The entity already Exists try another name or type',
        format('Entity %s OR/AND %s already exists',v_entity_type,v_entity_name)
     );
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;


CREATE OR REPLACE FUNCTION public.parse_boolean(
    p_value TEXT,
    p_raise_exception BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Check if input matches boolean pattern
    IF p_value ~* '^(true|false|t|f|yes|no|y|n|1|0)$' THEN
        -- Return actual boolean value
        RETURN CASE 
            WHEN lower(p_value) IN ('true', 't', 'yes', 'y', '1') THEN TRUE
            WHEN lower(p_value) IN ('false', 'f', 'no', 'n', '0') THEN FALSE
        END;
    END IF;
    -- Not a valid boolean
    IF p_raise_exception THEN
        RAISE EXCEPTION 'Invalid boolean field: %', p_value
        USING ERRCODE = 'P0001',
        HINT = 'is active field entered is not a valid boolean field. Try using true/false, yes/no, or 1/0';
    END IF;
    
    RETURN FALSE;
END;
$$ ;

CREATE OR REPLACE FUNCTION public.create_admin_entity(
    p_entity_name TEXT,
    p_admin_user_name TEXT,
    p_entity_status TEXT DEFAULT 'active',
    p_admin_role TEXT DEFAULT 'sys_admin',
    p_is_active TEXT DEFAULT 'true'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE 
SET search_path = public, pg_catalog
AS $$
DECLARE 
v_admin_entity_id UUID;
v_entity_name TEXT;
v_admin_user_name TEXT;
v_admin_role public.admin_role;
v_query_result jsonb;
v_is_active BOOLEAN;
v_hint TEXT;
BEGIN 

v_admin_user_name := public.validate_name_field(
    p_admin_user_name, 
    2, -- min chars
    100, --max chars
    'Admin user name', --name fiels
    FALSE, 
    NULL, --Only letters, numbers, and underscore
    'LOWER'  -- case lower case
);
v_entity_name := public.validate_name_field(
    p_entity_name, 
    2, -- min chars
    100, --max chars
    'Entity name', --name fiels
    FALSE, 
    NULL, --regex ie '^[a-zA-Z0-9_]+$',Only letters, numbers, and underscore
    'NONE'  -- case lower case
);
IF NOT public.check_enum_fields(p_admin_role,NULL::public.admin_role)THEN 
RAISE EXCEPTION 'Invalid role :%',p_admin_role
USING ERRCODE='P0001',
HINT=format('The admin role entered is not found in the available entities: %s',array_to_string(enum_range(NULL::public.admin_role)::TEXT[],', '));
END IF;
v_is_active:=public.parse_boolean(p_is_active,TRUE);
v_admin_role:=p_admin_role::public.admin_role;
SELECT public.create_entity
(
    'administrator',
    v_entity_name,
    p_entity_status,
    '@admin.ent'
) INTO v_query_result;
IF NOT (v_query_result->>'success'):: boolean THEN
   RETURN v_query_result;
END IF;
v_admin_entity_id :=(v_query_result->'data'->>'id')::UUID;
INSERT INTO public.administrators(
id,
admin_role,
user_name
)
VALUES 
(
    v_admin_entity_id,
    v_admin_role,
    v_admin_user_name
);
RETURN public.build_response(
    true,
    jsonb_build_object('admin_entity_id',v_admin_entity_id,
                              'user_name',v_admin_user_name,
                              'admin_role',v_admin_role,
                              'is_active',v_is_active)
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN unique_violation THEN 
RETURN public.build_response(
        false,
        NULL,
        'P0002',
        'Looks like a record with the user name exists try another user name',
        format('Administrator Entity with user name already exists %s',v_admin_user_name)
     );
 WHEN OTHERS THEN 
  RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
 $$;

CREATE OR REPLACE FUNCTION public.build_response(
    p_success BOOLEAN,
    p_data JSONB DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_message TEXT DEFAULT NULL,
    p_detail TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = finance, pg_catalog
AS $$
BEGIN
    IF p_success THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', COALESCE(p_data, '{}'::JSONB)
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error_code', p_error_code,
            'message', p_message,
            'detail', p_detail,
            'timestamp', CURRENT_TIMESTAMP
        );
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_auth_user(
    p_email TEXT
)
RETURNS jsonb 
LANGUAGE plpgsql
STABLE 
SET search_path = public, pg_catalog
AS $$
DECLARE
v_auth_id UUID;
v_user_email TEXT;
v_hint TEXT;
BEGIN 
v_user_email := public.validate_name_field(
    p_email, 
    2, -- min chars
    100, --max chars
    'User Email', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER',  -- case lower case
    TRUE-- validate Email
);
SELECT id INTO v_auth_id
FROM auth.users e 
WHERE e.email=v_user_email;
IF v_auth_id IS NULL THEN 
 RAISE EXCEPTION 'User with Email % is not found',v_user_email
USING ERRCODE='P0001',
HINT='Looks like we could not find the user requested ,mybe try requesting another';
ELSE
RETURN public.build_response(true,
                              jsonb_build_object('id',v_auth_id));
END IF;
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;


--- CREATE A HELPER FUNCTION TO CHECK AND GET THE CREATED BY FIELD
CREATE OR REPLACE FUNCTION public.check_field_existance(
    c_id UUID,
    p_schema TEXT,
    p_table TEXT
)
RETURNS jsonb 
IMMUTABLE
LANGUAGE plpgsql 
SET search_path = public, pg_catalog
AS $$ 
DECLARE 
v_created_by_id UUID;
v_query TEXT;
v_hint TEXT;
BEGIN 
v_query := format('SELECT id FROM %I.%I WHERE id = $1', p_schema, p_table);
EXECUTE v_query INTO v_created_by_id USING c_id;

IF  v_created_by_id IS NULL THEN 
RAISE EXCEPTION 'ID % does not exist in %.%',c_id,p_schema,p_table
USING ERRCODE='P0001',
HINT='The created requested resource does not exist try one that exists';
ELSE 
RETURN public.build_response(
    true,
    jsonb_build_object('id',v_created_by_id)
);
END IF ;
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_member_entity(
    p_auth_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_created_by UUID,
    p_member_currency TEXT,
    p_member_email TEXT DEFAULT NULL,
    p_is_active TEXT DEFAULT 'true',
    p_other_name TEXT DEFAULT NULL,
    p_date_of_register TIMESTAMPTZ DEFAULT NOW(),
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, finance, pg_catalog
AS $$
DECLARE
    v_result jsonb;
    v_entity_name TEXT;
    v_member_id UUID;
    v_auth_id UUID;
    v_member_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_created_by UUID;
    v_is_active BOOLEAN;
    v_other_name TEXT;
    v_date_of_register TIMESTAMPTZ;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_member_wallet_id UUID;
    v_member_wallet_name TEXT;
    v_system_entity_id UUID;
    v_member_personal_account_id UUID;
    v_member_personal_account_name TEXT;
    v_member_overdraft_account_id UUID;
    v_member_overdraft_account_name TEXT;
    v_wallet_access finance.wallet_access_level;
    v_on_boarding_message TEXT;
    v_notf_tags TEXT[];
    v_notification_title TEXT;
    v_hint TEXT;
BEGIN


v_first_name := public.validate_name_field(
    p_first_name, 
    2, -- min chars
    150, --max chars
    'First Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);

v_last_name := public.validate_name_field(
    p_last_name, 
    2, -- min chars
    150, --max chars
    'Last Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);
v_other_name:=NULL;
IF  p_other_name IS NOT NULL AND TRIM(p_other_name)!='' THEN
v_other_name := public.validate_name_field(
    p_other_name, 
    2, -- min chars
    150, --max chars
    'Other Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);
END IF;
v_member_email:=NULL;
IF p_member_email IS NOT NULL AND TRIM(p_member_email)!='' THEN
v_member_email := public.validate_name_field(
    p_member_email, 
    2, -- min chars
    150, --max chars
    'Member Email', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER',  -- case lower case
    TRUE
);
END IF;
v_is_active := public.parse_boolean(p_is_active,TRUE);
-- check is create by field if found 
SELECT public.check_field_existance(p_created_by,'public','entities')INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_created_by:=(v_result->'data'->>'id')::UUID;

SELECT public.check_field_existance(p_auth_id,'auth','users')INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_auth_id:=(v_result->'data'->>'id')::UUID;
--fetch the user id from auth
-- SELECT public.get_auth_user(p_member_email) INTO v_result;
-- IF NOT(v_result->>'success')::boolean THEN 
--         RAISE EXCEPTION '%', v_result->>'message'
--             USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
--                   HINT = v_result->>'detail';
-- END IF;
-- v_auth_id:=(v_result->'data'->>'id')::UUID;
-- clean data 
    -- v_member_email:=LOWER(TRIM(p_member_email));

    v_first_name:=LOWER(TRIM(p_first_name));
    v_last_name :=LOWER(TRIM(p_last_name));
    v_date_of_register:=COALESCE(p_date_of_register,NOW());
    v_entity_name:=format('%s %s',v_first_name,v_last_name);
    
    IF v_other_name IS NOT NULL THEN 
    v_entity_name:=format('%s %s',v_entity_name,v_other_name);
    END IF;
--if all is well proceed to creating the entity 
SELECT public.create_entity
(
    'member',
    v_entity_name,
    p_entity_status,
    '@user.ent'
) INTO v_result;
IF NOT (v_result->>'success'):: boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_member_id :=(v_result->'data'->>'id')::UUID;

---create a record in the member entity table
INSERT INTO public.members (
id,
auth_id,
first_name,
last_name,
other_name,
created_by,
email,
date_of_register,
is_active
)
values(
    v_member_id,
    v_auth_id,
    v_first_name,
    v_last_name,
    v_other_name,
    v_created_by,
    v_member_email,
    v_date_of_register,
    v_is_active

) ;

SELECT public.get_system_entity() INTO v_result;
        IF NOT (v_result->>'success')::boolean THEN
                    RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
        END IF;
v_system_entity_id := (v_result->'data'->>'id')::UUID;

 SELECT finance.create_account(
        p_acc_type := 'personal',
        p_owner_entity_id := v_member_id,
        p_currency_code := p_member_currency,
        p_created_by := v_system_entity_id,
        p_acc_status := 'active',
        p_acc_name := format('%s''s Personal Account',v_first_name),
        p_acc_description := format('An account created automatically for %s %s to handle personal finances',v_first_name,v_last_name),
        p_min_balance := 0,
        p_max_balance := 1000000,
        p_max_transfer_amount := 500000
    ) INTO v_result;
 IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
v_member_personal_account_id:=(v_result->'data'->>'id')::UUID;
v_member_personal_account_name:=(v_result->'data'->>'acc_name');
--create an overdraft account for the user 
SELECT finance.create_account(
        p_acc_type := 'overdraft',
        p_owner_entity_id := v_member_id,
        p_currency_code := p_member_currency,
        p_created_by := v_system_entity_id,
        p_acc_status := 'dormant',
        p_acc_name := format('%s''s Overdraft Account',v_first_name),
        p_acc_description := format('An account created automatically for %s %s to handle overdraft balances',v_first_name,v_last_name),
        p_min_balance := 0,
        p_max_balance := 0,
        p_max_transfer_amount := 0
) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_member_overdraft_account_id:=(v_result->'data'->>'id')::UUID;
v_member_overdraft_account_name:=(v_result->'data'->>'acc_name');

SELECT finance.create_wallet(
        p_wallet_name := format('%s''s Personal Wallet',v_first_name),
        p_owner_entity_id := v_member_id,
        p_wallet_status := 'active',
        p_wallet_type := 'personal',
        p_wallet_description := format('Wallet for %s %s', v_first_name , v_last_name)
) INTO v_result;

IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_member_wallet_id:=(v_result->'data'->>'id')::UUID;
v_member_wallet_name:=(v_result->'data'->>'wallet_name');
---Link the wallets and accounts :
SELECT finance.link_account_to_wallet(
        p_wallet_id := v_member_wallet_id,
        p_account_id := v_member_personal_account_id
) INTO v_result;

IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
SELECT finance.link_account_to_wallet(
        p_wallet_id := v_member_wallet_id,
        p_account_id := v_member_overdraft_account_id
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
   --Grant Wallet Access to member  
SELECT finance.grant_wallet_access(
        p_wallet_id := v_member_wallet_id,
        p_entity_id := v_member_id,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
v_wallet_access:=(v_result->'data'->>'access_level')::finance.wallet_access_level;
v_notification_title := 'Welcome to Trustloop!';
v_on_boarding_message := format(
'Hello %s,

Welcome to TrustLoop — we’re glad to have you onboard.

Your account has been successfully created. You now have:
- A Personal Account to manage your finances
- A Personal Wallet to organize and access your accounts

You can access your account here:
https://trustloop.com/accounts/%s

And your wallet here:
https://trustloop.com/wallets/%s

We’ve also sent a copy of your details to your email: %s

If this registration was not intended, please delete your account immediately:
https://trustloop.com/account-settings/#delete

For support, contact us at +254 777 333 7213.
— TrustLoop Team',
COALESCE(v_first_name, 'User'),
COALESCE(v_member_personal_account_id::text, ''),
COALESCE(v_member_wallet_id::text, ''),
COALESCE(v_member_email, '')
);
v_notf_tags := ARRAY['accounts', v_member_personal_account_name, v_member_wallet_name, 'onboarding'];

SELECT finance.create_accounting_notification(
        p_to_entity_id := v_member_id,
        p_notification_msg := v_on_boarding_message,
        p_notification_title := v_notification_title,
        p_tags := v_notf_tags,
        p_from_entity_id := v_system_entity_id,
        p_notification_type:='information'
) INTO v_result;
-- ill live with the assumption that notifications do not fail to avoid making it the cause of not registering a member
IF NOT (v_result->>'success')::boolean THEN -- but yk i can just let it go unnoticed
        ----RAISING AN ERROR for now until other wise
        RAISE EXCEPTION 'Notification creation failed: %', v_result->>'message'
        USING ERRCODE=v_result->>'error_code',
        HINT =v_result->>'detail';
    END IF;
RETURN public.build_response(
        true,
        jsonb_build_object(
        'member_entity_id',v_member_id,
        'first_name',v_first_name,
        'last_name',v_last_name,
        'other_name',v_other_name,
        'email',v_member_email,
        'created_by',v_created_by,
        'is_active',v_is_active,
        'created_at',v_date_of_register,
        'personal_account_id',v_member_personal_account_id,
        'personal_account_name',v_member_personal_account_name,
        'overdraft_account_id',v_member_overdraft_account_id,
        'overdraft_account_name',v_member_overdraft_account_name,
        'personal_wallet_id',v_member_wallet_id,
        'wallet_name',v_member_wallet_name,
        'wallet_access',v_wallet_access
        )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;

WHEN unique_violation THEN 
GET STACKED DIAGNOSTICS
v_constraint_name = CONSTRAINT_NAME,
v_detail = PG_EXCEPTION_DETAIL;

IF v_constraint_name = 'members_auth_id_key' THEN
 RETURN public.build_response(
                               false,
                               NULL,
                               'P0002',
                               'This user is already registered as a member. Each user can only have one member profile.',
                                format('Auth ID %s is already associated with a member account ,constraint error name %s', v_auth_id,v_constraint_name)
                               );
        ELSIF v_constraint_name = 'members_email_key' THEN
 RETURN public.build_response(
                               false,
                               NULL,
                               'P0002',
                               'A member with this email already exists. Please use a different email address.',
                                format('Email %s is already registered, constraint name %s', v_member_email,v_constraint_name)
                               );
        ELSIF v_constraint_name = 'members_pkey' THEN
 RETURN public.build_response(
                               false,
                               NULL,
                               'P0002',
                               'Member ID conflict. This is a system error, please contact support.',
                                format('Member ID %s already exists %s', v_member_id,v_constraint_name)
                               );
        ELSE
-- Ill have Generic duplicate error for other constraints
 RETURN public.build_response(
                               false,
                               NULL,
                               'P0002',
                               format('A duplicate record was detected. Check the names ( %s %s %s ) or add other name to make them unique.',v_first_name ,v_last_name,COALESCE(v_other_name, '')),
                               v_detail || v_constraint_name
                             );
        END IF;
WHEN OTHERS THEN 
  RETURN public.build_response(
                               false,
                               NULL,
                               'P0003',
                               'an unexpected error occured check logs to see more details',
                                SQLERRM
                             );
END;
$$;



---------------------------------NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.get_system_entity()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_system_entity RECORD;
    v_hint TEXT;
BEGIN
    -- Get the system entity (only one exists due to unique index)
    SELECT id, entity_name, entity_ref, entity_status
    INTO v_system_entity
    FROM public.entities
    WHERE entity_type = 'system'
    LIMIT 1;
    
IF v_system_entity IS NULL THEN
RAISE EXCEPTION 'system entity not found'
USING ERRCODE='P0001',
HINT='System Entity Not Found';
END IF;
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'id', v_system_entity.id,
            'entity_name', v_system_entity.entity_name,
            'entity_ref', v_system_entity.entity_ref,
            'entity_status', v_system_entity.entity_status
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 WHEN OTHERS THEN 
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
$$;


CREATE OR REPLACE FUNCTION public.create_group_entity(
    p_group_name TEXT,
    p_created_by UUID,                     -- reference to member entity ID
    p_currency_code TEXT,
    p_is_active TEXT DEFAULT 'true',
    p_group_description TEXT DEFAULT NULL,
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = public,finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_entity_id UUID;
    v_group_name TEXT;
    v_group_description TEXT;
    v_created_by_member_id UUID;
    v_created_by_entity_id UUID;           -- member's entity ID
    v_is_active BOOLEAN;
    v_system_entity_id UUID;
    v_group_account_id UUID;
    v_group_account_name TEXT;
    v_overdraft_account_id UUID;
    v_overdraft_account_name TEXT;
    v_wallet_id UUID;
    v_wallet_name TEXT;
    v_wallet_access_level TEXT;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
v_group_name := public.validate_name_field(
    p_group_name, 
    2, -- min chars
    150, --max chars
    'Group Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_is_active := public.parse_boolean(p_is_active,TRUE);
v_group_description := COALESCE(TRIM(p_group_description), '');

    -- 2. Validate created_by exists in members table
    SELECT public.check_field_existance(p_created_by, 'public', 'members') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_created_by_member_id := (v_result->'data'->>'id')::UUID;

    -- Also need the member's entity ID (same as member id, because members.id = entities.id)
    v_created_by_entity_id := v_created_by_member_id;

    -- 3. Create entity (type = 'group')
    SELECT public.create_entity(
        'group',
        v_group_name,
        p_entity_status,
        '@group.ent'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_entity_id := (v_result->'data'->>'id')::UUID;

    -- 4. Insert into groups table
    INSERT INTO public.groups (
        id, group_name, group_description, created_by, is_active
    ) VALUES (
        v_entity_id, v_group_name, v_group_description, v_created_by_member_id, v_is_active
    );

    -- 5. Get system entity ID for created_by in accounts/wallet
    SELECT public.get_system_entity() INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_system_entity_id := (v_result->'data'->>'id')::UUID;

    -- 6. Create group account (acc_type = 'group')
    SELECT finance.create_account(
        p_acc_type := 'group',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'active',
        p_acc_name := format('%s Group Account',v_group_name),
        p_acc_description := format('Main operating account for group %s',v_group_name),
        p_min_balance := 0,
        p_max_balance := 1000000,
        p_max_transfer_amount := 500000
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_group_account_id := (v_result->'data'->>'id')::UUID;
    v_group_account_name := (v_result->'data'->>'acc_name');

    -- 7. Create overdraft account for the group
    SELECT finance.create_account(
        p_acc_type := 'overdraft',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'dormant',
        p_acc_name := format('%s  Overdraft Account',v_group_name ),
        p_acc_description := format('Overdraft facility for group %s' , v_group_name),
        p_min_balance := 0,
        p_max_balance := 0,
        p_max_transfer_amount := 0
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_overdraft_account_id := (v_result->'data'->>'id')::UUID;
    v_overdraft_account_name := (v_result->'data'->>'acc_name');

    -- 8. Create group wallet (type = 'group')
    SELECT finance.create_wallet(
        p_wallet_name := format('%s  Group Wallet',v_group_name),
        p_owner_entity_id := v_entity_id,
        p_wallet_status := 'active',
        p_wallet_type := 'group',
        p_wallet_description := format('Wallet for group ', v_group_name)
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_id := (v_result->'data'->>'id')::UUID;
    v_wallet_name := (v_result->'data'->>'wallet_name');

    -- 9. Link accounts to wallet
    SELECT finance.link_account_to_wallet(v_wallet_id, v_group_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN 
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
    END IF;

    SELECT finance.link_account_to_wallet(v_wallet_id, v_overdraft_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
             RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
     END IF;

    -- 10. Grant wallet access to the creator (the member)
    SELECT finance.grant_wallet_access(
        p_wallet_id := v_wallet_id,
        p_entity_id := v_created_by_entity_id,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_access_level := (v_result->'data'->>'access_level')::finance.wallet_access_level;

    -- 12. Return success response
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'group_entity_id', v_entity_id,
            'group_name', v_group_name,
            'group_description', v_group_description,
            'created_by', v_created_by_member_id,
            'is_active', v_is_active,
            'group_account_id', v_group_account_id,
            'group_account_name', v_group_account_name,
            'overdraft_account_id', v_overdraft_account_id,
            'overdraft_account_name', v_overdraft_account_name,
            'wallet_id', v_wallet_id,
            'wallet_name', v_wallet_name,
            'wallet_access_level', v_wallet_access_level
        )
    );

EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME, v_detail = PG_EXCEPTION_DETAIL;
        -- IF v_constraint_name = 'groups_group_name_key' THEN
        --     RETURN public.build_response(
        --         false, NULL, 'P0002',
        --         'Group name already exists',
        --         format('Name %s already used', v_group_name)
        --     );
       
        IF v_constraint_name = 'groups_group_ref_key' THEN
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Group reference already exists',
                v_detail
            );
        ELSE
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Duplicate group record',
                v_detail
            );
        END IF;
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_entity(
    p_org_name TEXT,
    p_created_by UUID,                     -- reference to member entity ID
    p_currency_code TEXT,
    p_is_active TEXT DEFAULT 'true',
    p_org_description TEXT DEFAULT NULL,
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = public, finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_entity_id UUID;
    v_org_name TEXT;
    v_org_description TEXT;
    v_created_by_member_id UUID;
    v_created_by_entity_id UUID;
    v_is_active BOOLEAN;
    v_system_entity_id UUID;
    v_org_account_id UUID;
    v_org_account_name TEXT;
    v_overdraft_account_id UUID;
    v_overdraft_account_name TEXT;
    v_wallet_id UUID;
    v_wallet_name TEXT;
    v_wallet_access_level TEXT;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
v_org_name := public.validate_name_field(
    p_org_name, 
    2, -- min chars
    150, --max chars
    'Organization Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_is_active := public.parse_boolean(p_is_active,TRUE);
v_org_description := COALESCE(TRIM(p_org_description), '');

    -- Validate created_by exists in members
    SELECT public.check_field_existance(p_created_by, 'public', 'members') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_created_by_member_id := (v_result->'data'->>'id')::UUID;
    v_created_by_entity_id := v_created_by_member_id;

    -- Create entity (type = 'organization')
    SELECT public.create_entity(
        'organization',
        v_org_name,
        p_entity_status,
        '@org.ent'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_entity_id := (v_result->'data'->>'id')::UUID;

    -- Insert into organizations table
    INSERT INTO public.organizations (
        id, org_name, org_description, created_by, is_active
    ) VALUES (
        v_entity_id, v_org_name, v_org_description, v_created_by_member_id, v_is_active
    );

    -- Get system entity
    SELECT public.get_system_entity() INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_system_entity_id := (v_result->'data'->>'id')::UUID;

    -- Create organization account (acc_type = 'organization')
    SELECT finance.create_account(
        p_acc_type := 'organization',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'active',
        p_acc_name :=format('%s Organization Account' ,v_org_name),
        p_acc_description := format('Main operating account for organization %s' , v_org_name),
        p_min_balance := 0,
        p_max_balance := 10000000,
        p_max_transfer_amount := 1000000
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_org_account_id := (v_result->'data'->>'id')::UUID;
    v_org_account_name := (v_result->'data'->>'acc_name');

    -- Create overdraft account
    SELECT finance.create_account(
        p_acc_type := 'overdraft',
        p_owner_entity_id := v_entity_id,
        p_currency_code := p_currency_code,
        p_created_by := v_system_entity_id,
        p_acc_status := 'dormant',
        p_acc_name := fomart('%s  Overdraft Account',v_org_name),
        p_acc_description := format('Overdraft facility for organization %s' , v_org_name),
        p_min_balance := 0,
        p_max_balance := 0,
        p_max_transfer_amount := 0
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_overdraft_account_id := (v_result->'data'->>'id')::UUID;
    v_overdraft_account_name := (v_result->'data'->>'acc_name');

    -- Create organization wallet (type = 'organization')
    SELECT finance.create_wallet(
        p_wallet_name := format('%s  Organization Wallet',v_org_name ),
        p_owner_entity_id := v_entity_id,
        p_wallet_status := 'active',
        p_wallet_type := 'organization',
        p_wallet_description := format('Wallet for organization %s' ,v_org_name)
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_id := (v_result->'data'->>'id')::UUID;
    v_wallet_name := (v_result->'data'->>'wallet_name');

    -- Link accounts
    SELECT finance.link_account_to_wallet(v_wallet_id, v_org_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN 
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
    END IF;

    SELECT finance.link_account_to_wallet(v_wallet_id, v_overdraft_account_id) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
             RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail'; 
     END IF;

    -- Grant access to creator
    SELECT finance.grant_wallet_access(
        p_wallet_id := v_wallet_id,
        p_entity_id := v_created_by_entity_id,
        p_granted_by := v_system_entity_id,
        p_access_level := 'manage'
    ) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_access_level := (v_result->'data'->>'access_level')::finance.wallet_access_level;

    -- Return success
    RETURN public.build_response(
        true,
        jsonb_build_object(
            'organization_entity_id', v_entity_id,
            'org_name', v_org_name,
            'org_description', v_org_description,
            'created_by', v_created_by_member_id,
            'is_active', v_is_active,
            'organization_account_id', v_org_account_id,
            'organization_account_name', v_org_account_name,
            'overdraft_account_id', v_overdraft_account_id,
            'overdraft_account_name', v_overdraft_account_name,
            'wallet_id', v_wallet_id,
            'wallet_name', v_wallet_name,
            'wallet_access_level', v_wallet_access_level
        )
    );

EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN public.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME, v_detail = PG_EXCEPTION_DETAIL;
        IF v_constraint_name = 'organizations_org_name_key' THEN
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Organization name already exists',
                format('Name %s already used', v_org_name)
            );
        ELSIF v_constraint_name = 'organizations_org_ref_key' THEN
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Organization reference already exists',
                v_detail
            );
        ELSE
            RETURN public.build_response(
                false, NULL, 'P0002',
                'Duplicate organization record',
                v_detail
            );
        END IF;
    WHEN OTHERS THEN
 RETURN public.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.check_admin_entity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
   IF NOT EXISTS(
    SELECT 1 FROM public.entities e
    WHERE e.id =NEW.id 
    AND e.entity_type IN('administrator')
   ) 
   THEN 
   RAISE EXCEPTION 'Invalid Entity Type: does not allow any other type for administrator'
    USING 
    ERRCODE = 'P0001', 
    HINT = 'The admin entity must be of administrator type not any other';
  END IF;
  RETURN NEW;
END;
$$ ;
CREATE OR REPLACE FUNCTION public.check_member_created_by()
RETURNS trigger
LANGUAGE plpgsql 
SET search_path = public, pg_catalog
AS $$
BEGIN
   IF NOT EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id=NEW.created_by 
    AND e.entity_type IN('system','administrator')
    )
    THEN
    RAISE EXCEPTION 'Invalid creator type: only system or administrator allowed'
    USING 
    ERRCODE = 'P0001', 
    HINT = 'created_by must reference an entity of type system or administrator';
   END IF ;
   RETURN NEW ;
END;
$$ ;
CREATE TRIGGER trg_validate_member_creation
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW 
EXECUTE FUNCTION public.check_member_created_by();

CREATE TRIGGER trg_validate_admin_entity
BEFORE INSERT OR UPDATE ON public.administrators
FOR EACH ROW 
EXECUTE FUNCTION public.check_admin_entity();


CREATE OR REPLACE FUNCTION public.handle_new_member()
RETURNS trigger AS $$
DECLARE 
   v_system_entity_id UUID;
   v_result jsonb;
   v_first_name text := new.raw_user_meta_data ->> 'first_name';
   v_last_name text := new.raw_user_meta_data ->> 'last_name';
BEGIN 
   -- 1. Get system entity
   SELECT public.get_system_entity() INTO v_result;
   IF NOT (v_result ->> 'success')::boolean THEN 
      RAISE EXCEPTION '%', v_result ->> 'message' 
         USING ERRCODE = COALESCE(v_result ->> 'error_code', 'P0001'),
               HINT = v_result ->> 'detail';
   END IF;
   v_system_entity_id := (v_result -> 'data' ->> 'id')::UUID;

   -- 2. Create the member entity **and check the result**
   SELECT public.create_member_entity(
      p_auth_id          := new.id,
      p_member_email     := new.email,
      p_first_name       := v_first_name,
      p_last_name        := v_last_name,
      p_created_by       := v_system_entity_id,
      p_member_currency  := 'KES'
   ) INTO v_result;

   IF NOT (v_result ->> 'success')::boolean THEN
      RAISE EXCEPTION '%', v_result ->> 'message'
         USING ERRCODE = COALESCE(v_result ->> 'error_code', 'P0001'),
               HINT = v_result ->> 'detail';
   END IF;

   RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  CREATE OR REPLACE TRIGGER on_auth_member_created 
  after insert on auth.users 
  for each row execute procedure public.handle_new_member();


CREATE OR REPLACE FUNCTION public.get_member_entity(p_auth_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER   
SET search_path = ''  
AS $$
DECLARE
    v_member_record RECORD;
BEGIN
    SELECT id, member_ref, auth_id, first_name, last_name, date_of_register, is_active
    INTO v_member_record
    FROM public.members
    WHERE auth_id = p_auth_id AND is_active = true;

    IF v_member_record IS NULL THEN
        RETURN public.build_response(
            false,
            NULL,
            'P0001',
            'Member not found',
            'No active member with that auth ID.'
        );
    ELSE
        RETURN public.build_response(
            true,
            jsonb_build_object(
                'id', v_member_record.id,
                'member_ref', v_member_record.member_ref,
                'auth_id', v_member_record.auth_id,
                'first_name', v_member_record.first_name,
                'last_name', v_member_record.last_name,
                'date_of_register', v_member_record.date_of_register,
                'is_active', v_member_record.is_active
            )
        );
    END IF;
END;
$$;


GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;