// Tracks the current member's join request statuses for discoverable groups
// and exposes a submitRequest function that calls create_group_join_request.

import { supabase } from "@/lib/mysupabase/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

// Map from group_id → current request status (or undefined if no request)
export type JoinRequestMap = Record<string, JoinRequestStatus>;

type UseJoinRequestsReturn = {
    /** Map of groupId → request status */
    requestMap: JoinRequestMap;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    /**
     * Submit a new join request.
     * Returns true on success, false on failure.
     * Sets submitting = groupId while in-flight.
     */
    submitRequest: (
        groupId: string,
        memberId: string,
        message: string
    ) => Promise<boolean>;
    /** groupId currently being submitted, or null */
    submitting: string | null;
};

export function useJoinRequests(
    memberId: string | undefined
): UseJoinRequestsReturn {
    const [requestMap, setRequestMap] = useState<JoinRequestMap>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<string | null>(null);

    // Prevent stale state updates after unmount
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ── Fetch all join requests sent by this member ───────────
    // Uses the get_member_join_requests RPC which handles the
    // cross-schema join (groups.group_join_requests → public.groups)
    // on the server side, avoiding Supabase schema cache errors.
    const fetchRequests = useCallback(async () => {
        if (!memberId) {
            setRequestMap({});
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc(
                "get_member_join_requests",
                { p_member_id: memberId }
            );

            if (rpcError) throw new Error(rpcError.message);
            if (!mountedRef.current) return;

            // Build a map of groupId → highest-priority status.
            // A member could theoretically have a rejected then a new
            // pending request for the same group (re-apply allowed).
            // Priority: approved > pending > rejected.
            const priority: Record<JoinRequestStatus, number> = {
                approved: 3,
                pending:  2,
                rejected: 1,
            };

            const map: JoinRequestMap = {};
            (data ?? []).forEach((row: { group_id: string; request_status: string }) => {
                const status = row.request_status as JoinRequestStatus;
                const existing = map[row.group_id];
                if (!existing || priority[status] > priority[existing]) {
                    map[row.group_id] = status;
                }
            });

            setRequestMap(map);
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message ?? "Failed to load join requests.");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [memberId]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ── Submit a new join request ─────────────────────────────
    const submitRequest = useCallback(
        async (
            groupId: string,
            memberId: string,
            message: string
        ): Promise<boolean> => {
            if (!memberId || !groupId) return false;

            // Prevent double-submit
            if (submitting) return false;

            setSubmitting(groupId);

            try {
                const { data, error: rpcError } = await supabase.rpc(
                    "create_group_join_request",
                    {
                        p_group_id: groupId,
                        p_requester_id: memberId,
                        p_request_message: message,
                    }
                );

                if (rpcError) throw new Error(rpcError.message);

                // Optimistically update the local map immediately
                if (mountedRef.current) {
                    setRequestMap((prev) => ({
                        ...prev,
                        [groupId]: "pending",
                    }));
                }

                return true;
            } catch (err: any) {
                // Surface meaningful errors to the UI via Alert in the caller.
                // Re-throw so the caller can catch and display it.
                const message = err.message ?? "Failed to submit request.";

                // Parse known server error codes into friendly messages
                if (message.includes("DUPLICATE_REQUEST")) {
                    // Idempotency: treat as success and set map to pending
                    if (mountedRef.current) {
                        setRequestMap((prev) => ({
                            ...prev,
                            [groupId]: "pending",
                        }));
                    }
                    return true;
                }

                throw new Error(message);
            } finally {
                if (mountedRef.current) setSubmitting(null);
            }
        },
        [submitting]
    );

    return {
        requestMap,
        loading,
        error,
        refetch: fetchRequests,
        submitRequest,
        submitting,
    };
}