// hooks/useProcessTransaction.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import {
    FinalizeInput,
    FinalizeResult,
    TransactionResult,
} from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useFinalizeTransaction() {
  const queryClient = useQueryClient();

  return useMutation<FinalizeResult, Error, FinalizeInput>({
    mutationFn: async (input: FinalizeInput) => {
      const { data, error } = await supabaseFinance.rpc(
        "finalize_transaction",
        {
          p_transaction_id: input.transaction_id,
          p_transaction_status: input.transaction_status,
          p_idempotency_id: input.idempotency_id,
        },
      );

      if (error) throw new Error(error.message);

      // Your build_response pattern: check success field
      if (!data?.success) {
        throw new Error(data?.message || "Transaction failed");
      }

      return data as TransactionResult;
    },
    onSuccess: (result, variables) => {
      // After a successful transaction, invalidate relevant queries
      // so the UI shows updated balances and transaction history
      queryClient.invalidateQueries({
        queryKey: ["wallet", "accounts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["wallet"], // refresh wallet header balances
      });
      // Optionally invalidate a transactions list query
      queryClient.invalidateQueries({
        queryKey: ["transaction_history"],
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction_receipt", result.data?.transaction_id],
      });
    },
  });
}
