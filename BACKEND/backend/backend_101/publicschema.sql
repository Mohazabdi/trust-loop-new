 CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.admin_role AS ENUM ('sys_admin', 'accountant', 'dev', 'manager', 'employee', 'gov_off');
CREATE TYPE public.entity_status AS ENUM ('active', 'deleted', 'dormant', 'suspended');
CREATE TYPE public.entity_type AS ENUM ('group', 'organization', 'administrator', 'member', 'system');
CREATE TYPE public.gender AS ENUM ('male', 'female', 'prefer_not_to_say');
CREATE TYPE public.group_status AS ENUM ('active', 'dormant', 'deleted');
CREATE TYPE public.group_visibility AS ENUM ('public', 'private');
CREATE TYPE public.verification_status AS ENUM ('not_verified', 'verified');

CREATE SEQUENCE IF NOT EXISTS public.default_ref_seq START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 CYCLE;

-- Table: ref_prefixes
CREATE TABLE IF NOT EXISTS public.ref_prefixes (
    prefix text NOT NULL,
    pref_description text,
    is_active bool DEFAULT true,
    current_seq_value int8 NOT NULL DEFAULT 0,
    current_period text NOT NULL DEFAULT to_char((CURRENT_DATE)::timestamp with time zone, 'MMYYDD'::text),
    last_reset_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (prefix)
);

CREATE OR REPLACE FUNCTION public.gen_ref_code(p_prefix text, p_period text DEFAULT to_char((CURRENT_DATE)::timestamp with time zone, 'MMYYDD'::text))
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;


-- Table: administrators
CREATE TABLE IF NOT EXISTS public.administrators (
    id uuid NOT NULL,
    admin_role admin_role NOT NULL DEFAULT 'sys_admin'::admin_role,
    admin_ref text NOT NULL DEFAULT gen_ref_code('ADM'::text),
    user_name text NOT NULL,
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: entities
CREATE TABLE IF NOT EXISTS public.entities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type entity_type NOT NULL DEFAULT 'member'::entity_type,
    entity_name text NOT NULL,
    entity_ref text NOT NULL DEFAULT gen_ref_code('ENT'::text),
    entity_status entity_status NOT NULL DEFAULT 'dormant'::entity_status,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: groups
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

-- Table: members
CREATE TABLE IF NOT EXISTS public.members (
    id uuid NOT NULL,
    member_ref text NOT NULL DEFAULT gen_ref_code('MBR'::text),
    auth_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    other_name text,
    created_by uuid NOT NULL,
    email text NOT NULL,
    primary_phone text NOT NULL,
    secondary_phone text,
    date_of_birth timestamptz,
    gender gender NOT NULL DEFAULT 'prefer_not_to_say'::gender,
    national_id text,
    verification_status verification_status NOT NULL DEFAULT 'not_verified'::verification_status,
    cover_photo_url text,
    display_photo_url text,
    about text,
    date_of_register timestamptz NOT NULL DEFAULT now(),
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Table: organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid NOT NULL,
    org_name text NOT NULL,
    org_ref text NOT NULL DEFAULT gen_ref_code('ORG'::text),
    org_description text,
    created_by uuid,
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members (id);
ALTER TABLE public.groups ADD CONSTRAINT groups_id_fkey FOREIGN KEY (id) REFERENCES public.entities (id);
ALTER TABLE public.administrators ADD CONSTRAINT administrators_id_fkey FOREIGN KEY (id) REFERENCES public.entities (id);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members (id);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_id_fkey FOREIGN KEY (id) REFERENCES public.entities (id);
ALTER TABLE public.members ADD CONSTRAINT members_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.entities (id);
ALTER TABLE public.members ADD CONSTRAINT members_id_fkey FOREIGN KEY (id) REFERENCES public.entities (id);
 
 -- add this later or separate out
 ALTER TABLE public.members ADD CONSTRAINT members_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES public.auths (id);
