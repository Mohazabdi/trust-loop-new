// hooks/useRecipients.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { TransactionHistory } from "@/lib/types/transaction_history";
//import { Recipient } from "@/lib/types/recipients";
import { useQuery } from "@tanstack/react-query";

export function useTransactionHistory(entity_id?: string) {
  console.log("Entity ID",entity_id);
  return useQuery<TransactionHistory[] | []>({
    queryKey: ["transaction_history", entity_id],
    queryFn: async () => {
      const { data, error } = await supabaseFinance.rpc(
        "get_transaction_history",
        {
          p_entity_id: entity_id,
        },
      );
      //console.log("historyDataFrom",data.data)
     if (error) {
        console.error("❌ RPC error:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error("❌ Function error:", data);
        throw new Error(data?.message || "Unknown error");
      }
      //console.log("transactionHistoryDataFromDB", data.data.transaction_history);
      return data.data.transaction_history;
    },
    enabled: true, // always ready if user is logged in; add auth check if needed
    staleTime: 5 * 60 * 1000,
  });
}
