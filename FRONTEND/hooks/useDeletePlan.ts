
import { supabaseGroups } from "@/lib/mysupabase/supabase";

import { useMutation, useQueryClient } from "@tanstack/react-query";
interface PlanDeleteResult{
    success:boolean,
    message:string
}
export interface PlanDeleteData{
    plan_id: string;
}
export function useDeletePlan() {
  return useMutation<PlanDeleteResult, Error, PlanDeleteData>({
    mutationFn: async (input: PlanDeleteData) => {
      const { data, error } = await supabaseGroups.rpc("delete_plan", {
        p_plan_id:input.plan_id
      });

      if (error) throw new Error(error.message);
      return data as PlanDeleteResult;
    },
  });
}
