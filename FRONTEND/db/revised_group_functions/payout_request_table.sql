CREATE TYPE groups.payout_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS groups.payout_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_schedule_id UUID NOT NULL UNIQUE REFERENCES groups.rotation_schedule(id) ON DELETE RESTRICT,
    requested_amount NUMERIC NOT NULL DEFAULT 0,
    status groups.payout_request_status NOT NULL DEFAULT 'pending',
    requested_to UUID NOT NULL REFERENCES groups.group_members(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_id UUID REFERENCES public.group_members(id),
    reviewed_at TIMESTAMPTZ
);