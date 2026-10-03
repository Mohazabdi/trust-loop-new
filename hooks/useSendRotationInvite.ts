import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationInviteSendResult{
rotation_plan_id:string;
}
export interface RotationInviteSendData{
  group_member_ids :string[];
  rotation_plan_id :string;
}
export function useSendRotationInvite() {
   const queryClient = useQueryClient();
  return useMutation<RotationInviteSendResult, Error, RotationInviteSendData>({
    mutationFn: async (input: RotationInviteSendData) => {
      const { data, error } = await supabaseGroups.rpc("send_rotation_invites", {
         p_group_member_id :input.group_member_ids,
         p_rotation_plan_id:input.rotation_plan_id
      });

      if (error) throw new Error(error.message);
      return data as RotationInviteSendResult;
    },
    onSuccess: (_data, variables) => {
      // invalidate both the available-invitees list and the invited-members list
      queryClient.invalidateQueries({
        queryKey: ["rotation_plan_invitees", variables.rotation_plan_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["group_member_rotation_invites", variables.rotation_plan_id],
         });
    },
  });
}
