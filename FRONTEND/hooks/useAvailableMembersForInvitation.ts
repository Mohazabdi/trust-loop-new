import { supabase } from "@/lib/mysupabase/supabase";
import { useState, useCallback } from "react";

export type InvitableMember = {
  member_id: string;
  member_ref: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_phone: string;
  display_photo_url: string | null;
  total_count: number; // total count of available members for pagination
};

type UseAvailableMembersReturn = {
  members: InvitableMember[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  search: (term: string) => void;
};

export function useAvailableMembersForInvitation(groupId: string): UseAvailableMembersReturn {
  const [members, setMembers] = useState<InvitableMember[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchMembers = useCallback(
    async (resetList = false, search?: string | null) => {
      if (!groupId) return;
      if (loading) return;

      setLoading(true);
      try {
        const currentOffset = resetList ? 0 : offset;
        const { data, error } = await supabase.rpc("get_available_members_for_invitation", {
          p_group_id: groupId,
          p_limit: LIMIT,
          p_offset: currentOffset,
          p_search: search || null,
        });

        if (error) throw new Error(error.message);

        const newMembers = (data || []) as InvitableMember[];
        const totalCount = newMembers[0]?.total_count || 0;

        if (resetList) {
          setMembers(newMembers);
          setOffset(LIMIT);
          setHasMore(newMembers.length < totalCount);
        } else {
          setMembers((prev) => [...prev, ...newMembers]);
          setOffset(currentOffset + LIMIT);
          setHasMore(newMembers.length === LIMIT && members.length + newMembers.length < totalCount);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [groupId, offset, loading, members.length]
  );

  const loadMore = useCallback(async () => {
    if (hasMore && !loading && offset > 0) {
      await fetchMembers(false, searchTerm);
    }
  }, [hasMore, loading, offset, searchTerm]);

  const reset = useCallback(() => {
    setMembers([]);
    setOffset(0);
    setHasMore(true);
    fetchMembers(true, searchTerm);
  }, [searchTerm]);

  const search = useCallback(
    (term: string) => {
      setSearchTerm(term || null);
      setMembers([]);
      setOffset(0);
      setHasMore(true);
      fetchMembers(true, term || null);
    },
    [fetchMembers]
  );

  // initial load
  useState(() => {
    reset();
  });

  return { members, loading, hasMore, loadMore, reset, search };
}