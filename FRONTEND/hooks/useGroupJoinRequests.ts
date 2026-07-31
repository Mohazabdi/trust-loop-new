import { supabase } from "@/lib/mysupabase/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export type GroupJoinRequest = {
    request_id: string;
    group_id: string;
    requester_id: string;
    requester_name: string;
    member_code: string | null;
    request_message: string | null;
    admin_message: string | null;
    request_status: "pending" | "approved" | "rejected";
    created_at: string;
    reviewed_at: string | null;
};

type UseGroupJoinRequestsReturn = {
    requests: GroupJoinRequest[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useGroupJoinRequests(
    groupId: string | undefined,
    isAdmin: boolean,
    currentMemberId: string | undefined
): UseGroupJoinRequestsReturn {
    const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchRequests = useCallback(async () => {
        // Only fetch when we definitively know the user is an admin.
        // This runs automatically whenever isAdmin, groupId, or
        // currentMemberId changes — so the moment isAdmin flips to
        // true after useGroupMembers loads, this fires immediately.
        if (!groupId || !currentMemberId || !isAdmin) {
            setRequests([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc(
                "get_group_join_requests",
                {
                    p_group_id: groupId,
                    p_admin_id: currentMemberId,
                }
            );

            if (rpcError) throw new Error(rpcError.message);
            if (!mountedRef.current) return;

            const mapped: GroupJoinRequest[] = (data ?? []).map((row: any) => ({
                request_id:      row.request_id,
                group_id:        row.group_id,
                requester_id:    row.requester_id,
                requester_name:  row.requester_name ?? "Unknown Member",
                member_code:     row.member_code ?? null,
                request_message: row.request_message ?? null,
                admin_message:   row.admin_message ?? null,
                request_status:  row.request_status,
                created_at:      row.created_at,
                reviewed_at:     row.reviewed_at ?? null,
            }));

            setRequests(mapped);
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message ?? "Failed to load join requests.");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [groupId, currentMemberId, isAdmin]);

    // fires every time isAdmin, groupId, or
    // currentMemberId changes. So when useGroupMembers finishes
    // loading and isAdmin flips from false → true, this
    // immediately triggers a real fetch. 
    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return { requests, loading, error, refetch: fetchRequests };
}