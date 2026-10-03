// hooks/useProcessTransaction.ts
import { supabaseGroups } from "@/lib/mysupabase/supabase";
//import { RotationData, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
interface PayoutRequestResponseResult{
    success:boolean,
    message:string
}
export interface PayoutRequestResponseData{
payout_request_id: string;
responce_type: "approved"|"rejected";
reviewer_id:string
}
export function useHandlePayoutRequestResponse() {
  return useMutation<PayoutRequestResponseResult, Error, PayoutRequestResponseData>({
    mutationFn: async (input: PayoutRequestResponseData) => {
      const { data, error } = await supabaseGroups.rpc("handle_payout_request_response", {
        p_payout_request_id:input.payout_request_id ,
        p_response_type:input.responce_type ,
        p_reviewer_id:input.reviewer_id
      });

      if (error) throw new Error(error.message);
      return data as PayoutRequestResponseResult;
    },
  });
}
