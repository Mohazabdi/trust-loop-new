-- THE SCHEMA CREATION HERE 
-- -- uncomment this part to run the 
DROP SCHEMA IF EXISTS finance CASCADE;
CREATE SCHEMA finance;
-- Ensure extension is in a safe schema
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
-- Optional: set default for this session
SET search_path TO finance, public;
-- run the functions first in the corresponding functions file ill provide 
--THE ENUM TYPES HERE
CREATE TYPE finance.entity_type AS ENUM(
'group',
'organization',
'administrator',
'member',
'system'
);
CREATE TYPE finance.entity_status AS ENUM (
    'active',
    'deleted', -- for soft delete ,avoiding inconsistencies for financial layer
    'dormant',
    'suspended'
);
CREATE TYPE finance.admin_role AS ENUM (
    'sys_admin',
    'accountant',
    'dev',
    'manager',
    'employee',
    'gov_off'
);
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
    'bank',
    'mobile_money'
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
--SET search_path TO finance;
CREATE SEQUENCE IF NOT EXISTS finance.default_ref_seq 
       START 1
       INCREMENT BY 1
       MINVALUE 1
       MAXVALUE 999999
       CYCLE ;
CREATE OR REPLACE FUNCTION finance.gen_ref_code(
    p_prefix TEXT,
    p_period TEXT DEFAULT to_char(CURRENT_DATE,'MMYYDD')
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE 
SET search_path = finance, pg_catalog
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

   UPDATE finance.ref_prefixes 
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
CREATE OR REPLACE FUNCTION finance.gen_color()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
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
SET search_path TO finance;
CREATE OR REPLACE FUNCTION finance.check_enum_fields(
    value TEXT,
     enum_type anyelement
)
RETURNS boolean 
IMMUTABLE
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
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
CREATE TABLE IF NOT EXISTS finance.ref_prefixes(
    prefix TEXT PRIMARY KEY CHECK (prefix ~ '^[A-Z]{2,5}'),
    pref_description TEXT,
    is_active BOOLEAN DEFAULT true,
    current_seq_value BIGINT NOT NULL DEFAULT 0,
    current_period TEXT NOT NULL DEFAULT to_char(CURRENT_DATE,'MMYYDD'),
    last_reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ref_prefix_is_active_idx ON finance.ref_prefixes(is_active);

-- The Entity Layer
CREATE TABLE IF NOT EXISTS finance.entities(
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
entity_type finance.entity_type NOT NULL DEFAULT 'member',
entity_name  TEXT UNIQUE NOT NULL,--will consider making it unique
entity_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('ENT'),
entity_status finance.entity_status NOT NULL DEFAULT 'dormant',
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_one_sys_entity
ON finance.entities (entity_type)
WHERE entity_type='system';
CREATE INDEX entity_ref_idx ON finance.entities(entity_ref);

CREATE TABLE IF NOT EXISTS finance.members(
id UUID PRIMARY KEY REFERENCES finance.entities(id) ON DELETE CASCADE,
member_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('MBR'),
auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
other_name TEXT,
created_by  UUID NOT NULL   REFERENCES finance.entities(id) ON DELETE CASCADE,
email TEXT UNIQUE NOT NULL,
date_of_register TIMESTAMPTZ NOT NULL DEFAULT now(),
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE(first_name,last_name,other_name)
);
CREATE INDEX members_ref_idx ON finance.members(member_ref);
CREATE INDEX members_auth_idx ON finance.members(auth_id);
CREATE INDEX members_email_idx ON finance.members(email);

CREATE TABLE IF NOT EXISTS finance.organizations(
    id UUID  PRIMARY KEY REFERENCES finance.entities(id) ON DELETE CASCADE, 
    org_name TEXT NOT NULL UNIQUE,
    org_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('ORG'),
    org_description TEXT,
    created_by UUID   REFERENCES finance.members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_ref_idx ON finance.organizations(org_ref);
CREATE INDEX org_name_idx ON finance.organizations(org_name);

CREATE TABLE IF NOT EXISTS finance.groups(
    id UUID  PRIMARY KEY REFERENCES finance.entities(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL  ,
    group_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('GRP'),
    group_description TEXT ,
    created_by UUID   REFERENCES finance.members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX grp_name_idx ON finance.groups(group_name);
CREATE INDEX grp_ref_idx ON finance.groups(group_ref);

CREATE TABLE IF NOT EXISTS finance.administrators(
    id UUID  PRIMARY KEY REFERENCES finance.entities(id) ON DELETE CASCADE,
    admin_role finance.admin_role NOT NULL DEFAULT 'sys_admin',
    admin_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('ADM'),
    user_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX adm_user_name_idx ON finance.administrators(user_name);
CREATE INDEX adm_ref_idx ON finance.administrators(admin_ref);
---------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
--The Financial Layer 
-- The Accounts Sub Layer
CREATE TABLE IF NOT EXISTS finance.currencies(
    CODE TEXT PRIMARY KEY,
    numeric_code  SMALLINT UNIQUE,
    curr_name TEXT UNIQUE NOT NULL,
    symbol TEXT,
    no_of_decimals NUMERIC DEFAULT 2 CHECK(no_of_decimals>=0),
    is_active BOOLEAN DEFAULT true,
    created_by UUID    REFERENCES finance.administrators(id) ON DELETE SET NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX curr_name_idx ON finance.currencies(curr_name);
CREATE INDEX curr_symbol_idx ON finance.currencies(symbol);
CREATE INDEX curr_numeric_code_idx ON finance.currencies(numeric_code);
CREATE TABLE IF NOT EXISTS finance.accounts(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acc_number TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('ACC'),
    acc_name TEXT NOT NULL DEFAULT 'Entity Personal Account',
    acc_type finance.acc_type NOT NULL DEFAULT 'personal',
    owner_entity_id UUID NOT NULL   REFERENCES finance.entities(id) ON DELETE RESTRICT,
    acc_status finance.acc_status NOT NULL DEFAULT 'dormant',
    acc_currency TEXT NOT NULL   REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    acc_description TEXT,
    overdraft_limit NUMERIC NOT NULL DEFAULT 0 CHECK(overdraft_limit>=0),
    min_balance NUMERIC NOT NULL DEFAULT 0 CHECK(min_balance>=0),
    max_balance NUMERIC NOT NULL DEFAULT 0 CHECK(max_balance>=min_balance),
    max_transfer_amount NUMERIC NOT NULL DEFAULT 1000000,
    min_transfer_amount NUMERIC NOT NULL DEFAULT 0 CHECK(min_transfer_amount<=max_transfer_amount),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ CHECK(closed_at>=opened_at),
    created_by UUID NOT NULL   REFERENCES finance.entities(id) ON DELETE RESTRICT,
    -- The balances are cached only for quick access, balances used during transactions are recomputed from ledger entries
    current_balance  NUMERIC NOT NULL DEFAULT 0,
    available_balance NUMERIC NOT NULL DEFAULT 0,
    hold_balance NUMERIC NOT NULL DEFAULT 0 CHECK(hold_balance>=0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(acc_name,owner_entity_id),
   CONSTRAINT valid_balances CHECK (
    available_balance = (current_balance - hold_balance)
    AND (
        (available_balance >= (overdraft_limit * -1) AND available_balance<=max_balance)
        OR acc_type IN ('sys_clearing', 'sys_fee_income', 'sys_revenue', 'sys_settlement')
    )
)
);
CREATE UNIQUE INDEX one_personal_overdraft_entity_acc
    ON finance.accounts(owner_entity_id,acc_type)
    WHERE acc_type IN('personal','overdraft');
CREATE UNIQUE INDEX unique_sys_acc_type
    ON finance.accounts(acc_type)
    WHERE acc_type IN('sys_revenue','sys_clearing','sys_fee_income','sys_settlement');

CREATE INDEX acc_acc_no_idx ON finance.accounts(acc_number);
CREATE INDEX acc_acc_owner_idx ON finance.accounts(owner_entity_id);
CREATE INDEX acc_acc_currency_idx ON finance.accounts(acc_currency);
CREATE INDEX acc_created_by_idx ON finance.accounts(created_by);

CREATE TABLE IF NOT EXISTS finance.providors(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    providor_name TEXT UNIQUE NOT NULL,
    providor_description TEXT,
    providor_logo TEXT,
    providor_ref TEXT UNIQUE NOT NULL DEFAULT finance.gen_ref_code('PRV'),
    providor_type finance.providor_type NOT NULL,
    providor_acc_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    providor_status finance.providor_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prov_providor_name ON finance.providors(providor_name);
CREATE INDEX prov_providor_ref ON finance.providors(providor_ref);
CREATE INDEX prov_providor_acc_id ON finance.providors(providor_acc_id);
CREATE TABLE IF NOT EXISTS finance.transaction_categories(
    cat_name TEXT PRIMARY KEY,
    cat_description TEXT,
    providor_id UUID NOT NULL REFERENCES finance.providors(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID    REFERENCES finance.entities(id) ON DELETE SET NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cat_name_idx ON finance.transaction_categories(cat_name);
CREATE INDEX providor_id_trans_cat_idx ON finance.transaction_categories(providor_id);



CREATE TABLE IF NOT EXISTS finance.wallets(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_name TEXT NOT NULL UNIQUE,
    wallet_number TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('WLT'),
    owner_entity_id  UUID NOT NULL   REFERENCES finance.entities(id) ON DELETE CASCADE,
    wallet_type finance.wallet_type NOT NULL DEFAULT 'personal',
    wallet_description TEXT DEFAULT 'entity wallet',
    wallet_status finance.wallet_status NOT NULL DEFAULT 'dormant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wlt_wlt_name_idx ON finance.wallets(wallet_name);
CREATE INDEX wlt_wlt_no_idx ON finance.wallets(wallet_number);
CREATE INDEX wlt_wlt_owner_idx ON finance.wallets(owner_entity_id);

CREATE TABLE IF NOT EXISTS finance.wallet_accounts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id  UUID NOT NULL   REFERENCES finance.wallets(id) ON DELETE CASCADE,
  acc_id  UUID NOT NULL   REFERENCES finance.accounts(id) ON DELETE CASCADE,
  color_tag TEXT DEFAULT finance.gen_color(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_id,acc_id)
);

CREATE INDEX wlt_acc_wlt_id_idx ON finance.wallet_accounts(wallet_id);
CREATE INDEX wlt_acc_acc_id_idx ON finance.wallet_accounts(acc_id);

CREATE TABLE IF NOT EXISTS finance.wallet_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES finance.wallets(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES finance.entities(id) ON DELETE CASCADE,
    access_level finance.wallet_access_level NOT NULL DEFAULT 'view',
    granted_by UUID REFERENCES finance.entities(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(wallet_id, entity_id)
);

CREATE INDEX idx_wallet_access_wallet ON finance.wallet_access(wallet_id);
CREATE INDEX idx_wallet_access_entity ON finance.wallet_access(entity_id);

----------------------------------------------------------------------------------------------------
--The Transaction sub layer

CREATE TABLE IF NOT EXISTS finance.transactions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trans_type finance.transaction_type NOT NULL DEFAULT 'transfer',
    trans_amount NUMERIC NOT NULL CHECK(trans_amount>0),
    currency TEXT NOT NULL REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    trans_description TEXT,
    -- providor_id UUID NOT NULL REFERENCES finance.providors(id) ON DELETE RESTRICT,
    initiator_id  UUID NOT NULL REFERENCES finance.entities(id) ON DELETE RESTRICT,
    source_wallet_id UUID NULL REFERENCES finance.wallets(id),
    source_acc  UUID NOT NULL  REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    destination_acc  UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    ref_code TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('TRX'),
    meta_data JSONB DEFAULT '{}',
    trans_status finance.transaction_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK(source_acc !=destination_acc)
);
-- CREATE INDEX trans_providor_id_idx ON finance.transactions(providor_id);
CREATE INDEX trans_initiator_id_idx ON finance.transactions(initiator_id);
CREATE INDEX trans_source_acc_id_idx ON finance.transactions(source_acc);
CREATE INDEX trans_dest_acc_id_idx ON finance.transactions(destination_acc);
CREATE INDEX trans_dest_ref_code_idx ON finance.transactions(ref_code);

CREATE TABLE IF NOT EXISTS finance.applied_currencies(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trans_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    from_currency TEXT NOT NULL REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    to_currency TEXT NOT NULL  REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    rate NUMERIC NOT NULL CHECK(rate>0),
    source TEXT NOT NULL,
    source_ref TEXT,
    internal_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('APC'),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fetched_by UUID NOT NULL REFERENCES finance.entities(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_currency_range
    EXCLUDE USING gist(
        from_currency WITH=,
        to_currency WITH=,
        tstzrange(valid_from,valid_to,'[') WITH &&
    ),
    CHECK(from_currency != to_currency)
);
CREATE INDEX app_curr_trans_id_idx ON finance.applied_currencies(trans_id);
CREATE INDEX app_curr_from_curr_idx ON finance.applied_currencies(from_currency);
CREATE INDEX app_curr_to_curr_idx ON finance.applied_currencies(to_currency);
CREATE INDEX app_curr_int_ref_idx ON finance.applied_currencies(internal_ref);

CREATE TABLE IF NOT EXISTS finance.transaction_provisions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trans_id  UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    providor_id UUID NOT NULL REFERENCES finance.providors(id) ON DELETE RESTRICT,
    provision_ref_code TEXT UNIQUE DEFAULT  finance.gen_ref_code('TPC'),
    transaction_amount NUMERIC NOT NULL,
    direction  finance.transaction_direction NOT NULL,
    external_trans_status finance.ext_trans_status NOT NULL,
    req_payload JSON default '{}',
    res_payload JSON default '{}',
    meta_data  JSON default '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ext_trans_providor_id_idx ON finance.transaction_provisions(providor_id);
CREATE INDEX ext_trans_trans_id_idx ON finance.transaction_provisions(trans_id);
CREATE INDEX ext_trans_ref_code_idx ON finance.transaction_provisions(ext_ref_code);

CREATE TABLE IF NOT EXISTS finance.ledger_entries(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trans_id  UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    acc_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    entry_type finance.ledger_entry_type NOT NULL,
    trans_category TEXT NOT NULL REFERENCES finance.transaction_categories(cat_name) ON DELETE RESTRICT,
    entry_amount NUMERIC NOT NULL CHECK(entry_amount>0),
    entry_status finance.ledger_entry_status NOT NULL DEFAULT 'pending',
    meta_data JSONB DEFAULT '{}',
    --i have added this ledger entry ref code to track performance
    entry_ref  TEXT UNIQUE DEFAULT finance.gen_ref_code('LGE'),
    entry_made_by  UUID NOT NULL REFERENCES finance.entities(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at TIMESTAMPTZ
);
CREATE INDEX ledger_ent_trans_id_idx ON finance.ledger_entries(trans_id);
CREATE INDEX ledger_ent_acc_id_idx ON finance.ledger_entries(acc_id);
CREATE INDEX ledger_ent_trans_cat_idx ON finance.ledger_entries(trans_category);
CREATE INDEX ledger_ent_made_by_idx ON finance.ledger_entries(entry_made_by);
CREATE INDEX ledger_ent_entry_ref_idx ON finance.ledger_entries(entry_ref);

CREATE INDEX idx_ledger_acc_balance 
ON finance.ledger_entries (acc_id, entry_status, entry_type) 
INCLUDE (entry_amount);


CREATE TABLE IF NOT EXISTS finance.fee_templates(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_name TEXT NOT NULL UNIQUE,
    trans_type finance.transaction_type NOT NULL DEFAULT 'withdrawal',
    applied_to_currency TEXT NOT NULL REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_by  UUID NOT NULL REFERENCES finance.administrators(id) ON DELETE RESTRICT,-- mostly the admin entity 
    calc_type finance.fee_calc_type  NOT NULL DEFAULT 'fixed',
    -- this next field applies for % calculations type
    percentage_rate NUMERIC CHECK(percentage_rate IS NULL OR (percentage_rate>0.00 AND percentage_rate<=100.00)),
    -- the next two fields are ranges for fixed calculation types
    min_amount NUMERIC NOT NULL DEFAULT 0 CHECK(min_amount>=0) ,
    max_amount NUMERIC NOT NULL DEFAULT 100000 CHECK(max_amount>=min_amount),
    fee_charged NUMERIC NOT NULL DEFAULT 0 CHECK(fee_charged>=0),
    charge_to finance.fee_charge_to NOT NULL DEFAULT 'sender',--sender or receiver but mostly sender... why would you be charged to receive fee or mybe tax etc
    --the next three fields will determine if the template is active or not 
    -- ill check to see that two templates of the same type are not active at the same time 
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ NOT NULL CHECK(effective_to>=effective_from),
    date_approved TIMESTAMPTZ NOT NULL DEFAULT now() CHECK(date_approved<=effective_from),
    temp_description TEXT DEFAULT 'fee template',
    fee_temp_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('FTR'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK((calc_type='fixed' AND fee_charged IS NOT NULL AND percentage_rate IS NULL)OR 
    (calc_type='rate' AND percentage_rate IS NOT NULL AND fee_charged IS NULL )
    ),
    CONSTRAINT valid_template_data
        EXCLUDE USING gist(
            trans_type WITH =,
            tstzrange(effective_from,effective_to,'[') WITH &&,
            numrange(min_amount, max_amount,'[]') WITH &&
        )
);
CREATE INDEX fee_temp_trans_type ON finance.fee_templates(trans_type);
CREATE INDEX fee_temp_name_idx ON finance.fee_templates(temp_name);
CREATE INDEX fee_temp_created_by_idx ON finance.fee_templates(created_by);
CREATE INDEX fee_temp_fee_temp_ref_idx ON finance.fee_templates(fee_temp_ref);
CREATE INDEX fee_temp_applied_to_currency_idx ON finance.fee_templates(applied_to_currency);

CREATE TABLE IF NOT EXISTS finance.applied_fees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_id UUID NOT NULL REFERENCES finance.fee_templates(id) ON DELETE RESTRICT,
    trans_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE RESTRICT,
    ledger_entry_id UUID NOT NULL REFERENCES finance.ledger_entries(id) ON DELETE RESTRICT,
    amount_applied NUMERIC ,-- this is an intentionaly redundant field does not affect transactions the amount is fetched from the template
    currency TEXT NOT NULL REFERENCES finance.currencies(CODE) ON UPDATE CASCADE ON DELETE RESTRICT,
    app_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('ATF'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX app_fee_temp_id_idx ON finance.applied_fees(temp_id);
CREATE INDEX app_fee_ledger_entry_id_idx ON finance.applied_fees(ledger_entry_id);
CREATE INDEX app_fee_tran_id_idx ON finance.applied_fees(trans_id);
CREATE INDEX app_fee_curr_idx ON finance.applied_fees(currency);
--------------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------------
--The Preliminary Layer
CREATE TABLE IF NOT EXISTS finance.idempotencies(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idemp_key TEXT NOT NULL UNIQUE,
    initiated_by UUID DEFAULT  NULL REFERENCES finance.entities(id) ON DELETE SET NULL,
    trans_id  UUID DEFAULT NULL REFERENCES finance.transactions(id) ON DELETE SET NULL,
    key_status finance.idemp_key_status NOT NULL DEFAULT 'expired',-- this will most likely be marked as expired since this table is only updated after a successfull transaction
    api_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idemp_key_idx ON finance.idempotencies(idemp_key);
CREATE INDEX idemp_trans_id_idx ON finance.idempotencies(trans_id);
CREATE INDEX idemp_initiated_by_id_idx ON finance.idempotencies(initiated_by);

CREATE TABLE IF NOT EXISTS finance.accounting_notifications(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id UUID NOT NULL REFERENCES finance.entities(id) ON DELETE CASCADE, --most likely the system entity since communication will be unidirectional ie from the db to the user
    to_entity_id   UUID NOT NULL REFERENCES finance.entities(id) ON DELETE CASCADE, --most not likely the system entity since why should i report something to the system
    notification_ref TEXT NOT NULL UNIQUE DEFAULT finance.gen_ref_code('NTF'),
    notification_msg TEXT,
    notification_type finance.notification_type NOT NULL DEFAULT 'information',
    notification_title TEXT NOT NULL DEFAULT 'FINANCE NOTIFICATION',
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX acc_notf_from_ent_idx ON finance.accounting_notifications(from_entity_id);
CREATE INDEX acc_notf_to_ent_idx ON finance.accounting_notifications(to_entity_id);
CREATE INDEX acc_notf_ref_idx ON finance.accounting_notifications(notification_ref);

CREATE TABLE IF NOT EXISTS finance.accounting_audits(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID ,
    action_type finance.audit_action_type NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX acc_audit_ent_fk_idx ON finance.accounting_audits(entity_id);


-- Advanced validation function with custom validator support
-- Enhanced validation function with email support
CREATE OR REPLACE FUNCTION finance.validate_name_field(
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
SET search_path = finance, pg_catalog
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

CREATE OR REPLACE FUNCTION finance.create_entity(
    p_entity_type TEXT,
    p_entity_name TEXT,
    p_entity_status TEXT DEFAULT 'active',
    p_postfix TEXT DEFAULT '@default.ent'
)
RETURNS jsonb 
LANGUAGE plpgsql
VOLATILE 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
    v_entity_id UUID;
    v_entity_type finance.entity_type;
    v_entity_name TEXT;
    v_entity_status finance.entity_status;
    v_hint TEXT;
BEGIN 
-- clean then validate the inputs
p_entity_status:=LOWER(TRIM(p_entity_status));
p_entity_type:=LOWER(TRIM(p_entity_type));

v_entity_name := finance.validate_name_field(
    p_entity_name, 
    2, 
    100, 
    'Entity Name', 
    FALSE, 
    NULL, --regex ie '^[a-zA-Z0-9_]+$',Only letters, numbers, and underscore
    'NONE'  -- case
) || COALESCE(p_postfix,'');
IF NOT finance.check_enum_fields(p_entity_type,NULL::finance.entity_type)THEN 
RAISE EXCEPTION 'Entity Type Not Found:%',p_entity_type
USING ERRCODE='P0001',
HINT=format('The entity entered is not found in the available entities: %s',array_to_string(enum_range(NULL::finance.entity_type)::TEXT[],', '));
END IF;
IF NOT finance.check_enum_fields(p_entity_status,NULL::finance.entity_status)THEN 
RAISE EXCEPTION 'Entity Status Not Found:%',p_entity_status
USING ERRCODE='P0001',
HINT=format('The entity status entered is not found in the available entities:%s',array_to_string(enum_range(NULL::finance.entity_status)::TEXT[],', '));
END IF;

v_entity_type:=p_entity_type::finance.entity_type;
v_entity_status:=p_entity_status::finance.entity_status;
INSERT INTO finance.entities(
    entity_type,
    entity_name,
    entity_status
) VALUES(
    v_entity_type,
    v_entity_name,
    v_entity_status
) 
RETURNING id INTO v_entity_id;
RETURN finance.build_response(
    true,
    jsonb_build_object('id',v_entity_id)
);
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
   WHEN unique_violation THEN 
     RETURN finance.build_response(
        false,
        NULL,
        'P0002',
        'The entity already Exists try another name or type',
        format('Entity %s OR/AND %s already exists',v_entity_type,v_entity_name)
     );
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
------Dedicated Create System Entity function that takes one parameter 

CREATE OR REPLACE FUNCTION finance.create_system_entity(
    p_entity_name TEXT,
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_system_entity_id UUID;
v_entity_name TEXT;
v_query_result jsonb;
v_hint TEXT;
BEGIN 
v_entity_name :=p_entity_name;
SELECT finance.create_entity
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
RETURN finance.build_response(
    true,
    jsonb_build_object('system_entity_id',v_system_entity_id)
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;

 WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
 $$;
--- Dedicated functions to create an administrator entity
---- Create admin entity function 

--BOOLEAN CHECKER FUNCTION 
CREATE OR REPLACE FUNCTION finance.parse_boolean(
    p_value TEXT,
    p_raise_exception BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = finance, pg_catalog
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

CREATE OR REPLACE FUNCTION finance.create_admin_entity(
    p_entity_name TEXT,
    p_admin_user_name TEXT,
    p_entity_status TEXT DEFAULT 'active',
    p_admin_role TEXT DEFAULT 'sys_admin',
    p_is_active TEXT DEFAULT 'true'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_admin_entity_id UUID;
v_entity_name TEXT;
v_admin_user_name TEXT;
v_admin_role finance.admin_role;
v_query_result jsonb;
v_is_active BOOLEAN;
v_hint TEXT;
BEGIN 

v_admin_user_name := finance.validate_name_field(
    p_admin_user_name, 
    2, -- min chars
    100, --max chars
    'Admin user name', --name fiels
    FALSE, 
    NULL, --Only letters, numbers, and underscore
    'LOWER'  -- case lower case
);
v_entity_name := finance.validate_name_field(
    p_entity_name, 
    2, -- min chars
    100, --max chars
    'Entity name', --name fiels
    FALSE, 
    NULL, --regex ie '^[a-zA-Z0-9_]+$',Only letters, numbers, and underscore
    'NONE'  -- case lower case
);
IF NOT finance.check_enum_fields(p_admin_role,NULL::finance.admin_role)THEN 
RAISE EXCEPTION 'Invalid role :%',p_admin_role
USING ERRCODE='P0001',
HINT=format('The admin role entered is not found in the available entities: %s',array_to_string(enum_range(NULL::finance.admin_role)::TEXT[],', '));
END IF;
v_is_active:=finance.parse_boolean(p_is_active,TRUE);
v_admin_role:=p_admin_role::finance.admin_role;
SELECT finance.create_entity
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
INSERT INTO finance.administrators(
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
RETURN finance.build_response(
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
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN unique_violation THEN 
RETURN finance.build_response(
        false,
        NULL,
        'P0002',
        'Looks like a record with the user name exists try another user name',
        format('Administrator Entity with user name already exists %s',v_admin_user_name)
     );
 WHEN OTHERS THEN 
  RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
 $$;



CREATE OR REPLACE FUNCTION finance.build_response(
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
CREATE OR REPLACE FUNCTION finance.get_auth_user(
    p_email TEXT
)
RETURNS jsonb 
LANGUAGE plpgsql
STABLE 
SET search_path = finance, pg_catalog
AS $$
DECLARE
v_auth_id UUID;
v_user_email TEXT;
v_hint TEXT;
BEGIN 
v_user_email := finance.validate_name_field(
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
RETURN finance.build_response(true,
                              jsonb_build_object('id',v_auth_id));
END IF;
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
--- CREATE A HELPER FUNCTION TO CHECK AND GET THE CREATED BY FIELD
CREATE OR REPLACE FUNCTION finance.check_field_existance(
    c_id UUID,
    p_schema TEXT,
    p_table TEXT
)
RETURNS jsonb 
IMMUTABLE
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
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
RETURN finance.build_response(
    true,
    jsonb_build_object('id',v_created_by_id)
);
END IF ;
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

-- PHASE TWO CREATE THE ACCOUNTS AND WALLET FUNCTIONS
-- create currency function
-- SELECT finance.create_currency(
--     'USD',
--     1,
--     'United States Dollar',
--     '$',
--     '643e5005-da3e-4127-9f13-789d88e689f5',
--     'true'
-- );
CREATE OR REPLACE FUNCTION finance.create_currency(
    p_code TEXT,
    p_numeric_code NUMERIC,
    p_curr_name TEXT,
    p_symbol TEXT,
    p_created_by UUID,
    p_is_active TEXT DEFAULT 'true'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_currency_code TEXT;
    v_numeric_code SMALLINT;
    v_curr_name TEXT;
    v_symbol TEXT;
    v_is_active BOOLEAN;
    v_created_by UUID;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
v_currency_code := finance.validate_name_field(
    p_code, 
    2, -- min chars
    6, --max chars
    'Currency Code', --name fiels
    FALSE, 
    NULL,
    -- '^[A-Za-z0-9\s_]+$',-- Allows letters, numbers, spaces, underscores
    'UPPER'  -- case lower case
);
v_curr_name := finance.validate_name_field(
    p_curr_name, 
    2, -- min chars
    100, --max chars
    'Currency Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);
v_symbol := COALESCE(TRIM(p_symbol), '');
    IF p_numeric_code IS NULL OR p_numeric_code < 0 OR p_numeric_code > 999 THEN
RAISE EXCEPTION 'Invalid numeric code%',p_numeric_code
USING ERRCODE='P0001',
HINT='Numeric code must be between 0 and 999';
END IF;
v_numeric_code := p_numeric_code::SMALLINT;

v_is_active := finance.parse_boolean(p_is_active,TRUE);
    SELECT finance.check_field_existance(p_created_by, 'finance', 'administrators') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
v_created_by := (v_result->'data'->>'id')::UUID;
INSERT INTO finance.currencies (
        code, 
        numeric_code,
        curr_name, 
        symbol, 
        is_active, 
        created_by
    ) VALUES (
        v_currency_code, 
        v_numeric_code, 
        v_curr_name, 
        v_symbol, 
        v_is_active, 
        v_created_by
    );
    
RETURN finance.build_response(
        true,
        jsonb_build_object(
            'code', v_currency_code,
            'numeric_code', v_numeric_code,
            'name', v_curr_name,
            'symbol', v_symbol,
            'is_active', v_is_active,
            'created_by', v_created_by
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
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
        
        IF v_constraint_name = 'currencies_pkey' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Currency code already exists',
                format('Code %s already used', v_currency_code)
            );
        ELSIF v_constraint_name = 'currencies_curr_name_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Currency name already exists',
                format('Name %s already used', v_curr_name)
            );
        ELSIF v_constraint_name = 'currencies_numeric_code_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Currency code already exists',
                format('Code %s already used', v_currency_code)
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate currency record',
                v_detail
            );
        END IF;
        
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

-- SELECT finance.create_account(
-- 'personal',
-- 'aba9e1c8-a4a3-45c6-afa2-4d446aed74a9',
-- 'USD',
-- '643e5005-da3e-4127-9f13-789d88e689f5'
-- );

CREATE OR REPLACE FUNCTION finance.get_currency(
    p_currency_code TEXT,
    p_require_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_currency_code TEXT;
    v_currency RECORD;
    v_hint TEXT;
BEGIN
v_currency_code := finance.validate_name_field(
    p_currency_code, 
    2, -- min chars
    6, --max chars
    'Currency Code', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'UPPER'  -- case lower case
);
    SELECT 
        code,
        numeric_code,
        curr_name,
        symbol,
        is_active,
        created_at,
        updated_at
    INTO v_currency
    FROM finance.currencies
    WHERE code = v_currency_code;
    
    -- Check if currency exists
IF v_currency IS NULL THEN
RAISE EXCEPTION 'Code Entered not found :%',v_currency_code
USING ERRCODE='P0001',
HINT='The currency code entered is not found try another';
END IF;
    -- Check if active status is required
IF p_require_active AND  NOT v_currency.is_active THEN
RAISE EXCEPTION 'currency code is not active:%',v_currency_code
USING ERRCODE='P0001',
HINT='The currency code entered is not active';
END IF;
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'code', v_currency.code,
            'numeric_code', v_currency.numeric_code,
            'name', v_currency.curr_name,
            'symbol', v_currency.symbol,
            'is_active', v_currency.is_active,
            'created_at', v_currency.created_at
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;

$$;
CREATE OR REPLACE FUNCTION finance.create_account(
    p_acc_type TEXT,
    p_owner_entity_id UUID,
    p_currency_code TEXT,
    p_created_by UUID,
    p_acc_status TEXT DEFAULT 'dormant',
    p_acc_name TEXT DEFAULT 'Entity Personal Account',
    p_acc_description TEXT DEFAULT NULL,
    p_min_balance NUMERIC DEFAULT 0,
    p_max_balance NUMERIC DEFAULT 0,
    p_max_transfer_amount NUMERIC DEFAULT 1000000
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_acc_type finance.acc_type;
    v_owner_entity_id UUID;
    v_currency_code TEXT;
    v_acc_name TEXT;
    v_acc_description TEXT;
    v_min_balance NUMERIC;
    v_max_balance NUMERIC;
    v_max_transfer_amount NUMERIC;
    v_created_by UUID;
    v_account_id UUID;
    v_acc_number TEXT;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_acc_status finance.acc_status;
    v_hint TEXT;
BEGIN

IF NOT finance.check_enum_fields(p_acc_type, NULL::finance.acc_type) THEN
RAISE EXCEPTION 'Invalid account type :%',p_acc_type
USING ERRCODE='P0001',
HINT='The account type  entered is not found in the available types: '||array_to_string(enum_range(NULL::finance.acc_type)::TEXT[],', ');
END IF;
v_acc_type := p_acc_type::finance.acc_type;
IF NOT finance.check_enum_fields(p_acc_status, NULL::finance.acc_status) THEN
RAISE EXCEPTION 'Invalid account status :%',p_acc_status
USING ERRCODE='P0001',
HINT='The account status  entered is not found in the available statuses: '||array_to_string(enum_range(NULL::finance.acc_status)::TEXT[],', ');
END IF;
v_acc_status := p_acc_status::finance.acc_status;
    SELECT finance.check_field_existance(p_owner_entity_id, 'finance', 'entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
v_owner_entity_id := (v_result->'data'->>'id')::UUID;
SELECT finance.get_currency(UPPER(TRIM(p_currency_code))) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_currency_code := (v_result->'data'->>'code');
v_acc_name := finance.validate_name_field(
    p_acc_name, 
    2, -- min chars
    150, --max chars
    'Account Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_acc_description := COALESCE(TRIM(p_acc_description), '');
    -- Validate balances
    IF p_min_balance < 0 THEN
RAISE EXCEPTION 'Invalid Minimum Balance:%',p_min_balance
USING ERRCODE='P0001',
HINT='Minimum balance cannot be negative';
END IF;
v_min_balance := p_min_balance;
IF p_max_balance < v_min_balance THEN
RAISE EXCEPTION 'Invalid Maximum Balance:%',p_max_balance
USING ERRCODE='P0001',
HINT='Maximum balance must be >= minimum balance';
END IF;
v_max_balance := p_max_balance;
IF p_max_transfer_amount < 0 THEN
RAISE EXCEPTION 'Invalid Maximum transfer amount:%',p_max_transfer_amount
USING ERRCODE='P0001',
HINT='Maximum transfer amount must be >=0';
END IF;
v_max_transfer_amount := p_max_transfer_amount;
    SELECT finance.check_field_existance(p_created_by, 'finance', 'entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
v_created_by := (v_result->'data'->>'id')::UUID;
--Enforce one personal and overdraft with a clear responce message
IF EXISTS (
    SELECT 1
    FROM finance.accounts
    WHERE owner_entity_id = v_owner_entity_id
      AND acc_type = v_acc_type
      AND acc_type IN ('personal','overdraft')
) THEN
RAISE EXCEPTION 'Duplicate Account ownership:% ',v_acc_type
USING ERRCODE='P0001',
HINT=format('Owner %s already has %s account type',v_owner_entity_id,v_acc_type);
END IF;
INSERT INTO finance.accounts (
        acc_type,
        owner_entity_id, 
        acc_currency, 
        acc_name,
        acc_description,
        acc_status,
        min_balance, 
        max_balance, 
        max_transfer_amount, 
        created_by
) VALUES (
        v_acc_type,
        v_owner_entity_id, 
        v_currency_code, 
        v_acc_name, 
        v_acc_description,
        v_acc_status,
        v_min_balance,
        v_max_balance, 
        v_max_transfer_amount,
        v_created_by
    )
    RETURNING id, acc_number INTO v_account_id, v_acc_number;
RETURN finance.build_response(
        true,
        jsonb_build_object(
            'id', v_account_id,
            'acc_number', v_acc_number,
            'acc_type', v_acc_type,
            'owner_entity_id', v_owner_entity_id,
            'currency_code', v_currency_code,
            'acc_name', v_acc_name,
            'acc_description', v_acc_description,
            'min_balance', v_min_balance,
            'max_balance', v_max_balance,
            'max_transfer_amount', v_max_transfer_amount,
            'created_by', v_created_by
        )
    );


EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
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
        
        IF v_constraint_name = 'accounts_acc_number_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Account number already exists',
                v_detail
            );
        ELSIF v_constraint_name = 'accounts_acc_name_owner_entity_id_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Account name already exists for this owner',
                format('Owner %s already has account named %s', v_owner_entity_id, v_acc_name)
            );
        ELSIF v_constraint_name = 'one_personal_overdraft_entity_acc' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Owner already has a personal or overdraft account',
                format('Owner %s already has a %s account', v_owner_entity_id,v_acc_type)
            );
        ELSIF v_constraint_name = 'unique_sys_acc_type' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'System account type already exists',
                format('Account type %s already exists', v_acc_type)
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate account record',
                v_detail
            );
        END IF;
        
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;


CREATE OR REPLACE FUNCTION finance.create_wallet(
    p_wallet_name TEXT,
    p_owner_entity_id UUID,
    p_wallet_status TEXT DEFAULT 'dormant',
    p_wallet_type TEXT DEFAULT 'personal',
    p_wallet_description TEXT DEFAULT 'entity wallet'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_wallet_name TEXT;
    v_owner_entity_id UUID;
    v_wallet_type finance.wallet_type;
    v_wallet_description TEXT;
    v_wallet_id UUID;
    v_wallet_number TEXT;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_wallet_status finance.wallet_status;
    v_hint TEXT;
BEGIN
v_wallet_name := finance.validate_name_field(
    p_wallet_name, 
    2, -- min chars
    150, --max chars
    'Wallet Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
    
    -- Validate wallet type
    IF NOT finance.check_enum_fields(p_wallet_type, NULL::finance.wallet_type) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_wallet_type
USING ERRCODE='P0001',
HINT=format('The wallet type entered is not found in the available entities: %s',array_to_string(enum_range(NULL::finance.wallet_type)::TEXT[],', '));
END IF;
    v_wallet_type := p_wallet_type::finance.wallet_type;
       IF NOT finance.check_enum_fields(p_wallet_status, NULL::finance.wallet_status) THEN
RAISE EXCEPTION 'Invalid wallet status :%',p_wallet_status
USING ERRCODE='P0001',
HINT=format('The wallet status entered is not found in the available entities: %s',array_to_string(enum_range(NULL::finance.wallet_status)::TEXT[],', '));
END IF;
    v_wallet_status := p_wallet_status::finance.wallet_status;
    
    -- Validate owner entity exists
    SELECT finance.check_field_existance(p_owner_entity_id, 'finance', 'entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_owner_entity_id := (v_result->'data'->>'id')::UUID;
    
    v_wallet_description := COALESCE(TRIM(p_wallet_description), 'entity wallet');
    
    -- Insert wallet
    INSERT INTO finance.wallets (
        wallet_name,
        owner_entity_id,
        wallet_type,
        wallet_description,
        wallet_status
    ) VALUES (
        v_wallet_name,
        v_owner_entity_id,
        v_wallet_type,
        v_wallet_description,
        v_wallet_status
    )
    RETURNING id, wallet_number INTO v_wallet_id, v_wallet_number;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'id', v_wallet_id,
            'wallet_number', v_wallet_number,
            'wallet_name', v_wallet_name,
            'owner_entity_id', v_owner_entity_id,
            'wallet_type', v_wallet_type,
            'wallet_description', v_wallet_description
        )
    );
    
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
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
        
        IF v_constraint_name = 'wallets_wallet_name_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Wallet name already exists',
                format('Name %s already used', v_wallet_name)
            );
        ELSIF v_constraint_name = 'wallets_wallet_number_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Wallet number already exists',
                v_detail
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate wallet record',
                v_detail
            );
        END IF;
        
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.link_account_to_wallet(
    p_wallet_id UUID,
    p_account_id UUID,
    p_color_tag TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_wallet_id UUID;
    v_account_id UUID;
    v_color_tag TEXT;
    v_link_id UUID;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
    -- Validate wallet exists
    SELECT finance.check_field_existance(p_wallet_id, 'finance', 'wallets') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_id := (v_result->'data'->>'id')::UUID;
    
    -- Validate account exists
    SELECT finance.check_field_existance(p_account_id, 'finance', 'accounts') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_account_id := (v_result->'data'->>'id')::UUID;
    
    -- Set color tag: if provided use it, else generate random
    IF p_color_tag IS NOT NULL AND TRIM(p_color_tag) != '' THEN
        v_color_tag := TRIM(p_color_tag);
    ELSE
        v_color_tag := finance.gen_color();
    END IF;
    
    -- Insert link
    INSERT INTO finance.wallet_accounts (
        wallet_id, acc_id, color_tag
    ) VALUES (
        v_wallet_id, v_account_id, v_color_tag
    )
    RETURNING id INTO v_link_id;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'id', v_link_id,
            'wallet_id', v_wallet_id,
            'account_id', v_account_id,
            'color_tag', v_color_tag
        )
    );
    
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
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
        
        IF v_constraint_name = 'wallet_accounts_wallet_id_acc_id_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'This account is already linked to this wallet',
                format('Wallet %s already linked to account %s', v_wallet_id, v_account_id)
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate link record',
                v_detail
            );
        END IF;
        
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.grant_wallet_access(
    p_wallet_id UUID,
    p_entity_id UUID,
    p_granted_by UUID,
    p_access_level TEXT DEFAULT 'view'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_wallet_id UUID;
    v_entity_id UUID;
    v_access_level finance.wallet_access_level;
    v_granted_by UUID;
    v_hint TEXT;
BEGIN
    -- Validate wallet exists
    SELECT finance.check_field_existance(p_wallet_id, 'finance', 'wallets') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_wallet_id:=(v_result->'data'->>'id')::UUID;
    -- Validate entity exists
    SELECT finance.check_field_existance(p_entity_id, 'finance', 'entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    -- check granted by
    v_entity_id:=(v_result->'data'->>'id')::UUID;
    SELECT finance.check_field_existance(p_granted_by, 'finance', 'entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
            RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_granted_by:= (v_result->'data'->>'id')::UUID;
    -- Validate access level
     IF NOT finance.check_enum_fields(p_access_level, NULL::finance.wallet_access_level) THEN
RAISE EXCEPTION 'Invalid acess level :%',p_access_level
USING ERRCODE='P0001',
HINT=format('The access level entered is not found in the available entities: %s',array_to_string(enum_range(NULL::finance.wallet_access_level)::TEXT[],', '));
END IF;
    v_access_level:=p_access_level::finance.wallet_access_level;
    -- Insert or update access
    INSERT INTO finance.wallet_access (wallet_id, entity_id, access_level,granted_by)
    VALUES (v_wallet_id, v_entity_id, v_access_level,v_granted_by)
    ON CONFLICT (wallet_id, entity_id)
    DO UPDATE SET access_level = EXCLUDED.access_level;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'wallet_id', v_wallet_id,
            'entity_id', v_entity_id,
            'access_level', v_access_level,
            'granted_by',v_granted_by
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.revoke_wallet_access(
    p_wallet_id UUID,
    p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_hint TEXT;
BEGIN
    DELETE
    FROM finance.wallet_access
    WHERE wallet_id = p_wallet_id AND entity_id = p_entity_id;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'wallet_id', p_wallet_id,
            'entity_id', p_entity_id
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.check_wallet_access(
    p_wallet_id UUID,
    p_entity_id UUID,
    p_access_level TEXT DEFAULT 'manage'
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_wallet_access_record RECORD;
v_result jsonb;
v_wallet_id UUID;
v_entity_id UUID;
v_access_level finance.wallet_access_level;
v_hint TEXT;
BEGIN
-- Validation 
--wallet
SELECT finance.check_field_existance(p_wallet_id,'finance','wallets') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =v_result->>'detail';
END IF;
v_wallet_id:=(v_result->'data'->>'id')UUID;
--entity
SELECT finance.check_field_existance(p_entity_id,'finance','entities') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =v_result->>'detail';
END IF;
v_entity_id:=(v_result->'data'->>'id')::UUID;
--required level
IF NOT finance.check_enum_fields(p_access_level, NULL::finance.wallet_access_level) THEN
RAISE EXCEPTION 'Invalid Wallet Access Level :%',p_access_level
USING ERRCODE='P0001',
HINT='The Access level type entered is not found in the available types: '||array_to_string(enum_range(NULL::finance.wallet_access_level)::TEXT[],', ');
END IF;
v_access_level:=p_access_level::finance.wallet_access_level;
       SELECT 
        wallet_id,
        entity_id,
        access_level
        INTO v_wallet_access_record
        FROM finance.wallet_access
                WHERE wallet_id = v_wallet_id
        AND (
            entity_id = v_entity_id  -- Owner always has access
            OR (
                entity_id = v_entity_id
                AND  access_level >= v_access_level
            )
        );
IF v_wallet_access_record IS NULL THEN 
RAISE EXCEPTION 'Wallet Access Not Found %',v_entity_id
USING ERRCODE='P0001',
HINT=format('The wallet Access Level %s does not Exist for entity %s on wallet %s',v_access_level,v_entity_id,v_wallet_id);
END IF;
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'wallet_id',v_wallet_access_record.wallet_id,
        'entity_id',v_wallet_access_record.entity_id,
        'access_level',v_wallet_access_record.access_level
    )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
  RETURN finance.build_response(
            false, NULL, 'P0003',
            'Error: ' || SQLERRM,
            'Detail: ' || SQLSTATE
        );
END;
$$;

CREATE OR REPLACE FUNCTION finance.create_accounting_notification(
    p_to_entity_id UUID,
    p_notification_msg TEXT,
    p_notification_title TEXT DEFAULT 'SYSTEM NOTIFICATION',
    p_tags TEXT[] DEFAULT NULL,
    p_from_entity_id UUID DEFAULT NULL ,-- NULL means use system entity
    p_notification_type TEXT DEFAULT 'information'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result JSONB;
    v_from_entity_id UUID;
    v_to_entity_id UUID;
    v_notification_msg TEXT;
    v_tags TEXT[];
    v_notification_id UUID;
    v_notification_ref TEXT;
    v_notification_title TEXT;
    v_notification_type finance.notification_type;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
    -- Validate and get from_entity_id
    IF p_from_entity_id IS NULL THEN
        -- Use system entity as sender
        SELECT finance.get_system_entity() INTO v_result;
        IF NOT (v_result->>'success')::boolean THEN
                    RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
        END IF;
        v_from_entity_id := (v_result->'data'->>'id')::UUID;
    ELSE
        -- Validate provided from_entity exists
        SELECT finance.check_field_existance(p_from_entity_id,'finance','entities') INTO v_result;
        IF NOT (v_result->>'success')::boolean THEN
                    RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
        END IF;
        v_from_entity_id := p_from_entity_id;
    END IF;
    IF NOT finance.check_enum_fields(p_notification_type, NULL::finance.notification_type) THEN
RAISE EXCEPTION 'Invalid Notification_type :%',p_notification_type
USING ERRCODE='P0001',
HINT=format('The type of notification type entered is not found in the available types: %s',array_to_string(enum_range(NULL::finance.notification_type)::TEXT[],', '));
END IF;
v_notification_type:=p_notification_type::finance.notification_type;
    -- Validate to_entity exists
    SELECT finance.check_field_existance(p_to_entity_id,'finance','entities') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_to_entity_id := (v_result->'data'->>'id')::UUID;
    
    -- Optional: Prevent sending notification to system entity
    IF v_to_entity_id = v_from_entity_id THEN
    RAISE EXCEPTION 'Same entity sender receiver error :%',v_from_entity_id
USING ERRCODE='P0001',
HINT='Cannot send notification to same entity';
END IF;    
    -- Validate notification message
    IF p_notification_msg IS NULL OR TRIM(p_notification_msg) = '' THEN
RAISE EXCEPTION 'Empty notification message'
USING ERRCODE='P0001',
HINT='Notification message cannot be empty, please provide a meaningful notification message';
END IF;
    v_notification_msg := TRIM(p_notification_msg);
    
    -- Validate tags
    SELECT finance.validate_tags(p_tags) INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_tags := ARRAY(SELECT jsonb_array_elements_text(v_result->'data'->'tags'));

v_notification_title := finance.validate_name_field(
    p_notification_title, 
    2, -- min chars
    150, --max chars
    'Notification Title', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'UPPER'  -- case lower case
);
    -- Insert notification
    INSERT INTO finance.accounting_notifications (
        from_entity_id,
        to_entity_id,
        notification_msg,
        notification_title,
        notification_type,
        tags
    ) VALUES (
        v_from_entity_id,
        v_to_entity_id,
        v_notification_msg,
        v_notification_title,
        v_notification_type,
        v_tags
    )
    RETURNING id, notification_ref INTO v_notification_id, v_notification_ref;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'id', v_notification_id,
            'notification_ref', v_notification_ref,
            'from_entity_id', v_from_entity_id,
            'to_entity_id', v_to_entity_id,
            'notification_msg', v_notification_msg,
            'notification_type',v_notification_type,
            'tags', v_tags,
            'created_at', NOW()
        )
    );
    
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 

BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
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
        
        IF v_constraint_name = 'accounting_notifications_notification_ref_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Notification reference already exists',
                'This is a system error, please contact support'
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate notification record',
                v_detail
            );
        END IF;
        
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.create_member_entity(
    p_member_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_created_by UUID,
    p_member_currency TEXT,
    p_is_active TEXT DEFAULT 'true',
    p_other_name TEXT DEFAULT NULL,
    p_date_of_register TIMESTAMPTZ DEFAULT NOW(),
    p_entity_status TEXT DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
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
v_member_email := finance.validate_name_field(
    p_member_email, 
    2, -- min chars
    150, --max chars
    'Member Email', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER',  -- case lower case
    TRUE
);

v_first_name := finance.validate_name_field(
    p_first_name, 
    2, -- min chars
    150, --max chars
    'First Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);

v_last_name := finance.validate_name_field(
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
v_other_name := finance.validate_name_field(
    p_other_name, 
    2, -- min chars
    150, --max chars
    'Other Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);
END IF;
v_is_active := finance.parse_boolean(p_is_active,TRUE);
-- check is create by field if found 
SELECT finance.check_field_existance(p_created_by,'finance','entities')INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_created_by:=(v_result->'data'->>'id')::UUID;
--fetch the user id from auth
SELECT finance.get_auth_user(p_member_email) INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_auth_id:=(v_result->'data'->>'id')::UUID;
-- clean data 
    v_member_email:=LOWER(TRIM(p_member_email));
    v_first_name:=LOWER(TRIM(p_first_name));
    v_last_name :=LOWER(TRIM(p_last_name));
    v_date_of_register:=COALESCE(p_date_of_register,NOW());
    v_entity_name:=format('%s %s',v_first_name,v_last_name);
    IF v_other_name IS NOT NULL THEN 
    v_entity_name:=format('%s %s',v_entity_name,v_other_name);
    END IF;
--if all is well proceed to creating the entity 
SELECT finance.create_entity
(
    'member',
    v_entity_name,
    p_entity_status,
    v_member_email
) INTO v_result;
IF NOT (v_result->>'success'):: boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
END IF;
v_member_id :=(v_result->'data'->>'id')::UUID;

---create a record in the member entity table
INSERT INTO finance.members (
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

SELECT finance.get_system_entity() INTO v_result;
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
RETURN finance.build_response(
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
RETURN finance.build_response(
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
 RETURN finance.build_response(
                               false,
                               NULL,
                               'P0002',
                               'This user is already registered as a member. Each user can only have one member profile.',
                                format('Auth ID %s is already associated with a member account ,constraint error name %s', v_auth_id,v_constraint_name)
                               );
        ELSIF v_constraint_name = 'members_email_key' THEN
 RETURN finance.build_response(
                               false,
                               NULL,
                               'P0002',
                               'A member with this email already exists. Please use a different email address.',
                                format('Email %s is already registered, constraint name %s', v_member_email,v_constraint_name)
                               );
        ELSIF v_constraint_name = 'members_pkey' THEN
 RETURN finance.build_response(
                               false,
                               NULL,
                               'P0002',
                               'Member ID conflict. This is a system error, please contact support.',
                                format('Member ID %s already exists %s', v_member_id,v_constraint_name)
                               );
        ELSE
-- Ill have Generic duplicate error for other constraints
 RETURN finance.build_response(
                               false,
                               NULL,
                               'P0002',
                               format('A duplicate record was detected. Check the names ( %s %s %s ) or add other name to make them unique.',v_first_name ,v_last_name,COALESCE(v_other_name, '')),
                               v_detail || v_constraint_name
                             );
        END IF;
WHEN OTHERS THEN 
  RETURN finance.build_response(
                               false,
                               NULL,
                               'P0003',
                               'an unexpected error occured check logs to see more details',
                                SQLERRM
                             );
END;
$$;

---------------------------------NOTIFICATIONS
CREATE OR REPLACE FUNCTION finance.get_system_entity()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_system_entity RECORD;
    v_hint TEXT;
BEGIN
    -- Get the system entity (only one exists due to unique index)
    SELECT id, entity_name, entity_ref, entity_status
    INTO v_system_entity
    FROM finance.entities
    WHERE entity_type = 'system'
    LIMIT 1;
    
IF v_system_entity IS NULL THEN
RAISE EXCEPTION 'system entity not found'
USING ERRCODE='P0001',
HINT='System Entity Not Found';
END IF;
    RETURN finance.build_response(
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
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
 END;
$$;

CREATE OR REPLACE FUNCTION finance.validate_tags(
    p_tags TEXT[],
    p_max_tags INT DEFAULT 10,
    p_max_tag_length INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_tag TEXT;
    v_cleaned_tags TEXT[] := ARRAY[]::TEXT[];
    v_hint TEXT;
BEGIN
    -- If tags is NULL, return empty array
    IF p_tags IS NULL THEN
        RETURN finance.build_response(
            true,
            jsonb_build_object('tags', ARRAY[]::TEXT[])
        );
    END IF;
    
    -- Check number of tags
    IF array_length(p_tags, 1) > p_max_tags THEN
RAISE EXCEPTION 'Tag Limit exceeded  max tags:%',p_max_tags
USING ERRCODE='P0001',
HINT=format('Received too many tags and exceeded limit of: %s tags received %s',p_max_tags,array_length(p_tags, 1));
END IF;
    -- Clean and validate each tag
    FOREACH v_tag IN ARRAY p_tags
    LOOP
        -- Trim whitespace
        v_tag := TRIM(v_tag);
        
        -- Skip empty tags
        IF v_tag = '' THEN
            CONTINUE;
        END IF;
        
        -- Check tag length
        IF LENGTH(v_tag) > p_max_tag_length THEN
RAISE EXCEPTION 'Tag length too long , max length:%',p_max_tag_length
USING ERRCODE='P0001',
HINT='Tag exceeds maximum length of characters: '||p_max_tag_length|| 'length received '||LENGTH(v_tag);
END IF; 
        -- Convert to lowercase for consistency
        v_cleaned_tags := array_append(v_cleaned_tags, LOWER(v_tag));
    END LOOP;
    
    RETURN finance.build_response(
        true,
        jsonb_build_object('tags', v_cleaned_tags)
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 RETURN finance.build_response(
    false,
    NULL,
    'P0003',
    'Something went wrong try again later',
    SQLERRM
 );
END;
$$;


CREATE OR REPLACE FUNCTION finance.create_group_entity(
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
SET search_path = finance, pg_catalog
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
v_group_name := finance.validate_name_field(
    p_group_name, 
    2, -- min chars
    150, --max chars
    'Group Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_is_active := finance.parse_boolean(p_is_active,TRUE);
v_group_description := COALESCE(TRIM(p_group_description), '');

    -- 2. Validate created_by exists in members table
    SELECT finance.check_field_existance(p_created_by, 'finance', 'members') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_created_by_member_id := (v_result->'data'->>'id')::UUID;

    -- Also need the member's entity ID (same as member id, because members.id = entities.id)
    v_created_by_entity_id := v_created_by_member_id;

    -- 3. Create entity (type = 'group')
    SELECT finance.create_entity(
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
    INSERT INTO finance.groups (
        id, group_name, group_description, created_by, is_active
    ) VALUES (
        v_entity_id, v_group_name, v_group_description, v_created_by_member_id, v_is_active
    );

    -- 5. Get system entity ID for created_by in accounts/wallet
    SELECT finance.get_system_entity() INTO v_result;
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

    -- 11. (Optional) Send notification to creator
    -- We'll skip notification for brevity, but you can add similar to member onboarding.

    -- 12. Return success response
    RETURN finance.build_response(
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
RETURN finance.build_response(
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
        --     RETURN finance.build_response(
        --         false, NULL, 'P0002',
        --         'Group name already exists',
        --         format('Name %s already used', v_group_name)
        --     );
       
        IF v_constraint_name = 'groups_group_ref_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Group reference already exists',
                v_detail
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate group record',
                v_detail
            );
        END IF;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.create_organization_entity(
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
SET search_path = finance, pg_catalog
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
v_org_name := finance.validate_name_field(
    p_org_name, 
    2, -- min chars
    150, --max chars
    'Organization Name', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_is_active := finance.parse_boolean(p_is_active,TRUE);
v_org_description := COALESCE(TRIM(p_org_description), '');

    -- Validate created_by exists in members
    SELECT finance.check_field_existance(p_created_by, 'finance', 'members') INTO v_result;
    IF NOT (v_result->>'success')::boolean THEN
                RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = v_result->>'detail';
    END IF;
    v_created_by_member_id := (v_result->'data'->>'id')::UUID;
    v_created_by_entity_id := v_created_by_member_id;

    -- Create entity (type = 'organization')
    SELECT finance.create_entity(
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
    INSERT INTO finance.organizations (
        id, org_name, org_description, created_by, is_active
    ) VALUES (
        v_entity_id, v_org_name, v_org_description, v_created_by_member_id, v_is_active
    );

    -- Get system entity
    SELECT finance.get_system_entity() INTO v_result;
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
    RETURN finance.build_response(
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
RETURN finance.build_response(
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
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Organization name already exists',
                format('Name %s already used', v_org_name)
            );
        ELSIF v_constraint_name = 'organizations_org_ref_key' THEN
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Organization reference already exists',
                v_detail
            );
        ELSE
            RETURN finance.build_response(
                false, NULL, 'P0002',
                'Duplicate organization record',
                v_detail
            );
        END IF;
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.get_cached_transaction(p_trans_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_trans RECORD;
BEGIN
    SELECT trans_type, trans_amount, source_acc, destination_acc, ref_code, trans_status, created_at
    INTO v_trans
    FROM finance.transactions
    WHERE id = p_trans_id;
    
    RETURN finance.build_response(true, jsonb_build_object(
        'transaction_id', p_trans_id,
        'trans_type', v_trans.trans_type,
        'amount', v_trans.trans_amount,
        'source_account', v_trans.source_acc,
        'destination_account', v_trans.destination_acc,
        'ref_code', v_trans.ref_code,
        'status', v_trans.trans_status,
        'created_at', v_trans.created_at,
        'cached', true
    ));
END;
$$;

CREATE OR REPLACE FUNCTION finance.get_trans_category(
    p_cat_name TEXT,
    p_require_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_cat_name TEXT;
    v_transaction_category RECORD;
    v_hint TEXT;
BEGIN
v_cat_name := finance.validate_name_field(
    p_cat_name,
    2, -- min chars
    150, --max chars
    'Category Name', --name fiels
    FALSE,
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
    SELECT
        cat_name,
        cat_description,
        providor_id,
        is_active,
        created_at
    INTO v_transaction_category
    FROM finance.transaction_categories
    WHERE cat_name = v_cat_name;

    -- Check if currency exists
IF v_transaction_category IS NULL THEN
RAISE EXCEPTION 'Not Found transaction category name:%',v_cat_name
USING ERRCODE='P0001',
HINT='The Category name entered is not found try another';
END IF;
    -- Check if active status is required
IF p_require_active AND NOT v_transaction_category.is_active THEN
RAISE EXCEPTION 'category with name % is not active',v_cat_name
USING ERRCODE='P0001',
HINT='The Category name entered is not active';
END IF;
    RETURN finance.build_response(
        true,
        jsonb_build_object(
            'cat_name', v_transaction_category.cat_name,
            'cat_description', v_transaction_category.cat_description,
            'is_active', v_transaction_category.is_active,
            'created_at', v_transaction_category.created_at,
            'providor_id',v_transaction_category.providor_id
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;

$$;



-- phase 0
CREATE OR REPLACE FUNCTION finance.validate_transaction(
p_source_acc UUID,
p_destination_acc UUID,
p_initiator_id UUID,
p_amount NUMERIC,
p_currency TEXT,
p_trans_type TEXT,
p_trans_category_id TEXT,
p_source_wallet_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE
v_result jsonb;
v_source_acc UUID;
v_destination_acc UUID;
-- v_transaction_direction finance.transaction_direction;
v_initiator_id UUID;
v_amount NUMERIC;
-- v_providor_id UUID;
v_currency TEXT;
v_trans_type finance.transaction_type;
v_trans_category TEXT;
v_source_wallet_id UUID;
v_hint TEXT;
BEGIN
-- Check the existance of the following:
--1.source_acc
SELECT finance.check_field_existance(p_source_acc,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_source_acc:=(v_result->'data'->>'id')::UUID;
--2.destination_acc
SELECT finance.check_field_existance(p_destination_acc,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_destination_acc:=(v_result->'data'->>'id')::UUID;
--3.initiator_id
SELECT finance.check_field_existance(p_initiator_id,'finance','entities') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_initiator_id:=(v_result->'data'->>'id')::UUID;
--4.trans category name
SELECT finance.get_trans_category(p_trans_category_id) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_trans_category:=(v_result->'data'->>'cat_name')::TEXT;
--5. check currency
SELECT finance.get_currency(UPPER(TRIM(p_currency))) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_currency :=(v_result->'data'->>'code')::TEXT;
--6.check trans type enum if valid
IF NOT finance.check_enum_fields(p_trans_type, NULL::finance.transaction_type) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_trans_type
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s',array_to_string(enum_range(NULL::finance.transaction_type)::TEXT[],', '));
END IF;
    v_trans_type := p_trans_type::finance.transaction_type;
--7.check amount
IF p_amount < 0 THEN
RAISE EXCEPTION 'Invalid Amount Entered % ',p_amount
USING ERRCODE='P0001',
HINT='Amount to be transfered  cannot be negative';
END IF;
v_amount := p_amount;
--8 check providor skipped
--9.check transaction direction enum if valid
-- IF NOT finance.check_enum_fields(p_transaction_direction, NULL::finance.transaction_direction) THEN
-- RAISE EXCEPTION 'Invalid wallet type :%',p_transaction_direction
-- USING ERRCODE='P0001',
-- HINT=format('The transaction type entered is not found in the available types:%s ',array_to_string(enum_range(NULL::finance.transaction_direction)::TEXT[],', '));
-- END IF;
--     v_transaction_direction := p_transaction_direction::finance.transaction_direction;
--10 check if not null the source wallet id
v_source_wallet_id:=NULL;
IF p_source_wallet_id IS NOT NULL THEN
 SELECT finance.check_field_existance(p_source_wallet_id,'finance','wallets') INTO v_result;
 IF NOT(v_result->>'success')::boolean THEN
 RAISE EXCEPTION '%',v_result ->>'message'
 USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
 HINT =COALESCE(v_result->>'detail', 'No additional hint available');
 END IF;
v_source_wallet_id:=(v_result->'data'->>'id')::UUID;
END IF;
RETURN finance.build_response(
        true,
        jsonb_build_object(
          'source_acc',v_source_acc,
          'destination_acc',v_destination_acc,
          'intiator_id',v_initiator_id,
          'amount',v_amount,
          'currency',v_currency,
          'trans_type',v_trans_type,
          'trans_category',v_trans_category,
        --   'providor_id',v_providor_id,
          'source_wallet_id',v_source_wallet_id
        --   'transaction_direction',v_transaction_direction
        )
    );
EXCEPTION
WHEN SQLSTATE 'P0001' THEN
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
 WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
--PHASE 1 IDEMPOTENCY CHECKS
CREATE OR REPLACE FUNCTION finance.check_idempotency(
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE
v_transaction_id UUID;
v_transaction RECORD;
v_idempotency_key TEXT;
v_hint TEXT;
BEGIN
v_idempotency_key := finance.validate_name_field(
    p_idempotency_key,
    6, -- min chars
    300, --max chars
    'Idempotency Key', --name fiels
    FALSE,
    NULL, --Only letters, numbers, and underscore
    'NONE'  -- case lower case
);

-- check if a record with that key exists in the table
-- PERFORM pg_advisory_xact_lock(hashtext(v_idempotency_key));
SELECT trans_id
into v_transaction_id
FROM finance.idempotencies
WHERE
idemp_key =v_idempotency_key
AND key_status='used'
AND trans_id IS NOT NULL;

IF v_transaction_id IS NOT NULL THEN
RETURN finance.get_cached_transaction(v_transaction_id);
ELSE RETURN finance.build_response(
  true,
jsonb_build_object('key_status', 'not_used')
);
END IF;
END;
$$;
CREATE OR REPLACE FUNCTION finance.create_trans_category(
    p_cat_name TEXT,
    p_created_by_id UUID,
    p_providor_id UUID,
    p_is_active TEXT DEFAULT 'true',
    p_cat_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_result jsonb;
    v_cat_name TEXT;
    v_created_by_id UUID;
    v_is_active BOOLEAN;
    v_cat_description TEXT ;
    v_providor_id UUID;
    v_constraint_name TEXT;
    v_detail TEXT;
    v_hint TEXT;
BEGIN
v_cat_name := finance.validate_name_field(
    p_cat_name,
    2, -- min chars
    150, --max chars
    'Category Name', --name fiels
    FALSE,
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_is_active := finance.parse_boolean(p_is_active,TRUE)::boolean;
v_cat_description:=COALESCE(TRIM(p_cat_description),'');
SELECT finance.check_field_existance(p_created_by_id,'finance','administrators') INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE =COALESCE(v_result->>'error_code','P0001'),
HINT =v_result ->>'detail';
END IF;
v_created_by_id :=(v_result->'data'->>'id')::UUID;
SELECT finance.check_field_existance(p_providor_id,'finance','providors') INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE =COALESCE(v_result->>'error_code','P0001'),
HINT =v_result ->>'detail';
END IF;
v_providor_id :=(v_result->'data'->>'id')::UUID;
INSERT INTO finance.transaction_categories(
    cat_name,
    cat_description,
    is_active,
    providor_id,
    created_by
)
VALUES(
    v_cat_name,
    v_cat_description,
    v_is_active,
    v_providor_id,
    v_created_by_id
);
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'cat_name',v_cat_name,
        'cat_description',v_cat_description,
        'is_active',v_is_active,
        'created_by',v_created_by,
        'providor_id',v_providor_id
    )
);
EXCEPTION
WHEN  SQLSTATE 'P0001' THEN
BEGIN
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN unique_violation THEN
GET STACKED DIAGNOSTICS
v_constraint_name =CONSTRAINT_NAME,
v_detail =PG_EXCEPTION_DETAIL;
IF v_constraint_name ='transaction_categories_pkey' THEN
RETURN finance.build_response(
    false,
    NULL,
    'P0002',
    'transaction_category already exist',
    format('Name %s already used',v_cat_name)
);
END IF;
WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

--- Create idempotency record
CREATE OR REPLACE FUNCTION finance.create_idempotency_record(
    p_idempotency_key TEXT,
    p_trans_id UUID DEFAULT NULL,
    p_initiated_by UUID DEFAULT NULL,
    p_key_status TEXT DEFAULT 'active',
    p_api_body TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE
v_result jsonb;
v_idempotency_id UUID;
v_idempotency_key TEXT;
v_key_status finance.idemp_key_status;
v_api_body TEXT;
v_initiator_id UUID;
v_transaction_id UUID;
v_hint TEXT;
v_constraint_name TEXT;
v_detail TEXT;
BEGIN
--validate the data
v_idempotency_key := finance.validate_name_field(
    p_idempotency_key,
    6, -- min chars
    300, --max chars
    'Idempotency Key', --name fiels
    FALSE,
    NULL,-- Allows letters, numbers, spaces, underscores
    'NONE'  -- case lower case
);
v_transaction_id :=NULL;
IF p_trans_id IS NOT NULL THEN
SELECT finance.check_field_existance(p_trans_id,'finance','transactions') INTO v_result;
IF NOT (v_result ->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
ELSE
v_transaction_id:=(v_result->'data'->>'id')::UUID;
END IF;
END IF;
v_initiator_id :=NULL;
IF p_initiator_id IS NOT NULL THEN
SELECT finance.check_field_existance(p_trans_id,'finance','entities') INTO v_result;
IF NOT (v_result ->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
ELSE
v_initiator_id:=(v_result->'data'->>'id')::UUID;
END IF;
END IF;
IF NOT finance.check_enum_fields(p_key_status, NULL::finance.idemp_key_status) THEN
RAISE EXCEPTION 'Invalid account status :%',p_key_status
USING ERRCODE='P0001',
HINT=format('The account status  entered is not found in the available statuses:%s ',array_to_string(enum_range(NULL::finance.idemp_key_status)::TEXT[],', '));
END IF;
v_key_status:=p_key_status::finance.idemp_key_status;
v_api_body:=COALESCE(TRIM(p_api_body),'');
INSERT INTO finance.idempotencies (
    idemp_key,
    trans_id,
    initiated_by,
    key_status,
    api_body
)
VALUES(
    v_idempotency_key,
    v_transaction_id,
    v_initiator_id,
    v_key_status,
    v_api_body
) 
ON CONFLICT(idemp_key) DO UPDATE
SET trans_id=EXCLUDED.trans_id,
key_status=EXCLUDED.key_status
RETURNING id INTO v_idempotency_id ;
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'id',v_idempotency_id,
        'idemp_key',v_idempotency_key,
        'trans_id',v_transaction_id,
        'key_status',v_key_status
    )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN
BEGIN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN unique_violation THEN
GET STACKED DIAGNOSTICS
v_constraint_name=CONSTRAINT_NAME,
v_detail =PG_EXCEPTION_DETAIL;
IF v_constraint_name ='idempotencies_pkey' THEN
RETURN finance.build_response(
    false,
    NULL,
    'P0002',
    'There was a unique constraint violation',
    v_detail
);
END IF;
IF v_constraint_name='idempotencies_idemp_key_key' THEN
RETURN finance.build_response(
    false,
    NULL,
    'P0002',
    format('The key value %s already exists and cannot be duplicated',v_idempotency_key)
);
END IF;
WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION finance.get_fee_template(
    p_trans_type TEXT,
    p_amount NUMERIC,
    p_currency TEXT,
    p_as_of TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
STABLE
AS $$
DECLARE
    v_trans_type finance.transaction_type;
    v_currency TEXT;
    v_template RECORD;
    v_result JSONB;
    v_hint TEXT;
BEGIN
    -- Validate transaction type
    IF NOT finance.check_enum_fields(p_trans_type, NULL::finance.transaction_type) THEN
        RAISE EXCEPTION 'Invalid transaction type: %', p_trans_type
            USING ERRCODE = 'P0001',
                  HINT = format('Allowed types: %s' ,array_to_string(enum_range(NULL::finance.transaction_type)::TEXT[], ', '));
    END IF;
    v_trans_type := p_trans_type::finance.transaction_type;
SELECT finance.get_currency(UPPER(TRIM(p_currency))) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_currency :=(v_result->'data'->>'code')::TEXT;
    IF p_amount < 0 THEN
        RAISE EXCEPTION 'Amount cannot be negative: %', p_amount
            USING ERRCODE = 'P0001',
                  HINT = 'Transaction amount must be >= 0';
    END IF;
    
    -- Find active template
    SELECT * INTO v_template
    FROM finance.fee_templates
    WHERE trans_type = v_trans_type
      AND applied_to_currency = v_currency
      AND effective_from <= p_as_of
      AND effective_to >= p_as_of
      AND min_amount <= p_amount
      AND max_amount >= p_amount
    ORDER BY effective_from DESC, min_amount DESC
    LIMIT 1;
    
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'No active fee template found for transaction type: %, amount: %, currency: %', 
            p_trans_type, p_amount, v_currency
            USING ERRCODE = 'P0002',
                  HINT = 'No fee template covers this transaction amount range or currency';
    END IF;
    
    -- Build response based on calc_type
    IF v_template.calc_type = 'fixed' THEN
        RETURN finance.build_response(
            true,
            jsonb_build_object(
            'template_id', v_template.id,
            'temp_name', v_template.temp_name,
            'trans_type', v_template.trans_type,
            'calc_type', v_template.calc_type,
            'fee_amount', v_template.fee_charged,
            'charge_to', v_template.charge_to,
            'currency', v_currency,
            'percentage_rate', NULL,
            'min_amount', v_template.min_amount,
            'max_amount', v_template.max_amount,
            'effective_from', v_template.effective_from,
            'effective_to', v_template.effective_to
        ));
    ELSE -- rate
        RETURN finance.build_response(true, jsonb_build_object(
            'template_id', v_template.id,
            'temp_name', v_template.temp_name,
            'trans_type', v_template.trans_type,
            'calc_type', v_template.calc_type,
            'fee_amount', ROUND((p_amount * v_template.percentage_rate / 100), 2),
            'percentage_rate', v_template.percentage_rate,
            'charge_to', v_template.charge_to,
            'currency', v_currency,
            'min_amount', v_template.min_amount,
            'max_amount', v_template.max_amount,
            'effective_from', v_template.effective_from,
            'effective_to', v_template.effective_to
        ));
    END IF;
    
EXCEPTION
    WHEN SQLSTATE 'P0001' OR SQLSTATE 'P0002' THEN
        GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
        RETURN finance.build_response(false, NULL, SQLSTATE, SQLERRM, v_hint);
    WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
CREATE OR REPLACE FUNCTION finance.get_account_balance(p_acc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
STABLE
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH balances AS (
        SELECT
            COALESCE(SUM(CASE WHEN entry_status = 'posted' AND entry_type = 'credit' THEN entry_amount ELSE 0 END), 0) AS posted_credits,
            COALESCE(SUM(CASE WHEN entry_status = 'posted' AND entry_type = 'debit'  THEN entry_amount ELSE 0 END), 0) AS posted_debits,
            COALESCE(SUM(CASE WHEN entry_status = 'pending' AND entry_type = 'debit'  THEN entry_amount ELSE 0 END), 0) AS pending_debits
        FROM finance.ledger_entries
        WHERE acc_id = p_acc_id
    )
    SELECT jsonb_build_object(
        'account_id',       p_acc_id,
        'current_balance',  (posted_credits - posted_debits),                    -- CAN BE NEGATIVE
        'available_balance', (posted_credits - posted_debits) - pending_debits,  -- = current - hold
        'hold_balance',     pending_debits                                       -- always >= 0
    )
    INTO result
    FROM balances;

    RETURN result;
END;
$$;

--- fetch system account function 
CREATE OR REPLACE FUNCTION finance.get_system_account(
    p_acc_type TEXT
)
RETURNS JSONB 
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE
v_result RECORD;
v_acc_type finance.acc_type;
v_hint TEXT;
BEGIN 
--validate the acc type if valid 
IF NOT finance.check_enum_fields(p_acc_type,NULL::finance.acc_type)THEN 
RAISE EXCEPTION 'Enum Type Not Found:%',p_acc_type
USING ERRCODE='P0001',
HINT=format('The Enum Value entered is not found in the available enums: %s',array_to_string(enum_range(NULL::finance.acc_type)::TEXT[],', '));
END IF;
v_acc_type :=p_acc_type ::finance.acc_type;
SELECT id,acc_name,acc_status,acc_currency,acc_type INTO v_result
FROM finance.accounts f
WHERE f.acc_status='active' 
AND f.acc_type=v_acc_type
AND EXISTS(
    SELECT 1 FROM finance.entities e
    WHERE e.id=f.owner_entity_id
    AND e.entity_type IN('system')
) ;
IF v_result IS NOT NULL THEN 
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'id',v_result.id,
        'acc_name',v_result.acc_name,
        'acc_type',v_result.acc_type,
        'acc_currency',v_result.acc_currency
    )
);
ELSE 
RAISE EXCEPTION 'system account of type % could not be found',v_acc_type
USING ERRCODE='P0001',
HINT=format('The system account with type %s requested for was not found or is not active or is not a system account type try again with a valid account type',v_acc_type);
END IF;
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint=PG_EXCEPTION_HINT;
BEGIN 
RETURN finance.build_response (
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END ;
WHEN OTHERS THEN
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
--Helper Function to fetch an account based on account id 
CREATE OR REPLACE FUNCTION finance.get_account(
    p_acc_id uuid,
    p_acc_status TEXT DEFAULT 'active'
)
RETURNS JSONB 
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_acc_id UUID;
v_acc_status finance.acc_status;
v_acc_record RECORD;
v_hint TEXT;
BEGIN
---Validate the account exists 
SELECT finance.check_field_existance(p_acc_id,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_acc_id:=(v_result->'data'->>'id')::UUID;
-- check enum validity
--6.check trans type enum if valid
IF NOT finance.check_enum_fields(p_acc_status, NULL::finance.acc_status) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_acc_status
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s',array_to_string(enum_range(NULL::finance.acc_status)::TEXT[],', '));
END IF;
    v_acc_status:= p_acc_status::finance.acc_status;
--FETCH THE RECORD 
SELECT a.id AS acc_id, 
       acc_number,
       acc_name, 
       acc_type,
       owner_entity_id,
       acc_status,
       acc_currency,
       overdraft_limit,
       min_balance,
       max_balance,
       max_transfer_amount,
       min_transfer_amount,
       e.entity_type AS entity_type
       INTO v_acc_record
       FROM finance.accounts a
       INNER JOIN finance.entities e ON e.id=owner_entity_id
       WHERE a.id=v_acc_id
       AND acc_status=v_acc_status;
IF v_acc_record IS NULL THEN 
RAISE EXCEPTION 'Account with status % is not found',v_acc_status
USING ERRCODE='P0001',
HINT=format('The Account you requested of id %s and status %s could not be found  try again with different params',v_acc_id,v_acc_status);
END IF;
RETURN finance.build_response(
    true,
    jsonb_build_object(
       'id',v_acc_record.acc_id, 
       'acc_number',v_acc_record.acc_number,
       'acc_name',v_acc_record.acc_name, 
       'acc_type',v_acc_record.acc_type,
       'owner_entity_id',v_acc_record.owner_entity_id,
       'acc_status',v_acc_record.acc_status,
       'acc_currency',v_acc_record.acc_currency,
       'overdraft_limit',v_acc_record.overdraft_limit,
       'min_balance',v_acc_record.min_balance,
       'max_balance',v_acc_record.max_balance,
       'max_transfer_amount',v_acc_record.max_transfer_amount,
       'min_transfer_amount',v_acc_record.min_transfer_amount,
       'entity_type',v_acc_record.entity_type
    )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

---- Helper function to Update account balances 
CREATE OR REPLACE FUNCTION finance.update_account_balances(
p_acc_id UUID,
p_current_balance NUMERIC,
p_available_balance NUMERIC,
p_hold_balance NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_current_balance NUMERIC;
v_available_balance NUMERIC;
v_hold_balance NUMERIC;
v_acc_id UUID;
v_hint TEXT;
BEGIN
--- validate that the account exists 
SELECT finance.check_field_existance(p_acc_id,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_acc_id:=(v_result->'data'->>'id')::UUID;
--- validate balances
v_current_balance := p_current_balance;
v_available_balance := p_available_balance;
v_hold_balance := p_hold_balance;
IF v_hold_balance <0 THEN 
RAISE EXCEPTION 'Negative Balance Error'
USING ERRCODE='P0001',
HINT=format('The balance amounts  recieved for current balance: %s available balance: %s hold balance: %s cannot be negative ',v_current_balance,v_available_balance,v_hold_balance);
END IF;
UPDATE finance.accounts 
SET 
current_balance=v_current_balance,
available_balance=v_available_balance,
hold_balance =v_hold_balance,
updated_at=NOW()
WHERE id=v_acc_id
RETURNING jsonb_build_object(
    'id', id,
    'current_balance', current_balance,
    'available_balance', available_balance,
    'hold_balance', hold_balance
    ) into v_result;
RETURN finance.build_response(
    true,
    v_result
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
--- create a helper function that will return a record the specified account type the wallet id has
CREATE OR REPLACE FUNCTION finance.get_wallet_account(
    p_wallet_id UUID,
    p_acc_type TEXT,
    p_acc_status TEXT DEFAULT 'active'
    )
RETURNS JSONB 
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$ 
DECLARE 
v_wallet_acc_record RECORD;
v_result jsonb;
v_acc_type finance.acc_type;
v_acc_status finance.acc_status;
v_wallet_id UUID;
v_hint TEXT;
BEGIN
---Check the wallet id exists
SELECT finance.check_field_existance(p_wallet_id,'finance','wallets') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_wallet_id :=(v_result->'data'->>'id')::UUID;
----check the acc_type enum is valid 
IF NOT finance.check_enum_fields(p_acc_type, NULL::finance.acc_type) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_acc_type
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s ',array_to_string(enum_range(NULL::finance.acc_type)::TEXT[],', '));
END IF;
v_acc_type:=p_acc_type::finance.acc_type;
-----check account status validity
IF NOT finance.check_enum_fields(p_acc_status, NULL::finance.acc_status) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_acc_status
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s ',array_to_string(enum_range(NULL::finance.acc_status)::TEXT[],', '));
END IF;
    v_acc_status:= p_acc_status::finance.acc_status;

--perform the select and join statement
--join wallets, entities, accounts, wallet_accounts,wallet_access
SELECT 
a.id AS acc_id,
a.acc_type AS acc_type,
w.id AS wallet_id,
wal.access_level AS wallet_access_level,
w.owner_entity_id AS entity_id 
INTO v_wallet_acc_record
FROM finance.wallet_accounts wa
INNER JOIN finance.wallets w ON wa.wallet_id=w.id
INNER JOIN finance.accounts a ON wa.acc_id=a.id
INNER JOIN finance.wallet_access wal ON wa.wallet_id=wal.wallet_id
WHERE a.acc_type=v_acc_type
AND a.acc_status=v_acc_status
AND w.id=v_wallet_id;
IF v_wallet_acc_record IS NOT NULL THEN
RETURN finance.build_response(
 true,
 jsonb_build_object(
    'acc_id',v_wallet_acc_record.acc_id,
    'acc_type',v_wallet_acc_record.acc_type,
    'wallet_id',v_wallet_acc_record.wallet_id,
    'wallet_access',v_wallet_acc_record.wallet_access_level,
    'entity_id',v_wallet_acc_record.entity_id
)
);
ELSE --return a null result but true , be less restrictive
RETURN finance.build_response(
 true,
 jsonb_build_object(
    'acc_id',null,
    'acc_type',null,
    'wallet_id',null,
    'wallet_access',null,
    'entity_id',null
)
);
-- RAISE EXCEPTION 'Wallet Record is not found for the params wallet_id: % and account type: %',v_wallet_id,v_acc_type
-- USING ERRCODE ='P0001',
-- HINT='The Record requested does not exist try again with other parameters';
END IF;
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
-- Create a function to authenticate trasnaction 
CREATE OR REPLACE FUNCTION finance.authenticate_transaction(
    p_wallet_id UUID,
    p_entity_id UUID,
    p_acc_id UUID,
    p_check_wallet_access BOOLEAN default true
)
RETURNS jsonb
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_wallet_id UUID;
v_account_owner_id UUID;
v_acc_id UUID;
v_entity_id UUID;
v_hint TEXT;
v_wallet_access_level finance.wallet_access_level;
BEGIN 
---check for existance from each field first 
SELECT finance.check_field_existance(p_wallet_id,'finance','wallets') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_wallet_id:=(v_result->'data'->>'id')::UUID;
SELECT finance.check_field_existance(p_acc_id,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_acc_id:=(v_result->'data'->>'id')::UUID;
SELECT finance.check_field_existance(p_entity_id,'finance','entities') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result ->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_entity_id:=(v_result->'data'->>'id')::UUID;
v_wallet_access_level=NULL;
-----check to see the entity id has access to the wallet
IF p_check_wallet_access THEN 
SELECT finance.check_wallet_access(
v_wallet_id,
v_entity_id,
'manage'
)INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF ;
v_wallet_access_level:=(v_result ->'data'->>'access_level')::finance.wallet_access_level;
--Confirm the access level 
IF v_wallet_access_level != 'manage' THEN 
RAISE EXCEPTION 'Wallet Access Denied %',v_wallet_access_level
USING ERRCODE='P0001',
HINT:=format('The entity %s has no valid manage access level to the wallet %s ',v_entity_id,v_wallet_id);
END IF;
END IF;
------check to see that the entity is the owner of the account
SELECT finance.get_account(v_acc_id) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT= COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_account_owner_id= (v_result->'data'->>'owner_entity_id')::UUID;
IF v_account_owner_id != v_entity_id THEN 
RAISE EXCEPTION 'Account Ownership Error for Entity: %',v_entity_id
USING ERRCODE='P0001',
HINT=format('The Account Ownership Authentication failed for the account :%s and entity :%s ensure the entity owns the account before you proceed',v_acc_id,v_entity_id);
END IF;
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'wallet_id',v_wallet_id,
        'account_id',v_acc_id,
        'wallet_access',v_wallet_access_level,
        'entity_id',v_entity_id
    )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
---Function to get wallet information 
CREATE OR REPLACE FUNCTION finance.get_wallet_from_acc(
    p_acc_id uuid,
    p_wallet_status TEXT DEFAULT 'active'

)
RETURNS JSONB 
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_acc_id UUID;
v_wallet_status finance.wallet_status;
v_wallet_id UUID;
v_wallet_record RECORD;
v_hint TEXT;
BEGIN
SELECT finance.check_field_existance(p_acc_id,'finance','accounts') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_acc_id:=(v_result->'data'->>'id')::UUID;
IF NOT finance.check_enum_fields(p_wallet_status, NULL::finance.wallet_status) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_wallet_status
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s',array_to_string(enum_range(NULL::finance.wallet_status)::TEXT[],', '));
END IF;
v_wallet_status:= p_wallet_status::finance.wallet_status;
--FETCH THE RECORD
SELECT 
w.id AS wallet_id,
wallet_name,
wallet_number,
owner_entity_id,
wallet_type,
wallet_status,
wa.acc_id AS account_id 
INTO v_wallet_record 
FROM finance.wallets w
INNER JOIN finance.wallet_accounts wa ON w.id=wa.wallet_id
WHERE wa.acc_id=v_acc_id 
AND w.wallet_status=v_wallet_status;
IF v_wallet_record IS NOT NULL THEN 
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'wallet_id',v_wallet_record.wallet_id,
        'wallet_name',v_wallet_record.wallet_name,
        'wallet_number',v_wallet_record.wallet_number,
        'owner_entity_id',v_wallet_record.owner_entity_id,
        'wallet_type',v_wallet_record.wallet_type,
        'wallet_status',v_wallet_record.wallet_status,
        'account_id' ,v_wallet_record.account_id
    )
);
ELSE 
RAISE EXCEPTION 'Wallet Record is not found for the params acc_id: % and wallet status: %',v_acc_id,v_wallet_status
USING ERRCODE ='P0001',
HINT='The Record requested does not exist try again with other parameters';
END IF;
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
--Get Providor Information 
CREATE OR REPLACE FUNCTION finance.get_providor(
    p_providor_id uuid,
    p_providor_status TEXT DEFAULT 'active'
)
RETURNS JSONB 
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_providor_id UUID;
v_providor_status finance.providor_status;
v_providor_record RECORD;
v_hint TEXT;
BEGIN
---Validate the account exists 
SELECT finance.check_field_existance(p_providor_id,'finance','providors') INTO v_result;
IF NOT(v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_providor_id:=(v_result->'data'->>'id')::UUID;
IF NOT finance.check_enum_fields(p_providor_status, NULL::finance.providor_status) THEN
RAISE EXCEPTION 'Invalid wallet type :%',p_providor_status
USING ERRCODE='P0001',
HINT=format('The transaction type entered is not found in the available types: %s',array_to_string(enum_range(NULL::finance.providor_status)::TEXT[],', '));
END IF;
v_providor_status:= p_providor_status::finance.providor_status;
SELECT p.id AS providor_id,
       providor_name,
       providor_ref,
       providor_type,
       providor_acc_id,
       a.acc_name AS providor_account_name,
       providor_status
INTO v_providor_record 
FROM finance.providors p
INNER JOIN finance.accounts a ON a.id=providor_acc_id
WHERE p.id=v_providor_id;
IF v_providor_record IS NULL THEN 
RAISE EXCEPTION 'Providor with status % is not found',v_providor_status
USING ERRCODE='P0001',
HINT=format('The Providor you requested of id %s and status %s could not be found  try again with different params',v_providor_id,v_providor_status);
END IF;
RETURN finance.build_response(
    true,
    jsonb_build_object(
       'id',v_providor_record.providor_id,
       'providor_name',v_providor_record.providor_name,
       'providor_ref',v_providor_record.providor_ref,
       'providor_type',v_providor_record.providor_type,
       'providor_acc_id',v_providor_record.providor_acc_id,
       'providor_status',v_providor_record.providor_status,
       'providor_account_name',v_providor_record.providor_account_name
    )
);
EXCEPTION
WHEN SQLSTATE 'P0001' THEN 
GET STACKED DIAGNOSTICS v_hint =PG_EXCEPTION_HINT;
BEGIN
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;
----THE LEDGER ENTRY DEFINITION 
CREATE TYPE finance.ledger_entry_model AS (
    -- trans_id UUID,
    acc_id UUID,
    entry_type finance.ledger_entry_type, 
    trans_category TEXT,
    entry_amount NUMERIC,
    entry_status finance.ledger_entry_status,
    -- entry_trans_description TEXT,
    meta_data JSONB
);

CREATE OR REPLACE FUNCTION finance.process_transaction(
p_trans_type TEXT,
p_trans_amount NUMERIC,
p_currency TEXT,
p_trans_category_id TEXT,
p_initiator_id UUID,
p_source_wallet_id UUID,
p_source_acc UUID,
p_destination_acc UUID,
p_idempotency_key TEXT,
p_trans_description TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
VOLATILE
SECURITY DEFINER
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
v_trans_type finance.transaction_type;
v_trans_amount NUMERIC;
v_currency TEXT;
v_transaction_category TEXT;
v_transaction_direction finance.transaction_direction;
v_initiator_id UUID;
v_source_wallet_id UUID;
v_destination_wallet_id UUID;
v_destination_entity_id UUID;
v_source_acc UUID;
v_providor_id UUID;
v_source_overdraft_acc UUID;
v_sys_settlement_acc UUID;
v_sys_rev_acc UUID;
v_sys_fee_acc UUID;
v_system_entity_id UUID;
v_destination_acc UUID;
v_destination_overdraft_acc UUID;
v_trans_description TEXT;
v_idempotency_id UUID;
v_providor_record jsonb;
v_source_acc_record jsonb;
v_source_overdraft_record jsonb;
v_destination_acc_record jsonb;
v_destination_overdraft_record jsonb;
v_currency_record jsonb;
v_wallet_record jsonb;
v_fee_record jsonb;
v_net_credit_to_overdraft NUMERIC;
v_fee_amount NUMERIC;
v_total_debit_amount NUMERIC;
v_source_acc_balance NUMERIC;
v_destination_acc_balance NUMERIC;
v_sys_settlement_acc_balance NUMERIC;
v_deficit_amount NUMERIC;
v_source_overdraft_balance NUMERIC;
v_destination_overdraft_balance NUMERIC;
v_trans_ref_code TEXT;
v_transaction_id UUID;
v_transaction_record jsonb;
v_providor_acc_id UUID;
v_receiver_entity_id UUID;
v_hint TEXT;
v_constraint_name TEXT;
v_detail TEXT;
v_ledger_meta_data jsonb;
v_transfer_meta_data jsonb;
v_provision_id UUID; 
v_transaction_status finance.transaction_status;
v_total_overdraft_intrest NUMERIC;
v_overdraft_intrest_rate NUMERIC;
v_new_balances jsonb;
r_entry RECORD;
v_notf_tags TEXT[];

v_ledger_entries finance.ledger_entry_model[] := '{}';
BEGIN 
--PHASE 0 perform input validation 
SELECT finance.validate_transaction(
p_source_acc,
p_destination_acc ,
p_initiator_id,
p_trans_amount,
p_currency,
p_trans_type ,
p_trans_category_id,
p_source_wallet_id 
) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =v_result ->>'detail';
ELSE 
v_trans_type:=(v_result->'data'->>'trans_type')::finance.transaction_type;
v_trans_amount:=(v_result->'data'->>'amount')::NUMERIC;
v_currency:=(v_result->'data'->>'currency')::TEXT;
v_transaction_category:=(v_result->'data'->>'trans_category')::TEXT; 
v_initiator_id:=(v_result->'data'->>'intiator_id')::UUID; 
v_source_wallet_id:=(v_result->'data'->>'source_wallet_id')::UUID; 
v_source_acc:=(v_result->'data'->>'source_acc')::UUID;
v_destination_acc:=(v_result->'data'->>'destination_acc')::UUID;

END IF;
v_trans_description :=NULL;
v_ledger_meta_data := '{}'::jsonb;
v_transfer_meta_data := '{}'::jsonb;
IF p_trans_description IS NOT NULL THEN
v_trans_description= finance.validate_name_field(
    p_trans_description, 
    5, -- min chars
    400, --max chars
    'Transaction Description', --name fiels
    FALSE, 
    NULL,-- Allows letters, numbers, spaces, underscores
    'LOWER'  -- case lower case
);
END IF;
--PHASE 1 process idempotency 
SELECT finance.check_idempotency(p_idempotency_key) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
    RAISE EXCEPTION '%', v_result->>'message'
    USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
          HINT = COALESCE(v_result->>'detail', 'No additional hint');
END IF;
IF v_result->'data' ? 'transaction_id' THEN
    -- Already processed – return cached result
    RETURN v_result;
END IF;

--insert default values for some params
v_destination_overdraft_record:=NULL;
v_source_overdraft_record:=NULL;
---perform lock on the idempotency record 
-- PERFORM pg_advisory_xact_lock(hashtext(v_idempotency_id));
-- PHASE 2 Acqurie account locks first 
-- PHASE 2 Acquire account locks first
BEGIN
    -- Lock source Account (no data fetch needed)
    PERFORM 1 FROM finance.accounts WHERE id = v_source_acc FOR UPDATE;
    
    -- Lock Destination Account
    PERFORM 1 FROM finance.accounts WHERE id = v_destination_acc FOR UPDATE;
    
    -- Lock the wallet
    PERFORM 1 FROM finance.wallets WHERE id = v_source_wallet_id FOR UPDATE;

EXCEPTION 
    WHEN OTHERS THEN 
        RAISE EXCEPTION 'Failed to acquire necessary locks: %', SQLERRM
        USING ERRCODE = 'P0004',
              HINT = 'Another transaction may be holding locks on these resources';
END;

---Phase 3 check authenticity of transaction and accounts and get the overdraft accounts
-----get the destination and source acc records
SELECT finance.get_account(v_source_acc) INTO v_source_acc_record;
SELECT finance.get_account(v_destination_acc)INTO v_destination_acc_record;
-- DETERMINE DIRECTION AUTOMATICALLY
IF v_source_acc_record->'data'->>'acc_type' LIKE 'sys_%' 
   AND v_destination_acc_record->'data'->>'acc_type' NOT LIKE 'sys_%' THEN
    v_transaction_direction := 'inflow';
ELSIF v_source_acc_record->'data'->>'acc_type' NOT LIKE 'sys_%' 
   AND v_destination_acc_record->'data'->>'acc_type' LIKE 'sys_%' THEN
    v_transaction_direction := 'outflow';
ELSE
    v_transaction_direction := 'internal';
END IF;
--- check source acc authenticity if is not system account
-- IF (
--    COALESCE(v_source_acc_record->'data'->>'entity_type','') <> 'system') THEN
IF v_source_acc_record->'data'->>'entity_type' IS DISTINCT FROM 'system' THEN
SELECT finance.authenticate_transaction(
    v_source_wallet_id,
    v_initiator_id,
    v_source_acc,
    true
)INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
--GET the source overdraft 
SELECT finance.get_wallet_account( 
v_source_wallet_id,'overdraft'
)INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_source_overdraft_acc:=(v_result->'data'->>'acc_id')::UUID;
IF v_source_overdraft_acc IS NOT NULL THEN
SELECT finance.get_account(
v_source_overdraft_acc
)INTO v_source_overdraft_record;
IF NOT (v_source_overdraft_record->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_source_overdraft_record->>'message'
USING ERRCODE=v_source_overdraft_record->>'error_code',
HINT=v_source_overdraft_record->>'detail';
END IF;
END IF;
END IF;
IF v_destination_acc_record->'data'->>'entity_type' IS DISTINCT FROM 'system' THEN
--check destination acc authenticity if is not system account
SELECT finance.get_wallet_from_acc(v_destination_acc)INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_destination_wallet_id:=(v_result->'data'->>'wallet_id')::UUID;
v_destination_entity_id:=(v_result->'data'->>'owner_entity_id')::UUID;
SELECT finance.authenticate_transaction(
    v_destination_wallet_id,
    v_destination_entity_id,
    v_destination_acc,
    false --only check that the receiver owns the account only even if wallet access is not granted
)INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;


-- get the overdraft account for the receive destination wallet 
SELECT finance.get_wallet_account(
v_destination_wallet_id,'overdraft'
)INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_result->>'message'
USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_destination_overdraft_acc:=(v_result->'data'->>'acc_id')::UUID;
IF v_destination_overdraft_acc IS NOT NULL THEN
SELECT finance.get_account(
v_destination_overdraft_acc
)INTO v_destination_overdraft_record;
IF NOT (v_destination_overdraft_record->>'success')::boolean THEN 
RAISE EXCEPTION '%', v_destination_overdraft_record->>'message'
USING ERRCODE=v_destination_overdraft_record->>'error_code',
HINT=v_destination_overdraft_record->>'detail';
END IF;
END IF;
END IF;
SELECT finance.get_trans_category(v_transaction_category) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN
        RAISE EXCEPTION '%', v_result->>'message'
            USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
                  HINT = COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_providor_id:=(v_result->'data'->>'providor_id')::UUID;
SELECT finance.get_providor(v_providor_id) INTO v_result;
IF NOT(v_result->>'success')::boolean THEN
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE='P0001',
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_providor_record:=v_result->'data';
v_providor_acc_id :=(v_providor_record->>'providor_acc_id')::UUID;
SELECT finance.get_system_account('sys_settlement') INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE='P0001',
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_sys_settlement_acc:=(v_result->'data'->>'id')::UUID;
SELECT finance.get_system_account('sys_fee_income') INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE='P0001',
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_sys_fee_acc:=(v_result->'data'->>'id')::UUID;
SELECT finance.get_system_account('sys_revenue') INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE='P0001',
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_sys_rev_acc:=(v_result->'data'->>'id')::UUID;
SELECT finance.get_system_entity() INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result->>'message'
USING ERRCODE='P0001',
HINT=COALESCE(v_result->>'detail', 'No additional hint available');
END IF;
v_system_entity_id:=(v_result->'data'->>'id')::UUID;
--Phase 4 PERFORM TRANSACTION COMPUTATIONS AND PUSH ENTRIES TO THE LEDGER
-- GET the fee template 
v_total_debit_amount:= v_trans_amount;
SELECT finance.get_fee_template(
    v_trans_type::TEXT ,
    v_trans_amount,
    v_currency
) INTO v_result;
--v_total_debit_amount=v_trans_amount;
IF NOT(v_result->>'success')::boolean THEN 
--Here we donot raise an exception but instead set the fee amount record to null and assume the transaction will not be debited any fee
v_fee_amount =NULL;
ELSE 
v_fee_record := v_result->'data';
v_fee_amount := COALESCE((v_fee_record->>'fee_amount')::NUMERIC, 0);
v_total_debit_amount:= v_trans_amount+v_fee_amount;
END IF;
---Fetch the source acc Balances :
SELECT finance.get_account_balance(
v_source_acc
)INTO v_result;
-- this one is abit diff does not follow the build object , this is intentional 
v_source_acc_balance =(v_result->>'available_balance')::NUMERIC;
SELECT finance.get_account_balance(
v_destination_acc
)INTO v_result;
-- this one is abit diff does not follow the build object , this is intentional 
v_destination_acc_balance =(v_result->>'available_balance')::NUMERIC;
-- Check to see the balance and deficit 
v_deficit_amount=v_total_debit_amount-v_source_acc_balance;
IF (v_deficit_amount > 0) THEN
    -- Check if an overdraft account actually exists for this user
    IF (v_source_overdraft_acc IS NOT NULL) THEN 
    IF ((v_source_acc_record->'data'->>'overdraft_limit')::NUMERIC>=v_deficit_amount)THEN
        -- Get the real-time status of the linked overdraft account
        SELECT finance.get_account_balance(v_source_overdraft_acc) INTO v_result;
        -- Use the 'available_balance' of the credit line as the "Borrowing Power"
        v_source_overdraft_balance := (v_result->>'available_balance')::NUMERIC;

        -- Check if the borrowing power covers the deficit
        IF (v_source_overdraft_balance < v_deficit_amount) THEN 
            RAISE EXCEPTION 'Insufficient Funds: Deficit exceeds overdraft limit'
            USING ERRCODE = 'P0001',
            HINT = format(
                'Account needs %s. Overdraft only has %s available. Total gap: %s',
                v_deficit_amount, 
                v_source_overdraft_balance, 
                (v_deficit_amount - v_source_overdraft_balance)
            );
        END IF;
        v_ledger_meta_data:=jsonb_build_object(
                            'providor_id',v_providor_id,
                            'providor_name',v_providor_record->>'providor_name',
                            'initiated_at',Now(),
                            'deficit_amount',v_deficit_amount
        );
        -- If we reach here, we have enough funds 
        -- Prepare to Move funds: [Overdraft Acc] -> [Source Acc] -> [Destination] but this will happen after inserting a transaction record 
    v_ledger_entries:= array_append(v_ledger_entries,
      ROW(v_source_overdraft_acc,
       'debit', 
       v_transaction_category, 
       v_deficit_amount,
       'pending',
       jsonb_build_object('overdraft_meta_data',v_ledger_meta_data))::finance.ledger_entry_model);
    v_ledger_entries:= array_append(v_ledger_entries,
      ROW( 
     v_sys_settlement_acc,
      'credit', 
      v_transaction_category, 
      v_deficit_amount,
      'pending',
      jsonb_build_object('overdraft_meta_data',v_ledger_meta_data))::finance.ledger_entry_model);
    v_ledger_entries:=array_append(v_ledger_entries,
      ROW( v_sys_settlement_acc,
      'debit', 
      v_transaction_category, 
      v_deficit_amount,
      'pending',
      jsonb_build_object('overdraft_meta_data',v_ledger_meta_data))::finance.ledger_entry_model);
    v_ledger_entries:= array_append(v_ledger_entries,
      ROW( v_source_acc,
      'credit', 
      v_transaction_category,
      v_deficit_amount,
       'pending',
       jsonb_build_object('overdraft_meta_data',v_ledger_meta_data))::finance.ledger_entry_model);
        ELSE
        -- No overdraft linked at all
        RAISE EXCEPTION 'Deficit Amount Exceeds Overdraft'
        USING ERRCODE = 'P0001',
        HINT = format('Account %s has a deficit of %s and has exceeded the account overdraft limit.', v_source_acc, v_deficit_amount);
    END IF;
    ELSE
    v_notf_tags := ARRAY['accounts',v_deficit_amount::TEXT, 'balance'];
        -- No overdraft linked at all
       SELECT finance.create_accounting_notification(
        p_to_entity_id:=v_initiator_id,
        p_notification_msg:=format('Your account has a deficit of %s and no linked overdraft and is unable to process your transaction at the time.', v_deficit_amount),
        p_notification_title:='INSUFFICIENT FUNDS',
        p_tags:=v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
       ELSE 
        RAISE EXCEPTION 'Insufficient Funds: No overdraft facility available'
        USING ERRCODE = 'P0001',
        HINT = format('Account %s has a deficit of %s and no linked overdraft.', v_source_acc, v_deficit_amount);
       END IF;
    END IF;
END IF;
---check account limits first for source and destination to ensure the transaction bandwidth is ok 
IF v_trans_amount < ((v_source_acc_record->'data'->>'min_transfer_amount')::NUMERIC) THEN 
     v_notf_tags := ARRAY['accounts',v_trans_amount::TEXT, 'min_acc_limit'];
        -- No overdraft linked at all
       SELECT finance.create_accounting_notification(
        p_to_entity_id:=v_initiator_id,
        p_notification_msg:='Your transaction falls below the account minimum transfer amount and is unable to process your transaction at the time.',
        p_notification_title:='ACC MIN THRESHOLD REACHED',
        p_tags:=v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
       ELSE 
        RAISE EXCEPTION 'Min Transfer Amount Error '
        USING ERRCODE = 'P0001',
        HINT = format('Account %s is not able to transfer amounts less than %s .', v_source_acc,(v_source_acc_record->'data'->>'min_transfer_amount'));
       END IF;
END IF;
IF v_trans_amount > ((v_source_acc_record->'data'->>'max_transfer_amount')::NUMERIC) THEN 
    v_notf_tags := ARRAY['accounts',v_trans_amount::TEXT, 'max_acc_limit'];
        -- No overdraft linked at all
       SELECT finance.create_accounting_notification(
        p_to_entity_id:=v_initiator_id,
        p_notification_msg:='Your transaction exceed the maximum transfer amount and is unable to process your transaction at the time.',
        p_notification_title:='MAX ACC THRESHOLD REACHED',
        p_tags:=v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
    ELSE
    RAISE EXCEPTION 'MAX Transfer Amount Error '
        USING ERRCODE = 'P0001',
        HINT = format('Account %s is not able to transfer amounts more than %s.', 
                      v_source_acc, 
                      (v_source_acc_record->'data'->>'max_transfer_amount'));
END IF;
END IF;
IF (v_destination_acc_balance + v_trans_amount) > ((v_destination_acc_record->'data'->>'max_balance')::NUMERIC) THEN 
        v_notf_tags := ARRAY['accounts',v_trans_amount::TEXT, 'max_acc_balance'];
        -- No overdraft linked at all
       SELECT finance.create_accounting_notification(
        p_to_entity_id:=v_initiator_id,
        p_notification_msg:='Your transaction exceed the maximum balance amount your account can hold and is unable to process your transaction at the time.',
        p_notification_title:='MAX BALANCE ERROR',
        p_tags:=v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
    ELSE 
    RAISE EXCEPTION 'MAX Balance Amount Error '
        USING ERRCODE = 'P0001',
        HINT = format('Account %s is not able to have a balance that amounts to more than %s.', 
                      v_destination_acc, 
                      (v_destination_acc_record->'data'->>'max_balance'));
END IF;
END IF;
--PHASE 5: DATA INSERTION
-- create a transaction record with pending status
v_transfer_meta_data:=jsonb_build_object(
    'initiated_at',Now(),
    'providor_name',v_providor_record->>'providor_name',
    'providor_id',v_providor_id,
    'initiated_by',v_initiator_id
) ;
INSERT INTO finance.transactions
     (
        trans_type,
        trans_amount,
        currency,
        trans_description,
        -- providor_id,
        initiator_id,
        source_wallet_id,
        source_acc,
        destination_acc,
        meta_data,
        trans_status
    )
    VALUES(
        v_trans_type,
        v_trans_amount,
        v_currency,
        v_trans_description,
        -- v_providor_id,
        v_initiator_id,
        v_source_wallet_id,
        v_source_acc,
        v_destination_acc,
        jsonb_build_object(
            'requested_at', now()
        ),
        'pending'
    )RETURNING  id ,trans_status, ref_code INTO v_transaction_id,v_transaction_status, v_trans_ref_code;

IF v_transaction_id IS NULL THEN 
RAISE EXCEPTION 'Error Inserting transaction Record'
USING ERRCODE='P0001',
HINT=format('Something went wrong while inserting the record %s',SQLERRM);
END IF;
--MAKE A PROVISION ENTRY
INSERT INTO finance.transaction_provisions (
trans_id,
providor_id,
transaction_amount,
direction,
external_trans_status,
meta_data 
)
VALUES (
v_transaction_id,
v_providor_id,
v_trans_amount,
v_transaction_direction,
'processing',
jsonb_build_object(
    'called at :',Now()
)
) RETURNING id INTO v_provision_id;
IF v_provision_id IS NULL THEN 
RAISE EXCEPTION 'Error Making Provision'
USING ERRCODE='P0001',
HINT=format('Something went wrong while inserting the provision record %s',SQLERRM);
END IF;

---PREPARE LEDGER ENTRY INSERTIONS 
---source account to providor

IF v_transaction_direction = 'inflow' THEN
    -- 1. External money arrives into clearing
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_source_acc, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    -- 2. Move from clearing → settlement
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_source_acc, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    -- 3. Final move settlement → destination (user)
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    v_ledger_entries := array_append(v_ledger_entries,
       ROW(v_destination_acc, 'credit', v_transaction_category, v_trans_amount, 'pending',
          jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

ELSIF v_transaction_direction = 'outflow' THEN
    -- 1. Debit user
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_source_acc, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    -- 2. Credit settlement (money now in pool)
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    -- 3. Debit settlement → external payout
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    -- 4. Credit destination (external provider / MPESA) THIS AMOUNT would not be held to be subject to overdraft since the destination account is the system account 
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_destination_acc, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

ELSE -- internal P2P
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_source_acc, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_providor_acc_id, 'debit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);

    v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_destination_acc, 'credit', v_transaction_category, v_trans_amount, 'pending',
              jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
END IF;

-- Fee handling
IF v_fee_record IS NOT NULL THEN
    IF lower(v_fee_record->>'charge_to') IN ('sender','both') THEN
        v_ledger_entries := array_append(v_ledger_entries,
              ROW(v_source_acc, 'debit', v_transaction_category, v_fee_amount, 'pending',
                  jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
        v_ledger_entries := array_append(v_ledger_entries,
              ROW(v_sys_fee_acc, 'credit', v_transaction_category, v_fee_amount, 'pending',
                  jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
    END IF;

    IF lower(v_fee_record->>'charge_to') IN ('receiver','both') THEN
        v_ledger_entries := array_append(v_ledger_entries,
              ROW(v_destination_acc, 'debit', v_transaction_category, v_fee_amount, 'pending',
                  jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
        v_ledger_entries := array_append(v_ledger_entries,
              ROW(v_sys_fee_acc, 'credit', v_transaction_category, v_fee_amount, 'pending',
                  jsonb_build_object('transfer', v_transfer_meta_data))::finance.ledger_entry_model);
    END IF;
END IF;

---CHECK TO SEE IF DESTINATION ACCOUNT HAS UNSETTLED BALANCES OVERDRAFT SETTLING HAPPENS HERE
v_deficit_amount := 0;
v_total_overdraft_intrest := 0;

IF v_destination_overdraft_acc IS NOT NULL THEN
    SELECT finance.get_account_balance(v_destination_overdraft_acc) INTO v_result;
    v_destination_overdraft_balance := (v_result->>'available_balance')::NUMERIC;
    -- Deficit = how much is still owed (max_balance - current available on overdraft account)
    v_deficit_amount := GREATEST(0, 
        (v_destination_overdraft_record->'data'->>'max_balance')::NUMERIC 
        - v_destination_overdraft_balance
    );
    IF (v_deficit_amount > 0) THEN
        --THIS MEANS WE HAVE A DEBT;
        v_overdraft_intrest_rate := 0.01;
        v_net_credit_to_overdraft:=v_deficit_amount;
        v_total_overdraft_intrest := v_net_credit_to_overdraft * v_overdraft_intrest_rate;
        --THEN CHECK TO SEE HOW MUCH THE USER IS GOING TO RECEIVE AND DECIDE HOW MUCH WILL BE DEDUCTED from that amount the user will receive 
         IF (v_trans_amount < (v_deficit_amount+v_total_overdraft_intrest)) THEN --This might always be true due to the nature of taking overdrafts
         v_total_overdraft_intrest:=(v_trans_amount*v_overdraft_intrest_rate);
         v_net_credit_to_overdraft:= v_trans_amount - v_total_overdraft_intrest;
         END IF;
        v_notf_tags := ARRAY['accounts',v_trans_amount::TEXT, 'overdraft settlement',v_deficit_amount::TEXT,v_overdraft_intrest_rate::TEXT];
       SELECT finance.create_accounting_notification(
        p_to_entity_id:=v_destination_entity_id,
        p_notification_msg:= format(
            'Overdraft settlement was triggered to repay a overdraft debt of %s , amount %s  with an intrest of %s from transaction amount %s was taken to settle this debt, to opt out of the service please deactivate overdraft account using your wallet thank you',
                 v_deficit_amount::TEXT, v_net_credit_to_overdraft::TEXT, v_total_overdraft_intrest::TEXT,v_trans_amount::TEXT
            ),
        p_notification_title:='OVERDRAFT SETTLEMENT',
        p_tags:=v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
       END IF;
     -- Repay principal: destination pays back to its own overdraft account
     v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_destination_acc,
              'debit',
              v_transaction_category,
              v_net_credit_to_overdraft,
              'pending',
              jsonb_build_object('overdraft_repayment', true))::finance.ledger_entry_model);

     v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_destination_overdraft_acc,
              'credit',
              v_transaction_category,
              v_net_credit_to_overdraft,
              'pending',
              jsonb_build_object('overdraft_repayment', true))::finance.ledger_entry_model);

     -- Charge interest on the repaid amount → system revenue
     v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_destination_acc,
              'debit',
              v_transaction_category,
              v_total_overdraft_intrest,
              'pending',
              jsonb_build_object('overdraft_interest', true))::finance.ledger_entry_model);

     v_ledger_entries := array_append(v_ledger_entries,
          ROW(v_sys_rev_acc,
              'credit',
              v_transaction_category,
              v_total_overdraft_intrest,
              'pending',
              jsonb_build_object('overdraft_interest', true))::finance.ledger_entry_model);

    END IF;
END IF;

BEGIN
    -- Force safe defaults
    v_ledger_meta_data := jsonb_build_object('entry_made_at', Now());

    INSERT INTO finance.ledger_entries
    (
        trans_id, 
        acc_id, 
        entry_type, 
        trans_category,
        entry_amount, 
        entry_status,
        meta_data,
        entry_made_by,
        posted_at
    )
    SELECT 
        v_transaction_id,
        u.acc_id, 
        u.entry_type, 
        u.trans_category,
        u.entry_amount, 
        u.entry_status,
        COALESCE(u.meta_data, '{}'::jsonb) || v_ledger_meta_data,
        v_system_entity_id,
        Now()
    FROM unnest(v_ledger_entries) AS u;

    IF v_fee_record IS NOT NULL AND v_sys_fee_acc IS NOT NULL THEN
        INSERT INTO finance.applied_fees (
            temp_id,
            trans_id,
            ledger_entry_id,
            amount_applied,
            currency
        )
        SELECT 
            (v_fee_record->>'template_id')::UUID,
            v_transaction_id,
            le.id,
            le.entry_amount,
            v_currency
        FROM finance.ledger_entries le
        WHERE le.trans_id = v_transaction_id
          AND le.acc_id = v_sys_fee_acc
          AND le.entry_type = 'credit'
        LIMIT 1;                     -- safety in case of duplicates
    END IF;
    UPDATE finance.transactions 
    SET trans_status = 'processing' 
    WHERE id = v_transaction_id;
    FOR r_entry IN (
        SELECT DISTINCT acc_id 
        FROM unnest(v_ledger_entries) AS u
    ) 
    LOOP
        SELECT finance.get_account_balance(r_entry.acc_id) INTO v_new_balances;

        SELECT finance.update_account_balances(
            r_entry.acc_id,
            (v_new_balances->>'current_balance')::NUMERIC,
            (v_new_balances->>'available_balance')::NUMERIC,
            (v_new_balances->>'hold_balance')::NUMERIC
        ) INTO v_result;

        IF NOT (v_result->>'success')::boolean THEN 
            RAISE EXCEPTION '%', v_result
            USING ERRCODE = COALESCE(v_result->>'error_code','P0001'),
                  HINT = COALESCE(v_result->>'detail', 'No additional hint available');
        END IF;
    END LOOP;

EXCEPTION 
    WHEN OTHERS THEN
        UPDATE finance.transactions 
        SET trans_status = 'failed',
            updated_at = Now(),
            meta_data = jsonb_build_object(
                'Failed At', Now(),
                'Message', 'Ledger Processing Failed',
                'details', SQLERRM,
                'sqlstate', SQLSTATE
            )
        WHERE id = v_transaction_id;

        RETURN finance.build_response(
            false, NULL, 'P0004',
            'Error: ' || SQLERRM,
            'Detail: ' || SQLSTATE
        );
END;
SELECT finance.create_idempotency_record(p_idempotency_key,
v_transaction_id,
v_initiator_id) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
    RAISE EXCEPTION '%', v_result->>'message'
    USING ERRCODE = COALESCE(v_result->>'error_code', 'P0001'),
          HINT = COALESCE(v_result->>'detail', 'No additional hint');
END IF;
v_idempotency_id = (v_result->'data'->>'id')::UUID;
v_notf_tags := ARRAY['accounts',v_trans_amount::TEXT, 'Processing transaction'];
SELECT finance.create_accounting_notification(
       p_to_entity_id:= v_initiator_id,
       p_notification_msg:=format('Transaction Has been Received and Is being Processed for transaction %s and category check ref code %s to follow up thank you!',v_trans_type, v_trans_ref_code),
        p_notification_title:='TRANSACTION PROCESSING',
       p_tags:= v_notf_tags
       ) INTO v_result;
       IF NOT (v_result->>'success')::boolean THEN 
       RAISE EXCEPTION '%',v_result->>'message'
       USING ERRCODE =(COALESCE(v_result->>'error_code'),'P0001'),
       HINT=v_result->>'detail';
       END IF;

RETURN finance.build_response(
    true,
    jsonb_build_object(
        'transaction_id',v_transaction_id,
        'transaction_status',v_transaction_status,
        'provision_id',v_provision_id,
        'transaction_type',v_trans_type,
        'idempotency_key',p_idempotency_key
    )
);
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint= PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0004',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;


CREATE OR REPLACE FUNCTION finance.finalize_transaction(
    p_transaction_id UUID,
    p_transaction_status TEXT,
    p_idempotency_key TEXT,
    p_res_payload TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
DECLARE 
v_result jsonb;
r_entry RECORD;
v_new_balances jsonb;
v_transaction_status finance.transaction_status;
v_ledger_entry_status finance.ledger_entry_status;
v_idempotency_key_status finance.idemp_key_status;
v_transaction_id UUID;
v_hint TEXT;
BEGIN 
----Validation as usual let it fail early than ruin the whole process
SELECT finance.check_field_existance(p_transaction_id,'finance','transactions') INTO v_result;
 IF NOT(v_result->>'success')::boolean THEN
 RAISE EXCEPTION '%',v_result ->>'message'
 USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
 HINT =COALESCE(v_result->>'detail', 'No additional hint available');
 END IF;
IF NOT finance.check_enum_fields(p_transaction_status, NULL::finance.transaction_status) THEN
RAISE EXCEPTION 'Invalid transaction status :%',p_transaction_status
USING ERRCODE='P0001',
HINT=format('The transaction status received is not found in the available types: %s',array_to_string(enum_range(NULL::finance.transaction_status)::TEXT[],', '));
END IF;
v_transaction_status:=p_transaction_status::finance.transaction_status;

----Check if the transaction status is finalized?
IF v_transaction_status ='completed' THEN 
UPDATE finance.idempotencies 
SET key_status='used',
updated_at=Now()
WHERE idemp_key=p_idempotency_key;

UPDATE finance.transaction_provisions
SET external_trans_status='completed',
updated_at=Now()
WHERE trans_id=v_transaction_id;

UPDATE finance.ledger_entries 
SET entry_status='posted',
updated_at=Now(),
meta_data=meta_data ||jsonb_build_object(
    'posted at',Now()
)
WHERE trans_id=v_transaction_id;
FOR r_entry IN (
        SELECT DISTINCT acc_id 
        FROM finance.ledger_entries 
        WHERE trans_id = v_transaction_id
    ) 
LOOP
SELECT finance.get_account_balance(r_entry.acc_id) INTO v_new_balances;
SELECT finance.update_account_balances(
    r_entry.acc_id,
    (v_new_balances->>'current_balance')::NUMERIC,
    (v_new_balances->>'available_balance')::NUMERIC,
    (v_new_balances->>'hold_balance')::NUMERIC

) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;

END LOOP;

UPDATE finance.transactions
SET trans_status='completed',
updated_at=Now(),
meta_data=meta_data ||jsonb_build_object(
    'finalized at',Now()
)
WHERE id=v_transaction_id;
ELSE
UPDATE finance.idempotencies 
SET key_status='used',
updated_at=Now()
WHERE idemp_key=p_idempotency_key;

UPDATE finance.transaction_provisions
SET external_trans_status='failed',
updated_at=Now()
WHERE trans_id=v_transaction_id;

UPDATE finance.ledger_entries 
SET entry_status='failed',
updated_at=Now(),
meta_data=meta_data ||jsonb_build_object(
    'failed at',Now()
)
WHERE trans_id=v_transaction_id;
FOR r_entry IN (
        SELECT DISTINCT acc_id 
        FROM finance.ledger_entries 
        WHERE trans_id = v_transaction_id
    ) 
LOOP
SELECT finance.get_account_balance(r_entry.acc_id) INTO v_new_balances;
SELECT finance.update_account_balances(
    r_entry.acc_id,
    (v_new_balances->>'current_balance')::NUMERIC,
    (v_new_balances->>'available_balance')::NUMERIC,
    (v_new_balances->>'hold_balance')::NUMERIC

) INTO v_result;
IF NOT (v_result->>'success')::boolean THEN 
RAISE EXCEPTION '%',v_result
USING ERRCODE=COALESCE(v_result->>'error_code','P0001'),
HINT =COALESCE(v_result->>'detail', 'No additional hint available');
END IF;

END LOOP;

UPDATE finance.transactions
SET trans_status='failed',
updated_at=Now(),
meta_data=meta_data ||jsonb_build_object(
    'finalized at',Now()
)
WHERE id=v_transaction_id;
END IF;
RETURN finance.build_response(
    true,
    jsonb_build_object(
        'transaction_id',v_transaction_id
    )
);
EXCEPTION 
WHEN SQLSTATE 'P0001' THEN 
BEGIN
GET STACKED DIAGNOSTICS v_hint= PG_EXCEPTION_HINT;
RETURN finance.build_response(
    false,
    NULL,
    SQLSTATE,
    SQLERRM,
    v_hint
);
END;
WHEN OTHERS THEN 
 RETURN finance.build_response(
        false, NULL, 'P0003',
        'Error: ' || SQLERRM,   -- actual message
        'Detail: ' || SQLSTATE
    );
END;
$$;

SET search_path TO finance;
DROP TRIGGER IF EXISTS trg_validate_admin_entity ON finance.administrators;
DROP TRIGGER IF EXISTS trg_validate_member_creation ON finance.members;
DROP TRIGGER IF EXISTS trg_validate_created_accounts ON finance.accounts;
DROP TRIGGER IF EXISTS trg_validate_created_wallet ON finance.wallets;


CREATE OR REPLACE FUNCTION finance.check_admin_entity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
BEGIN
   IF NOT EXISTS(
    SELECT 1 FROM finance.entities e
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
CREATE OR REPLACE FUNCTION finance.check_member_created_by()
RETURNS trigger
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS $$
BEGIN
   IF NOT EXISTS (
    SELECT 1 FROM finance.entities e
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
CREATE OR REPLACE FUNCTION finance.check_created_account()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
BEGIN
   IF EXISTS(
    SELECT 1 
    FROM finance.administrators a
    WHERE a.id =NEW.owner_entity_id
   )
   THEN
   RAISE EXCEPTION 'Invalid Admin Account Ownership'
    USING 
    ERRCODE = 'P0001', 
    HINT = 'Account cannot be owned by an administrator entity';
   END IF;
   --account creation must be created by system or admin enties except savings accounts 
IF NEW.acc_type IN ('personal','overdraft','group','organization','escrow','loan','project') THEN
     IF NOT EXISTS(SELECT 1 FROM finance.entities e WHERE e.id=NEW.created_by AND e.entity_type IN('system','administrator') )THEN
            RAISE EXCEPTION 'Invalid account type created by : must be admin or system'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'Account creation is only supported by system or admin entities with an exception of savings accounts ';
     END IF;
END IF;
  ---system account type logic below
IF NEW.acc_type IN ('sys_revenue','sys_clearing','sys_fee_income','sys_settlement') THEN
    IF NOT EXISTS(SELECT 1 FROM finance.entities e WHERE e.id = NEW.owner_entity_id AND e.entity_type='system') THEN --system accounts to be owned by system entity
             RAISE EXCEPTION 'Invalid System Account Ownership'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'System accounts can only be owned by system entity';
    END IF;
   IF NOT EXISTS(SELECT 1 FROM finance.administrators e WHERE e.id=NEW.created_by) THEN -- system accounts to be created by admins
             RAISE EXCEPTION 'Invalid System Account Creator type : must be created by an admin entity'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'system Accounts only be created by system administrator entity';
    END IF;
ELSE 
IF EXISTS(SELECT 1 FROM finance.entities e WHERE e.id = NEW.owner_entity_id AND e.entity_type='system') THEN --ensure system does not own other accounts that are not system related 
    RAISE EXCEPTION 'Invalid Non System Accounts : cannot be owned by system entity'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'Non-system accounts cannot be owned by system entity';
END IF;
END IF;
    -- ensure member entities only own by member accounts
    IF EXISTS(SELECT 1 FROM finance.entities e WHERE e.id =NEW.owner_entity_id AND e.entity_type='member')THEN
        IF NEW.acc_type NOT IN ('personal','overdraft','project','savings')THEN 
             RAISE EXCEPTION 'Invalid Member Account Ownership'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'The member entity cannot own a/an'||New.acc_type||' check documentation for valid account type ownership rules';
        END IF;
    END IF;
    -- ensure group entities only own group accounts
    IF EXISTS(SELECT 1 FROM finance.entities e WHERE e.id =NEW.owner_entity_id AND e.entity_type='group')THEN
       IF NEW.acc_type NOT IN ('group','escrow','project','loan','savings','overdraft')THEN 
             RAISE EXCEPTION 'Invalid Group Account Ownership'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'The group entity cannot own a/an '||New.acc_type||' check documentation for valid account type ownership rules';
        END IF;
    END IF;
        -- ensure group entities only own group accounts
    IF EXISTS(SELECT 1 FROM finance.entities e WHERE e.id =NEW.owner_entity_id AND e.entity_type='organization')THEN
       IF NEW.acc_type NOT IN ('group','personal','project','loan','savings','overdraft')THEN 
             RAISE EXCEPTION 'Invalid Organization Account Ownership'
             USING 
             ERRCODE = 'P0001', 
             HINT = 'The organization entity cannot own a/an '||New.acc_type||' check documentation for valid account type ownership rules';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ ;

CREATE OR REPLACE FUNCTION finance.check_created_wallet()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_owner_type finance.entity_type;
BEGIN
    -- Get the entity type of the owner
    SELECT entity_type INTO v_owner_type
    FROM finance.entities
    WHERE id = NEW.owner_entity_id;
    -- System and administrator cannot own wallets
    IF v_owner_type IN ('system', 'administrator') THEN
        RAISE EXCEPTION 'Invalid wallet ownership: system or administrator cannot own wallets'
            USING ERRCODE = 'P0001',
            HINT = 'Wallets can only be owned by members, groups, or organizations';
    END IF;
    
    -- Validate allowed combinations
    IF v_owner_type = 'member' THEN
        IF NEW.wallet_type NOT IN ('personal', 'project') THEN
            RAISE EXCEPTION 'Invalid wallet type for member: %', NEW.wallet_type
                USING ERRCODE = 'P0001',
                HINT = 'Members can only own personal or project wallets';
        END IF;
    ELSIF v_owner_type = 'group' THEN
        IF NEW.wallet_type NOT IN ('group', 'project') THEN
            RAISE EXCEPTION 'Invalid wallet type for group: %', NEW.wallet_type
                USING ERRCODE = 'P0001',
                HINT = 'Groups can only own group or project wallets';
        END IF;
    ELSIF v_owner_type = 'organization' THEN
        IF NEW.wallet_type NOT IN ('personal', 'group', 'project') THEN
            RAISE EXCEPTION 'Invalid wallet type for organization: %', NEW.wallet_type
                USING ERRCODE = 'P0001',
                HINT = 'Organizations can own personal, group, or project wallets';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ ;


CREATE OR REPLACE FUNCTION finance.check_linked_account_wallet()
RETURNS trigger
LANGUAGE plpgsql 
SET search_path = finance, pg_catalog
AS
$$
DECLARE
    v_acc_owner_id UUID;
    v_wallet_owner_id UUID;
    v_acc_type finance.acc_type;
    v_wallet_type finance.wallet_type;
BEGIN
    -- Get account details
    SELECT owner_entity_id, acc_type 
    INTO v_acc_owner_id, v_acc_type
    FROM finance.accounts
    WHERE id = NEW.acc_id;
    
    -- Check if account exists
    IF v_acc_owner_id IS NULL THEN
        RAISE EXCEPTION 'Account not found: %', NEW.acc_id
            USING ERRCODE = 'P0001',
            HINT = 'The account ID does not exist in finance.accounts';
    END IF;
    
    -- Get wallet details
    SELECT owner_entity_id, wallet_type 
    INTO v_wallet_owner_id, v_wallet_type
    FROM finance.wallets
    WHERE id = NEW.wallet_id;
    
    -- Check if wallet exists
    IF v_wallet_owner_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found: %', NEW.wallet_id
            USING ERRCODE = 'P0001',
            HINT = 'The wallet ID does not exist in finance.wallets';
    END IF;
    
    -- Validate ownership: account and wallet must have same owner
    IF v_acc_owner_id != v_wallet_owner_id THEN
        RAISE EXCEPTION 'Account and wallet ownership mismatch'
            USING ERRCODE = 'P0001',
            HINT = format('Account owner: %s, Wallet owner: %s', v_acc_owner_id, v_wallet_owner_id);
    END IF;
    
    -- Validate account type compatibility with wallet type
    IF v_wallet_type = 'personal' THEN 
        IF v_acc_type NOT IN ('personal', 'overdraft', 'savings') THEN 
            RAISE EXCEPTION 'Invalid account type for personal wallet'
                USING ERRCODE = 'P0001',
                HINT = format('Personal wallet cannot hold %s accounts', v_acc_type);
        END IF;
        
    ELSIF v_wallet_type = 'group' THEN 
        IF v_acc_type NOT IN ('group', 'overdraft', 'savings', 'escrow') THEN 
            RAISE EXCEPTION 'Invalid account type for group wallet'
                USING ERRCODE = 'P0001',
                HINT = format('Group wallet cannot hold %s accounts', v_acc_type);
        END IF;
        
    ELSIF v_wallet_type = 'project' THEN 
        IF v_acc_type NOT IN ('project', 'overdraft', 'escrow') THEN 
            RAISE EXCEPTION 'Invalid account type for project wallet'
                USING ERRCODE = 'P0001',
                HINT = format('Project wallet cannot hold %s accounts', v_acc_type);
        END IF;
        
    ELSIF v_wallet_type = 'organization' THEN 
        IF v_acc_type NOT IN ('personal', 'overdraft', 'escrow', 'loan', 'savings') THEN 
            RAISE EXCEPTION 'Invalid account type for organization wallet'
                USING ERRCODE = 'P0001',
                HINT = format('Organization wallet cannot hold %s accounts', v_acc_type);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_created_wallet
BEFORE INSERT OR UPDATE ON finance.wallets
FOR EACH ROW
EXECUTE FUNCTION finance.check_created_wallet();

CREATE TRIGGER trg_validate_created_accounts
BEFORE INSERT OR UPDATE ON finance.accounts 
FOR EACH ROW
EXECUTE FUNCTION finance.check_created_account();

CREATE TRIGGER trg_validate_member_creation
BEFORE INSERT OR UPDATE ON finance.members
FOR EACH ROW 
EXECUTE FUNCTION finance.check_member_created_by();

CREATE TRIGGER trg_validate_admin_entity
BEFORE INSERT OR UPDATE ON finance.administrators
FOR EACH ROW 
EXECUTE FUNCTION finance.check_admin_entity();

DROP TRIGGER IF EXISTS trg_validate_linked_wallet_account ON finance.wallet_accounts;
CREATE TRIGGER trg_validate_linked_wallet_account
BEFORE INSERT OR UPDATE ON finance.wallet_accounts
FOR EACH ROW
EXECUTE FUNCTION finance.check_linked_account_wallet();
------THIS IS THE END OF THE FUNCTION