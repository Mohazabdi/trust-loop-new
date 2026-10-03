
import { supabaseGroups } from "@/lib/mysupabase/supabase";

import { useMutation, useQueryClient } from "@tanstack/react-query";
interface PayoutResult{
    success:boolean,
    message:string
}
export interface PayoutData{
    payout_request_id: string;
}
export function useProcessPayout() {
  return useMutation<PayoutResult, Error, PayoutData>({
    mutationFn: async (input: PayoutData) => {
      const { data, error } = await supabaseGroups.rpc("process_approved_payout", {
        p_payout_request_id:input.payout_request_id
      });

      if (error) throw new Error(error.message);
      return data as PayoutResult;
    },
  });
}
