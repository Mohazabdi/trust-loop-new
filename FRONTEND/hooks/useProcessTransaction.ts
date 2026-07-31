// hooks/useProcessTransaction.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { TransactionInput, TransactionResult } from "@/lib/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useProcessTransaction() {
  const queryClient = useQueryClient();

  return useMutation<TransactionResult, Error, TransactionInput>({
    mutationFn: async (input: TransactionInput) => {
      const { data, error } = await supabaseFinance.rpc("process_transaction", {
        p_trans_type: input.trans_type,
        p_trans_amount: input.trans_amount,
        p_currency: input.currency,
        p_trans_category_id: input.trans_category_id,
        p_initiator_id: input.initiator_id,
        p_source_wallet_id: input.source_wallet_id,
        p_source_acc: input.source_acc,
        p_destination_acc: input.destination_acc,
        p_providor_id: input.providor_id,
        p_idempotency_key: input.idempotency_key,
        p_trans_description: input.trans_description || null,
      });

      if (error) throw new Error(error.message);

      // Your build_response pattern: check success field
      if (!data?.success) {
        throw new Error(data?.message || "Transaction failed");
      }

      return data as TransactionResult;
    },
    onSuccess: (result, variables) => {
      //finalize the transaction

      // After a successful transaction, invalidate relevant queries
      // so the UI shows updated balances and transaction history
      queryClient.invalidateQueries({
        queryKey: ["wallet", variables.source_wallet_id, "accounts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["wallet"], // refresh wallet header balances
      });
      // Optionally invalidate a transactions list query
      queryClient.invalidateQueries({
        queryKey: ["transaction_history", variables.initiator_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction_receipt", result.data?.transaction_id],
      });
    },
  });
}
