// hooks/useProcessTransaction.ts
import { supabaseGroups } from "@/lib/mysupabase/supabase";
//import { RotationData, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationResult{
message:string;
total_schedules:number;
plan_end_date:string;
}
export interface RotationData{
rotation_plan_id:string;
}
export function useGenerateRotationSchedule() {
    const queryClient = useQueryClient();
  return useMutation<RotationResult, Error, RotationData>({
    mutationFn: async (input: RotationData) => {
      const { data, error } = await supabaseGroups.rpc("generate_rotation_schedules", {
        p_rotation_plan_id: input.rotation_plan_id ,
      });

      if (error) throw new Error(error.message);
      return data as RotationResult;
    },
    onSuccess: (_data, variables) => {
      // invalidate both the available-invitees list and the invited-members list
      queryClient.invalidateQueries({
        queryKey: ["rotation_plan_schedules", variables.rotation_plan_id],
      });
      
    },
  });
}
