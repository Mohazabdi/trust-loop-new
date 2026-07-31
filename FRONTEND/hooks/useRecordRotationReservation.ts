// hooks/useProcessTransaction.ts
import { supabaseGroups } from "@/lib/mysupabase/supabase";
//import { RotationData, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface RotationInviteResponseResult{
    success:boolean,
    message:string
}
export interface RotationRservationResponseData{
rotation_plan_member_id: string;
transaction_id:string;
}
export function useRecordRotationReservation() {
  return useMutation<RotationInviteResponseResult, Error, RotationRservationResponseData>({
    mutationFn: async (input: RotationRservationResponseData) => {
      const { data, error } = await supabaseGroups.rpc("record_rotation_reservation_amount", {
        p_rotation_plan_member_id:input.rotation_plan_member_id ,
        p_transaction_id:input.transaction_id 
      });

      if (error) throw new Error(error.message);
      return data as RotationInviteResponseResult;
    },
  });
}
