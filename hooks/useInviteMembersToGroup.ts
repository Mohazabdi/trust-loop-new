// hooks/useInviteMembersToGroup.ts
import { supabase } from "@/lib/mysupabase/supabase";
import { useState } from "react";

type InviteResult = {
  status: "success" | "partial" | "skipped";
  message: string;
  invited_count: number;
  skipped_count: number;
  invited_ids: string[];
  skipped_details: any[];
};

export function useInviteMembersToGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteMembers = async (
    groupId: string,
    adminMemberId: string,
    inviteeIds: string[]
  ): Promise<InviteResult | null> => {
    if (!groupId || !adminMemberId || inviteeIds.length === 0) {
      setError("Missing required parameters");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("invite_members_to_group", {
        p_group_id: groupId,
        p_invited_by: adminMemberId,
        p_invitee_ids: inviteeIds,
      });

      if (rpcError) throw new Error(rpcError.message);

      //The RPC returns an array of rows (table). Take the first row.
      const result = (data as unknown) as InviteResult[];
      if (!result || result.length === 0) {
        throw new Error("No result returned from invite function");
      }

      return result[0];
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { inviteMembers, loading, error };
}