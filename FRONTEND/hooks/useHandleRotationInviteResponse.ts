// hooks/useProcessTransaction.ts
import { supabaseGroups } from "@/lib/mysupabase/supabase";
//import { RotationData, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationInviteResponseResult{
    success:boolean,
    message:string
}
export interface RotationInviteResponseData{
plan_invite_id: string;
responce_type: "accepted"|"declined";
}
export function useHandleRotationInviteResponse() {
  return useMutation<RotationInviteResponseResult, Error, RotationInviteResponseData>({
    mutationFn: async (input: RotationInviteResponseData) => {
      const { data, error } = await supabaseGroups.rpc("handle_rotation_plan_invite_response", {
        p_rotation_plan_invite_id:input.plan_invite_id ,
        p_response_type:input.responce_type 
      });

      if (error) throw new Error(error.message);
      return data as RotationInviteResponseResult;
    },
  });
}
