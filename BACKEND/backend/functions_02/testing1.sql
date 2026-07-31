SELECT groups.create_rotation_plan(
  p_group_id :='827ab1fc-7d8c-4598-957e-80b6cffaf595',
  p_created_by :='ef2260b2-0727-42d8-b8aa-1cae032ddafe',
  p_rotation_name:='test rotation for functions',
  p_start_date :=now() + interval '7 days',
  p_penalty_type:='fixed',
  p_penalty_value:=100,
  p_penalty_grace_days:=2,
  p_disbursement_type :='auto'

)

| create_rotation_plan                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"code":"REF-052620-0002673","status":"created","plan_id":"26240695-8c90-45b4-a703-09695998c6a7","rotation_plan_id":"18663ec0-2e97-46e9-977d-9652ddb882c4"} |

SELECT id  FROM groups.group_members
WHERE group_id = '827ab1fc-7d8c-4598-957e-80b6cffaf595'
  AND member_status= 'active'
LIMIT 5;

| id                                   |
| ------------------------------------ |
| ef2260b2-0727-42d8-b8aa-1cae032ddafe |
| 54244ab7-1f31-4ebc-9a12-1729416f1625 |
| 61fb9451-a11e-49e7-bd1b-3246e85564c0 |
| 6f99543c-a4f4-4377-a843-3ad7e50ed6c7 |
| 627a2606-d488-4cd3-ae88-d1ac6b6888ce |

SELECT groups.add_member_to_rotation(
    p_rotation_plan_id := '18663ec0-2e97-46e9-977d-9652ddb882c4',
    p_group_member_id  := '627a2606-d488-4cd3-ae88-d1ac6b6888ce'
);
SELECT groups.add_member_to_rotation(
    p_rotation_plan_id := '18663ec0-2e97-46e9-977d-9652ddb882c4',
    p_group_member_id  := '6f99543c-a4f4-4377-a843-3ad7e50ed6c7'
);

SELECT groups.add_member_to_rotation(
    p_rotation_plan_id := '18663ec0-2e97-46e9-977d-9652ddb882c4',
    p_group_member_id  := '61fb9451-a11e-49e7-bd1b-3246e85564c0'
);

| add_member_to_rotation                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"status":"added","group_member_id":"61fb9451-a11e-49e7-bd1b-3246e85564c0","rotation_plan_id":"18663ec0-2e97-46e9-977d-9652ddb882c4","amount_receivable":0} |

SELECT * FROM groups.get_rotation_members('18663ec0-2e97-46e9-977d-9652ddb882c4');


| rotation_member_id                   | group_member_id                      | member_name | amount_receivable | status  | payout_order |
| ------------------------------------ | ------------------------------------ | ----------- | ----------------- | ------- | ------------ |
| fcb7cc09-90ba-427a-bc0d-00ca52f0bff7 | 627a2606-d488-4cd3-ae88-d1ac6b6888ce | Test User5  | 0                 | pending | null         |
| 5505716b-c152-4e59-8aab-09187f1ceb31 | 6f99543c-a4f4-4377-a843-3ad7e50ed6c7 | Test User4  | 0                 | pending | null         |
| 22640fb7-4c75-48a5-9867-73fc82d40289 | 61fb9451-a11e-49e7-bd1b-3246e85564c0 | Test User3  | 0                 | pending | null         |
SELECT groups.generate_rotation_schedules(
    p_rotation_plan_id    := '18663ec0-2e97-46e9-977d-9652ddb882c4',
    p_contribution_amount := 1000,
    p_interval_days       := 7
);

| generate_rotation_schedules                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"status":"schedules_generated_and_locked","interval_days":7,"total_entries":9,"first_due_date":"2026-05-27 07:10:31.609184+00","number_of_cycles":3,"contribution_amount":1000} |

SELECT groups.update_rotation_penalty(
    p_plan_id => '18663ec0-2e97-46e9-977d-9652ddb882c4',
    p_admin_group_member_id => 'ef2260b2-0727-42d8-b8aa-1cae032ddafe',
    p_penalty_type => 'percentage',
    p_penalty_value => 5,
    p_penalty_grace_days => 3
);


DROP TRIGGER IF EXISTS trg_assign_payout_order ON groups.rotation_plan_members;
CREATE TRIGGER trg_assign_payout_order
    BEFORE INSERT ON groups.rotation_plan_members
    FOR EACH ROW
    EXECUTE FUNCTION groups.assign_payout_order();

    -- Manually assign payout orders (1,2,3) to the three members in the order they appear
UPDATE groups.rotation_plan_members
SET payout_order = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM groups.rotation_plan_members
    WHERE rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
) sub
WHERE groups.rotation_plan_members.id = sub.id;



SELECT id, payout_order FROM groups.rotation_plan_members
WHERE rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
ORDER BY payout_order;

| id                                   | payout_order |
| ------------------------------------ | ------------ |
| 22640fb7-4c75-48a5-9867-73fc82d40289 | 1            |
| 5505716b-c152-4e59-8aab-09187f1ceb31 | 2            |
| fcb7cc09-90ba-427a-bc0d-00ca52f0bff7 | 3            |

SELECT * FROM groups.get_rotation_members('18663ec0-2e97-46e9-977d-9652ddb882c4');


| rotation_member_id                   | group_member_id                      | member_name | amount_receivable | status  | payout_order |
| ------------------------------------ | ------------------------------------ | ----------- | ----------------- | ------- | ------------ |
| 22640fb7-4c75-48a5-9867-73fc82d40289 | 61fb9451-a11e-49e7-bd1b-3246e85564c0 | Test User3  | 0                 | pending | 1            |
| 5505716b-c152-4e59-8aab-09187f1ceb31 | 6f99543c-a4f4-4377-a843-3ad7e50ed6c7 | Test User4  | 0                 | pending | 2            |
| fcb7cc09-90ba-427a-bc0d-00ca52f0bff7 | 627a2606-d488-4cd3-ae88-d1ac6b6888ce | Test User5  | 0                 | pending | 3            |


SELECT * FROM groups.get_upcoming_payouts('18663ec0-2e97-46e9-977d-9652ddb882c4');

| rotation_member_id                   | member_name | amount_receivable | status  | expected_payout_cycle |
| ------------------------------------ | ----------- | ----------------- | ------- | --------------------- |
| 22640fb7-4c75-48a5-9867-73fc82d40289 | Test User3  | 0                 | pending | 1                     |
| 5505716b-c152-4e59-8aab-09187f1ceb31 | Test User4  | 0                 | pending | 2                     |
| fcb7cc09-90ba-427a-bc0d-00ca52f0bff7 | Test User5  | 0                 | pending | 3                     |



SELECT mss.id
FROM groups.member_schedule_settings mss
JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 1
  AND mss.schedule_index = 1;

  | id                                   |
| ------------------------------------ |
| 98021d90-21ad-4c18-ac7e-e5e079357be4 |

SELECT groups.calculate_penalty(
    '18663ec0-2e97-46e9-977d-9652ddb882c4',
    '98021d90-21ad-4c18-ac7e-e5e079357be4'
);

| calculate_penalty |
| ----------------- |
| 100.00            |

-- Pick the first schedule
SELECT rcs.id, rcs.due_date, rcs.rotation_collection_schedule_status
FROM groups.rotation_collection_schedule rcs
JOIN groups.member_schedule_settings mss ON mss.id = rcs.member_schedule_settings_id
JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
LIMIT 1;

[
  {
    "id": "011f0f32-7478-4f6a-ac7f-46427f89c9de",
    "due_date": "2026-05-27 07:10:31.609184+00",
    "rotation_collection_schedule_status": "upcoming"
  }
]

UPDATE groups.rotation_collection_schedule
SET due_date = now() - interval '5 days',
    rotation_collection_schedule_status = 'due'
WHERE id = '98021d90-21ad-4c18-ac7e-e5e079357be4';

INSERT INTO finance.transactions (id, trans_type, trans_amount, currency, trans_status, trans_description)
VALUES (gen_random_uuid(), 'penalty', 100, 'KES', 'completed', 'Test penalty for record_penalty')
RETURNING id;

| id                                   |
| ------------------------------------ |
| eb5171e0-1ba8-4b1d-9786-7b05bb356310 |

SELECT groups.record_penalty(
    p_collection_schedule_id := '98021d90-21ad-4c18-ac7e-e5e079357be4',
    p_amount := 100,
    p_transaction_id := 'eb5171e0-1ba8-4b1d-9786-7b05bb356310'
);

SELECT rcs.id
FROM groups.rotation_collection_schedule rcs
JOIN groups.member_schedule_settings mss ON mss.id = rcs.member_schedule_settings_id
WHERE mss.id = '98021d90-21ad-4c18-ac7e-e5e079357be4';

| id                                   |
| ------------------------------------ |
| 3a6f3174-df26-4806-b4f9-11b73668559c |

UPDATE groups.rotation_collection_schedule
SET rotation_collection_schedule_status = 'due',
    due_date = now() - interval '5 days'
WHERE id = '3a6f3174-df26-4806-b4f9-11b73668559c';



INSERT INTO finance.transactions (id, trans_type, trans_amount, currency, trans_status, trans_description)
VALUES ('eb5171e0-1ba8-4b1d-9786-7b05bb356310', 'penalty', 100, 'KES', 'completed', 'Test penalty')
ON CONFLICT (id) DO NOTHING;



SELECT groups.record_penalty(
    p_collection_schedule_id := '3a6f3174-df26-4806-b4f9-11b73668559c',
    p_amount := 100,
    p_transaction_id := 'eb5171e0-1ba8-4b1d-9786-7b05bb356310'
);

record_penalty                                                                                   
| {"code":"REF-052620-0002893","amount":100,"status":"recorded","penalty_id":"6c34a00f-2468-468f-847e-da0909a2c848"} |

ALTER TABLE groups.rotation_penalty_applied
ADD CONSTRAINT rotation_penalty_applied_txn_schedule_unique
UNIQUE (transaction_id, rotation_collection_schedule_id);

SELECT groups.waive_penalty(
    p_penalty_id := '6c34a00f-2468-468f-847e-da0909a2c848',
    p_admin_group_member_id := 'ef2260b2-0727-42d8-b8aa-1cae032ddafe'
);

SELECT 
    id,
    transaction_id,
    amount_applied,
    rotation_collection_schedule_id,
    rotation_penalty_applied_status,
    penalty_status,
    deducted_from_schedule_id,
    created_at,
    updated_at
FROM groups.rotation_penalty_applied
WHERE id = '6c34a00f-2468-468f-847e-da0909a2c848';


SELECT id, due_date, amount_collected, rotation_collection_schedule_status
FROM groups.rotation_collection_schedule
WHERE id = '3a6f3174-df26-4806-b4f9-11b73668559c';

| id                                   | due_date                      | amount_collected | rotation_collection_schedule_status |
| ------------------------------------ | ----------------------------- | ---------------- | ----------------------------------- |
| 3a6f3174-df26-4806-b4f9-11b73668559c | 2026-05-15 08:05:59.377126+00 | 0                | due                                 |

SELECT groups.record_contribution(
    p_schedule_id := '3a6f3174-df26-4806-b4f9-11b73668559c',
    p_amount := 600
);

[
  {
    "record_contribution": {
      "status": "recorded",
      "schedule_id": "3a6f3174-df26-4806-b4f9-11b73668559c",
      "amount_applied": 600,
      "transaction_id": "b6bed5cc-92a5-4db1-9843-c4feda3c4697",
      "new_schedule_status": "partial",
      "overpayment_carried": 0
    }
  }
]


SELECT groups.record_contribution(
    p_schedule_id := '3a6f3174-df26-4806-b4f9-11b73668559c',
    p_amount := 400
);

[
  {
    "record_contribution": {
      "status": "recorded",
      "schedule_id": "3a6f3174-df26-4806-b4f9-11b73668559c",
      "amount_applied": 400,
      "transaction_id": "fef16fbb-04ef-4e51-bed4-9095f5aabb4d",
      "new_schedule_status": "completed",
      "overpayment_carried": 0
    }
  }
]

SELECT mss.id AS schedule_settings_id, rcs.id AS schedule_id
FROM groups.member_schedule_settings mss
JOIN oups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
JOIN grgroups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 2
  AND mss.schedule_index = 1;


  SELECT mss.id AS schedule_settings_id, rcs.id AS schedule_id
FROM groups.member_schedule_settings mss
JOIN groups.rotation_plan_members rpm ON rpm.id = mss.rotation_plan_member_id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 2
  AND mss.schedule_index = 1;

  | schedule_settings_id                 | schedule_id                          |
| ------------------------------------ | ------------------------------------ |
| e1b439f4-2217-4e02-9617-f857456fbfe0 | b712b41a-255a-4d65-b499-605d49eb0ff0 |


SELECT groups.apply_overdue_penalties();

[
  {
    "apply_overdue_penalties": {
      "penalties_applied": 0
    }
  }
]

SELECT groups.notify_due_contributions();

[
  {
    "notify_due_contributions": {
      "notified_count": 0
    }
  }
]

-- For payout_order = 2
SELECT rcs.id AS schedule_id
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 2
  AND mss.schedule_index = 1;

-- For payout_order = 3
SELECT rcs.id AS schedule_id
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 3
  AND mss.schedule_index = 1;

  [
  {
    "schedule_id": "011f0f32-7478-4f6a-ac7f-46427f89c9de"
  }
]

SELECT rcs.id AS schedule_id
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND rpm.payout_order = 3
  AND mss.schedule_index = 1;

  [
  {
    "schedule_id": "011f0f32-7478-4f6a-ac7f-46427f89c9de"
  }
]

-- For payout_order = 2
SELECT groups.record_contribution(p_schedule_id := '011f0f32-7478-4f6a-ac7f-46427f89c9de', p_amount := 1000);

-- For payout_order = 3
SELECT groups.record_contribution(p_schedule_id := '011f0f32-7478-4f6a-ac7f-46427f89c9de', p_amount := 1000);

SELECT 
    rpm.payout_order,
    rcs.id AS schedule_id,
    rcs.rotation_collection_schedule_status,
    rcs.amount_collected
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = '18663ec0-2e97-46e9-977d-9652ddb882c4'
  AND mss.schedule_index = 1
ORDER BY rpm.payout_order;

[
  {
    "payout_order": 1,
    "schedule_id": "3a6f3174-df26-4806-b4f9-11b73668559c",
    "rotation_collection_schedule_status": "completed",
    "amount_collected": "1000"
  },
  {
    "payout_order": 2,
    "schedule_id": "b712b41a-255a-4d65-b499-605d49eb0ff0",
    "rotation_collection_schedule_status": "upcoming",
    "amount_collected": "0"
  },
  {
    "payout_order": 3,
    "schedule_id": "011f0f32-7478-4f6a-ac7f-46427f89c9de",
    "rotation_collection_schedule_status": "upcoming",
    "amount_collected": "0"
  }
]

SELECT groups.record_contribution(p_schedule_id := 'b712b41a-255a-4d65-b499-605d49eb0ff0', p_amount := 1000);

[
  {
    "record_contribution": {
      "status": "recorded",
      "schedule_id": "b712b41a-255a-4d65-b499-605d49eb0ff0",
      "amount_applied": 1000,
      "transaction_id": "57af3f0f-bdd2-49ea-8e15-40b0b679c673",
      "new_schedule_status": "completed",
      "overpayment_carried": 0
    }
  }
]

SELECT groups.record_contribution(p_schedule_id := '011f0f32-7478-4f6a-ac7f-46427f89c9de', p_amount := 1000);

[
  {
    "record_contribution": {
      "status": "recorded",
      "schedule_id": "011f0f32-7478-4f6a-ac7f-46427f89c9de",
      "amount_applied": 1000,
      "transaction_id": "5edeba7b-e368-4dc9-ab18-f4752300fe3e",
      "new_schedule_status": "completed",
      "overpayment_carried": 0
    }
  }
]


SELECT * FROM groups.rotation_disbursed;
SELECT current_cycle FROM groups.rotation_plan WHERE id = '18663ec0-2e97-46e9-977d-9652ddb882c4';

[
  {
    "current_cycle": 2
  }
]

SELECT * FROM groups.rotation_disbursed;

[
  {
    "id": "f538da6d-eb0a-4803-85e1-a74cbd95c793",
    "transaction_id": "00000000-0000-0000-0000-000000000099",
    "rotation_plan_member_id": "fb7374b1-4f14-49cd-8538-f8600da48853",
    "amount_disbursed": "5000",
    "rotation_disbursed_code": "REF-052614-0002567"
  },
  {
    "id": "e3b04329-8597-49fd-ab1e-a33160a66ce3",
    "transaction_id": "bf135a15-a763-4e8b-a0bf-4a2aade2b4ac",
    "rotation_plan_member_id": "22640fb7-4c75-48a5-9867-73fc82d40289",
    "amount_disbursed": "3000",
    "rotation_disbursed_code": "REF-052620-0002902"
  }
]


-- Create rotation plan (auto disbursement)
SELECT groups.create_rotation_plan(
    p_group_id          := '827ab1fc-7d8c-4598-957e-80b6cffaf595',
    p_created_by        := 'ef2260b2-0727-42d8-b8aa-1cae032ddafe',
    p_rotation_name     := 'Test Pot Mismatch',
    p_start_date        := now() + interval '7 days',
    p_penalty_type      := 'fixed',
    p_penalty_value     := 100,
    p_penalty_grace_days:= 2,
    p_disbursement_type := 'auto'
);


[
  {
    "create_rotation_plan": {
      "code": "REF-052620-0002910",
      "status": "created",
      "plan_id": "73935e2b-ef26-4307-be4a-845037fe5d23",
      "rotation_plan_id": "ea827731-149c-40bc-ae28-75f9c27e5675"
    }
  }
]')

SELECT id FROM groups.group_members 
WHERE group_id = '827ab1fc-7d8c-4598-957e-80b6cffaf595' 
  AND member_status = 'active' 
LIMIT 2;

[
  {
    "id": "ef2260b2-0727-42d8-b8aa-1cae032ddafe"
  },
  {
    "id": "54244ab7-1f31-4ebc-9a12-1729416f1625"
  }
]

-- Example using two existing members (replace with actual IDs from above)
SELECT groups.add_member_to_rotation(p_rotation_plan_id := 'ea827731-149c-40bc-ae28-75f9c27e5675', p_group_member_id := '61fb9451-a11e-49e7-bd1b-3246e85564c0');
SELECT groups.add_member_to_rotation(p_rotation_plan_id := 'ea827731-149c-40bc-ae28-75f9c27e5675', p_group_member_id := '6f99543c-a4f4-4377-a843-3ad7e50ed6c7');

[
  {
    "add_member_to_rotation": {
      "status": "added",
      "group_member_id": "6f99543c-a4f4-4377-a843-3ad7e50ed6c7",
      "rotation_plan_id": "ea827731-149c-40bc-ae28-75f9c27e5675",
      "amount_receivable": 0
    }
  }
]

SELECT groups.generate_rotation_schedules(
    p_rotation_plan_id    := 'ea827731-149c-40bc-ae28-75f9c27e5675',
    p_contribution_amount := 1000,
    p_interval_days       := 7
);
[
  {
    "generate_rotation_schedules": {
      "status": "schedules_generated_and_locked",
      "interval_days": 7,
      "total_entries": 4,
      "first_due_date": "2026-05-27 09:08:01.989363+00",
      "number_of_cycles": 2,
      "contribution_amount": 1000
    }
  }
]

SELECT rcs.id AS schedule_id
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = 'ea827731-149c-40bc-ae28-75f9c27e5675'
  AND mss.schedule_index = 1
  AND rpm.group_member_id = '61fb9451-a11e-49e7-bd1b-3246e85564c0';

  [
  {
    "schedule_id": "fbd9fe0b-3790-496f-aa34-bbac3bddc28d"
  }
]

SELECT rcs.id AS schedule_id
FROM groups.rotation_plan_members rpm
JOIN groups.member_schedule_settings mss ON mss.rotation_plan_member_id = rpm.id
JOIN groups.rotation_collection_schedule rcs ON rcs.member_schedule_settings_id = mss.id
WHERE rpm.rotation_plan_id = 'ea827731-149c-40bc-ae28-75f9c27e5675'
  AND mss.schedule_index = 1
  AND rpm.group_member_id = '6f99543c-a4f4-4377-a843-3ad7e50ed6c7';

  [
  {
    "schedule_id": "c87a54b8-85d2-4f22-9712-551d33d0aafd"
  }
]

UPDATE groups.rotation_collection_schedule
SET amount_collected = 800,
    rotation_collection_schedule_status = 'partial'
WHERE id = 'fbd9fe0b-3790-496f-aa34-bbac3bddc28d';

SELECT groups.record_contribution(p_schedule_id := 'c87a54b8-85d2-4f22-9712-551d33d0aafd', p_amount := 1000);
[
  {
    "record_contribution": {
      "status": "recorded",
      "schedule_id": "c87a54b8-85d2-4f22-9712-551d33d0aafd",
      "amount_applied": 1000,
      "transaction_id": "b2fbdc75-1631-4c4f-a673-4a1733554e02",
      "new_schedule_status": "completed",
      "overpayment_carried": 0
    }
  }
]

SELECT disbursement_type FROM groups.rotation_plan WHERE id = 'ea827731-149c-40bc-ae28-75f9c27e5675';
SELECT * FROM groups.rotation_disbursed WHERE rotation_plan_member_id IN (SELECT id FROM groups.rotation_plan_members WHERE rotation_plan_id = 'ea827731-149c-40bc-ae28-75f9c27e5675');

[
  {
    "disbursement_type": "auto"
  }
]