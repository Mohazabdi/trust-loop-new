import { supabase, supabaseGroups } from "../lib/mysupabase/supabase";
import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberGroup = {
  group_id: string;
  group_name: string;
  group_description: string | null;
  number_of_members: number;
  group_display_photo_url: string | null;
  group_status: string;
  no_of_unread_notifications: number;
};

type UseGetMemberGroupsReturn = {
  groups: MemberGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetMemberGroups(): UseGetMemberGroupsReturn {
  const [groups, setGroups]   = useState<MemberGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  /**
   * Resolve public.members.id from the current auth session.
   * Reuses the same get_member_entity pattern established in useCreateGroup.
   */
  async function resolveMemberId(): Promise<string> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      throw new Error('You must be logged in to view groups.');
    }

    const { data, error: rpcError } = await supabase.rpc('get_member_entity', {
      p_auth_id: session.user.id,
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Failed to resolve member identity.');
    }

    if (!data?.success) {
      throw new Error(data?.message || 'Member account not found.');
    }

    const memberId: string = data.data?.id;
    if (!memberId) throw new Error('Member ID could not be retrieved.');

    return memberId;
  }

  /**
   * Calls groups.get_all_member_group(p_member_id)
   * Returns rows directly (not wrapped in success/data — it's a SQL TABLE function).
   */
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const memberId = await resolveMemberId();

      // supabaseGroups targets the 'groups' schema so PostgREST routes
      // this RPC to groups.get_all_member_group
      const { data, error: rpcError } = await supabaseGroups.rpc(
        'get_all_member_group',
        { p_member_id: memberId },
      );

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to fetch groups.');
      }

      // SQL TABLE functions return an array of rows directly
      const rows = (data ?? []) as MemberGroup[];
      setGroups(rows);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setGroups([]);

    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}