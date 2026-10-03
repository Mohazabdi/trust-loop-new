// hooks/useTransactionHistory.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { TransactionHistory } from "@/lib/types/transaction_history";
import { useQuery } from "@tanstack/react-query";

export function useTransactionHistory(entity_id?: string) {
  console.log("Entity ID", entity_id);

  return useQuery<TransactionHistory[] | []>({
    queryKey: ["transaction_history", entity_id],
    queryFn: async () => {
      // Guard: if no entity id, return empty array without calling RPC
      if (!entity_id) return [];

      const { data, error } = await supabaseFinance.rpc(
        "get_transaction_history",
        { p_entity_id: entity_id }
      );

      if (error) {
        console.error("RPC error:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error("Function error:", data);
        throw new Error(data?.message || "Unknown error");
      }

      return data.data.transaction_history ?? [];
    },
    enabled: !!entity_id,       // only run when we actually have an ID
    staleTime: 5 * 60 * 1000,
  });
}