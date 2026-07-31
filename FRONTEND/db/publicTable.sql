--DROP THE SCHEMA IF IT EXISTS AND RECREATE IT AS A WHOLE NEW SCHEMA
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

SET search_path TO public, public;
-- run the functions first in the corresponding functions file ill provide 
--THE ENUM TYPES HERE

CREATE TYPE public.group_type_status AS ENUM(
    'active',
    'dormant'
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
CREATE TYPE public.gender AS ENUM(
    'male',
    'female',
    'prefer_not_to_say'
);
CREATE TYPE public.verification_status AS ENUM(
'not_verified',
'verified'
);
--SET search_path TO public;
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
CREATE OR REPLACE FUNCTION public.gen_color()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
    colors TEXT[] := ARRAY[
        '#964d4d',
        '#96744d',
        '#8f964d',
        '#d3b07c',
        '#6e964d',
        '#4d9678',
        '#4d8d96',
        '#5a4d96',
        '#944d96',
        '#964d5f',
        '#b98989',
        '#7b71d8',
        '#2f9226',
        '#15e4ff',
        '#e2e045',
        '#eb3e3e',
        '#e644d0',
        '#616161'
    ];
BEGIN
    RETURN colors[1 + floor(random() * array_length(colors, 1))::int];
END;
$$ ;

---- THE CREATE FUNCTIONS AND THEIR HELPERS
--1. CREATE ENTITY FUNCTION
--HELPER FUNCTION TO HELP CHECK ENTITY TYPES
SET search_path TO public;
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
-- CODE GENERATOR FUNCTION OVER HERE
-- this feels like an overkill but we need to control the prefixes we use not just any prefix goes we need some standard way of doing our things
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

-- The Entity Layer
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
email TEXT UNIQUE NOT NULL,
primary_phone TEXT NOT NULL UNIQUE,
secondary_phone TEXT UNIQUE,
date_of_birth TIMESTAMPTZ,
gender public.gender DEFAULT 'prefer_not_to_say' NOT NULL,
national_id TEXT UNIQUE ,
verification_status public.verification_status DEFAULT 'not_verified' NOT NULL,
cover_photo_url TEXT ,
display_photo_url TEXT,
about TEXT,
date_of_register TIMESTAMPTZ NOT NULL DEFAULT now(),
member_status public.member_status NOT NULL DEFAULT 'active',
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
CREATE TYPE public.group_visibility AS ENUM(
    'public',
    'private'
);
CREATE TYPE public.group_status AS ENUM (
'active',
'dormant',
'deleted'

);
CREATE TYPE public.member_status AS ENUM (
'active',
'dormant',
'deleted'

);

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
CREATE TABLE IF NOT EXISTS public.group_type(
    type_name TEXT PRIMARY KEY,
    type_description TEXT,
    type_status public.group_type_status NOT NULL DEFAULT 'active',--ENUM
    nick_name TEXT,
    group_type_code TEXT UNIQUE NOT NULL DEFAULT public.gen_ref_code('GTC') ,
    created_by UUID NOT NULL REFERENCES public.administrators(id) ON DELETE RESTRICT, -- REFERENCE PUBLIC.ADMINISTRATORS
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX group_type_created_by_idx ON public.group_type(created_by);
CREATE INDEX group_type_group_type_code_idx ON public.group_type(group_type_code);

CREATE TABLE IF NOT EXISTS public.groups(
    id UUID  PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL  ,
    group_ref TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code('GRP'),
    group_description TEXT ,
    group_type TEXT NOT NULL REFERENCES public.group_type(type_name) ON DELETE RESTRICT,
    group_visibility public.group_visibility DEFAULT 'private' NOT NULL,
    created_by UUID   REFERENCES public.members(id) ON DELETE SET NULL,
    group_status public.group_status  NOT NULL DEFAULT 'active',
    group_cover_photo_url TEXT,
    group_display_photo_url TEXT,
    max_capacity NUMERIC CHECK(max_capacity>0)NOT NULL DEFAULT 50,
    min_capacity NUMERIC CHECK (min_capacity<=max_capacity) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX grp_name_idx ON public.groups(group_name);
CREATE INDEX grp_ref_idx ON public.groups(group_ref);

---------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------


