
import { supabaseGroups } from "@/lib/mysupabase/supabase";

import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationDeleteResult{
    success:boolean,
    message:string
}
export interface RotationDeleteData{
    rotation_plan_invite_id: string;
}
export function useDeleteRotationInvite() {
  return useMutation<RotationDeleteResult, Error, RotationDeleteData>({
    mutationFn: async (input: RotationDeleteData) => {
      const { data, error } = await supabaseGroups.rpc("delete_rotation_invite", {
        p_rotation_plan_invite_id:input.rotation_plan_invite_id
      });

      if (error) throw new Error(error.message);
      return data as RotationDeleteResult;
    },
  });
}
