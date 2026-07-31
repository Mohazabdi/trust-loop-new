
import { supabaseGroups } from "@/lib/mysupabase/supabase";

import { useMutation, useQueryClient } from "@tanstack/react-query";
interface PlanUpdateResult{
    success:boolean,
    message:string
}
export interface PlanUpdateData{
    plan_id: string;
    rotation_name:string;
    start_date:Date;
    amount_collectable:number;
    rotation_description:string | null;
}
export function useUpdateRotationPlan() {
  return useMutation<PlanUpdateResult, Error, PlanUpdateData>({
    mutationFn: async (input: PlanUpdateData) => {
      const { data, error } = await supabaseGroups.rpc("update_rotation_plan_details", {
        p_plan_id:input.plan_id,
        p_rotation_name:input.rotation_name,
        p_start_date:input.start_date.toISOString(),
        p_amount_collectable:input.amount_collectable,
        p_rotation_description:input.rotation_description
      });

      if (error) throw new Error(error.message);
      return data as PlanUpdateResult;
    },
  });
}
