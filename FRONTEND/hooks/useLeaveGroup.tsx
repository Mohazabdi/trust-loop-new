import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberData } from "@/hooks/useMemberData";

type LeaveGroupInput = {
  group_id: string;
  member_id: string;
  reason: string;
};

export function useLeaveGroupMutation() {
  const queryClient = useQueryClient(); //This gives you access to React Query’s cache system to refresh UI after mutation.  
  const { data: memberData } = useMemberData();
  const currentMemberId = memberData?.id;

  return useMutation({
    mutationFn: async (data: LeaveGroupInput) => {
      const { data: result, error } = await supabaseGroups.rpc(
         "remove_member_from_group",
        {
          p_group_id: data.group_id,
          p_member_id: data.member_id,
          p_reason: data.reason,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
      queryKey: ["group-members", currentMemberId],
      });
    },
  });
}