// Fetches all join requests sent by this member so they can see
// admin responses (approved / rejected / pending).

import { supabase } from "@/lib/mysupabase/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export type JoinRequestMessage = {
    request_id: string;
    group_id: string;
    group_name: string;
    request_message: string | null;
    admin_message: string | null;
    request_status: "pending" | "approved" | "rejected";
    created_at: string;
    reviewed_at: string | null;
};

type UseMemberJoinRequestMessagesReturn = {
    messages: JoinRequestMessage[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useMemberJoinRequestMessages(
    memberId: string | undefined
): UseMemberJoinRequestMessagesReturn {
    const [messages, setMessages] = useState<JoinRequestMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!memberId) {
            setMessages([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // get_member_join_requests handles the cross-schema join
            // between groups.group_join_requests and public.groups
            // entirely on the server side.
            const { data, error: rpcError } = await supabase.rpc(
                "get_member_join_requests",
                { p_member_id: memberId }
            );

            if (rpcError) throw new Error(rpcError.message);
            if (!mountedRef.current) return;

            const mapped: JoinRequestMessage[] = (data ?? []).map((row: any) => ({
                request_id:      row.request_id,
                group_id:        row.group_id,
                group_name:      row.group_name ?? "Unknown Group",
                request_message: row.request_message ?? null,
                admin_message:   row.admin_message ?? null,
                request_status:  row.request_status,
                created_at:      row.created_at,
                reviewed_at:     row.reviewed_at ?? null,
            }));

            setMessages(mapped);
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message ?? "Failed to load messages.");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [memberId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    return { messages, loading, error, refetch: fetchMessages };
}