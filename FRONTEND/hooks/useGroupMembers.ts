import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useEffect, useState } from "react";

export type GroupMember = {
  group_member_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  other_name: string | null;
  email: string;
  primary_phone: string;
  secondary_phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  cover_photo_url: string | null;
  display_photo_url: string | null;
  about: string | null;
  member_role: "admin" | "member";
  member_status: string;
  joined_at: string;
};

type UseGroupMembersReturn = {
  members: GroupMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useGroupMembers(groupId: string | undefined): UseGroupMembersReturn {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!groupId) {
      setError("Group ID missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabaseGroups.rpc(
        "get_group_members_details",
        { p_group_id: groupId }
      );

      if (rpcError) throw new Error(rpcError.message);
      setMembers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load group members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  return { members, loading, error, refetch: fetchMembers };
}