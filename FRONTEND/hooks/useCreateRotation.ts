// hooks/useProcessTransaction.ts
import { supabaseGroups } from "@/lib/mysupabase/supabase";
//import { RotationData, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationResult{
rotation_plan_id:string
}
export interface RotationData{
plan_name: string;
group_id: string;
created_by_id: string;
wallet_id: string;
amount_collectable :number;
rotation_description :string;
}
export function useCreateRotation() {
  //const queryClient = useQueryClient();

  return useMutation<RotationResult, Error, RotationData>({
    mutationFn: async (input: RotationData) => {
      const { data, error } = await supabaseGroups.rpc("create_rotation_plan", {
        p_plan_name: input.plan_name ,
        p_group_id :input.group_id,
        p_created_by_id :input.created_by_id,
        p_wallet_id :input.wallet_id,
        p_amount_collectable:input.amount_collectable,
        p_rotation_description:input.rotation_description
      });

      if (error) throw new Error(error.message);
      return data as RotationResult;
    },
  });
}
