
INSERT INTO public.entities (entity_type, entity_name, entity_status)
VALUES ('system', 'TrustLoop System', 'active')
ON CONFLICT (entity_type) WHERE entity_type = 'system' DO NOTHING;

-- Insert Kenyan Shilling (adjust code/numeric values as needed)
INSERT INTO finance.currencies (code, numeric_code, curr_name, symbol, is_active)
VALUES ('KES', +254, 'Kenyan Shilling', 'KSh', true)
ON CONFLICT (code) DO NOTHING;

-- If you need USD, add it too
INSERT INTO finance.currencies (code, numeric_code, curr_name, symbol, is_active)
VALUES ('USD', 840, 'US Dollar', '$', true)
ON CONFLICT (code) DO NOTHING;
-- Create the system entity (if not already created by your schema)

-- ============================================================
-- SEED SCRIPT – REMAINING ESSENTIAL DATA
-- (Excludes system entity and currencies – already executed)
-- ============================================================

-- 1. Ensure an administrator entity exists (needed as creator for system accounts)
DO $$
DECLARE
    v_system_entity_id UUID;
    v_admin_entity_id UUID;
BEGIN
    -- Get system entity (must exist already)
    SELECT id INTO v_system_entity_id FROM public.entities WHERE entity_type = 'system' LIMIT 1;

    -- Insert administrator entity (if not exists)
    INSERT INTO public.entities (entity_type, entity_name, entity_status)
    VALUES ('administrator', 'System Admin', 'active')
    ON CONFLICT (entity_name) WHERE entity_type = 'administrator' DO NOTHING
    RETURNING id INTO v_admin_entity_id;

    -- If we didn't insert, fetch existing
    IF v_admin_entity_id IS NULL THEN
        SELECT id INTO v_admin_entity_id FROM public.entities WHERE entity_type = 'administrator' LIMIT 1;
    END IF;

    -- Ensure administrators table has a corresponding row
    INSERT INTO public.administrators (id, admin_role, user_name)
    VALUES (v_admin_entity_id, 'sys_admin', 'system_admin')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create all system accounts using the admin as creator
    -- Settlement account
    INSERT INTO finance.accounts (
        acc_name,
        acc_type,
        owner_entity_id,
        acc_status,
        acc_currency,
        max_balance,
        created_by
    )
    VALUES (
        'System Settlement Account',
        'sys_settlement',
        v_system_entity_id,
        'active',
        'KES',
        100000000,
        v_admin_entity_id
    )
    ON CONFLICT (acc_type) WHERE acc_type = 'sys_settlement' DO NOTHING;

    -- Revenue account
    INSERT INTO finance.accounts (
        acc_name,
        acc_type,
        owner_entity_id,
        acc_status,
        acc_currency,
        max_balance,
        created_by
    )
    VALUES (
        'System Revenue Account',
        'sys_revenue',
        v_system_entity_id,
        'active',
        'KES',
        100000000,
        v_admin_entity_id
    )
    ON CONFLICT (acc_type) WHERE acc_type = 'sys_revenue' DO NOTHING;

    -- Fee income account
    INSERT INTO finance.accounts (
        acc_name,
        acc_type,
        owner_entity_id,
        acc_status,
        acc_currency,
        max_balance,
        created_by
    )
    VALUES (
        'System Fee Income Account',
        'sys_fee_income',
        v_system_entity_id,
        'active',
        'KES',
        100000000,
        v_admin_entity_id
    )
    ON CONFLICT (acc_type) WHERE acc_type = 'sys_fee_income' DO NOTHING;

    -- Clearing account
    INSERT INTO finance.accounts (
        acc_name,
        acc_type,
        owner_entity_id,
        acc_status,
        acc_currency,
        max_balance,
        created_by
    )
    VALUES (
        'System Clearing Account',
        'sys_clearing',
        v_system_entity_id,
        'active',
        'KES',
        100000000,
        v_admin_entity_id
    )
    ON CONFLICT (acc_type) WHERE acc_type = 'sys_clearing' DO NOTHING;

END $$;

-- 3. Provider type
INSERT INTO finance.providor_types (type_id, display_name, type_description)
VALUES ('internal', 'Internal Provider', 'System internal transfers')
ON CONFLICT (type_id) DO NOTHING;

-- 4. Internal provider (pointing to settlement account)
INSERT INTO finance.providors (
    providor_name,
    providor_type,
    providor_acc_id,
    providor_status
)
VALUES (
    'Internal Provider',
    'internal',
    (SELECT id FROM finance.accounts WHERE acc_type = 'sys_settlement' LIMIT 1),
    'active'
)
ON CONFLICT (providor_name) DO NOTHING;

-- 5. Transaction categories (created by admin)
INSERT INTO finance.transaction_categories (cat_name, cat_description, created_by)
SELECT 
    'Group Rotation Collection',
    'Collection for a member in a rotation plan',
    (SELECT id FROM public.entities WHERE entity_type = 'administrator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM finance.transaction_categories WHERE cat_name = 'Group Rotation Collection');

INSERT INTO finance.transaction_categories (cat_name, cat_description, created_by)
SELECT 
    'Group Rotation Payout',
    'Payout to a member from a rotation plan',
    (SELECT id FROM public.entities WHERE entity_type = 'administrator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM finance.transaction_categories WHERE cat_name = 'Group Rotation Payout');

INSERT INTO finance.transaction_categories (cat_name, cat_description, created_by)
SELECT 
    'Group Contribution',
    'General contribution to a group',
    (SELECT id FROM public.entities WHERE entity_type = 'administrator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM finance.transaction_categories WHERE cat_name = 'Group Contribution');

-- 6. Intervals (for rotation plans)
INSERT INTO groups.interval (
    interval_name,
    interval_description,
    no_of_days,
    created_by,
    interval_type
)
SELECT
    'Monthly',
    '30‑day rotation cycle',
    30,
    (SELECT id FROM public.entities WHERE entity_type = 'system' LIMIT 1),
    'system'
WHERE NOT EXISTS (SELECT 1 FROM groups.interval WHERE interval_name = 'Monthly');

INSERT INTO groups.interval (
    interval_name,
    interval_description,
    no_of_days,
    created_by,
    interval_type
)
SELECT
    'Weekly',
    '7‑day rotation cycle',
    7,
    (SELECT id FROM public.entities WHERE entity_type = 'system' LIMIT 1),
    'system'
WHERE NOT EXISTS (SELECT 1 FROM groups.interval WHERE interval_name = 'Weekly');

-- 7. Plan types
INSERT INTO groups.plan_types (type_name, type_description, is_active)
VALUES ('ROTATION', 'Rotation savings plan', true)
ON CONFLICT (type_name) DO NOTHING;