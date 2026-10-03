import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { TransactionReceipt } from "@/lib/types/transaction_receipt";
import { useQuery } from "@tanstack/react-query";
export function useTransactionReceipt(trans_id?: string, entity_id?: string) {
  return useQuery<TransactionReceipt>({
    queryKey: ["transaction_receipt", trans_id],
    queryFn: async () => {
      console.log("Calling get_transaction with:", trans_id);
      const { data, error } = await supabaseFinance.rpc("get_transaction", {
        p_transaction_id: trans_id,
        p_viewer_entity_id: entity_id,
      });

      if (error) {
        console.error("❌ RPC error:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error("❌ Function error:", data);
        throw new Error(data?.message || "Unknown error");
      }
      return data.data.transaction_details;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}
