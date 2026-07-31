import { supabase } from "@/lib/mysupabase/supabase";
import { useEffect, useState } from "react";

export type MemberInvite = {
  invitation_id: string;
  invite_code: string;
  invite_status: string;
  invited_at: string;
  group_id: string;
  group_name: string;
  group_description: string | null;
  group_display_photo: string | null;
  inviter_member_id: string;
  inviter_first_name: string;
  inviter_last_name: string;
  total_count?: number;
};

export function useMemberInvites(memberId: string | undefined) {
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = async () => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_member_group_invites", {
        p_member_id: memberId,
        p_limit: 50,
        p_offset: 0,
      });
      if (rpcError) throw new Error(rpcError.message);
      setInvites(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [memberId]);

  return { invites, loading, error, refetch: fetchInvites };
}