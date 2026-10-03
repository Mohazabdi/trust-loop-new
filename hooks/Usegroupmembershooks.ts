import { supabase, supabaseGroups } from "../lib/mysupabase/supabase";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupMemberDetail = {
  group_member_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  other_name: string | null;
  email: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  cover_photo_url: string | null;
  display_photo_url: string | null;
  about: string | null;
  member_role: string;
  member_status: string;
  joined_at: string;
};

export type AvailableMember = {
  member_id: string;
  member_ref: string;
  first_name: string;
  last_name: string;
  email: string | null;
  primary_phone: string | null;
  display_photo_url: string | null;
  total_count: number;
};

export type InviteResult = {
  status: string;
  message: string;
  invited_count: number;
  skipped_count: number;
  invited_ids: string[];
  skipped_details: { member_id: string; reason: string }[];
};

// ─── Helper: resolve member ID from session ───────────────────────────────────

async function resolveMemberId(): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const { data, error: rpcError } = await supabase.rpc("get_member_entity", {
    p_auth_id: session.user.id,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!data?.success) throw new Error(data?.message || "Member not found.");

  const memberId: string = data.data?.id;
  if (!memberId) throw new Error("Member ID could not be retrieved.");
  return memberId;
}

// ─── Hook: useGroupMembers ────────────────────────────────────────────────────
// Fetches all active members of a specific group and determines
// whether the current logged-in user is an admin of that group.

export function useGroupMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<GroupMemberDetail[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // const fetchMembers = useCallback(async () => {
  //   if (!groupId) return;
  //   setLoading(true);
  //   setError(null);
  const fetchMembers = useCallback(async () => {
    if (!groupId) {
        console.log("useGroupMembers: groupId is undefined, skipping fetch");
        return; // 👈 this early return keeps loading=true forever if groupId is missing
    }
    console.log("useGroupMembers: fetching for groupId", groupId); // 👈 add this

    try {
      const memberId = await resolveMemberId();
      setCurrentMemberId(memberId);
      

      // groups schema RPC — returns TABLE rows directly
      const { data, error: rpcError } = await supabaseGroups.rpc(
        "get_group_members_details",
        { p_group_id: groupId }
      );

      if (rpcError) throw new Error(rpcError.message || "Failed to fetch members.");

      const rows = (data ?? []) as GroupMemberDetail[];
      setMembers(rows);

      // Determine if the current user is an admin of this group
      const myRow = rows.find((r) => r.member_id === memberId);
      setIsAdmin(myRow?.member_role === "admin");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, isAdmin, currentMemberId, loading, error, refetch: fetchMembers };
}

// ─── Hook: useAvailableMembers ────────────────────────────────────────────────
// Fetches paginated members who can be invited to a group.
// Supports search and pagination. Called lazily (only when modal opens).

export function useAvailableMembers(groupId: string | undefined) {
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAvailable = useCallback(
    async (search?: string, limit = 20, offset = 0) => {
      if (!groupId) return;
      setLoading(true);
      setError(null);

      try {
        // public schema RPC — uses default supabase client
        const { data, error: rpcError } = await supabase.rpc(
          "get_available_members_for_invitation",
          {
            p_group_id: groupId,
            p_search: search ?? null,
            p_limit: limit,
            p_offset: offset,
          }
        );

        if (rpcError) throw new Error(rpcError.message || "Failed to fetch available members.");

        const rows = (data ?? []) as AvailableMember[];
        setAvailableMembers(rows);
        setTotalCount(rows[0]?.total_count ?? 0);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        setAvailableMembers([]);
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  return { availableMembers, totalCount, loading, error, fetchAvailable };
}

// ─── Hook: useInviteMembers ───────────────────────────────────────────────────
// Sends invitations to a batch of selected members.

export function useInviteMembers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitations = useCallback(
    async (
      groupId: string,
      inviteeIds: string[]
    ): Promise<InviteResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const invitedBy = await resolveMemberId();

        // public schema RPC
        const { data, error: rpcError } = await supabase.rpc(
          "invite_members_to_group",
          {
            p_group_id: groupId,
            p_invited_by: invitedBy,
            p_invitee_ids: inviteeIds,
          }
        );

        if (rpcError) throw new Error(rpcError.message || "Failed to send invitations.");

        // invite_members_to_group returns a TABLE with one row
        const result = Array.isArray(data) ? data[0] : data;
        if (!result) throw new Error("No response from server.");

        return result as InviteResult;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { sendInvitations, loading, error };
}