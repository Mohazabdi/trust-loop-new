import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { UserWallet } from "@/lib/types/wallets";
import { useQuery } from "@tanstack/react-query";
export function useUserWallet(entityId?: string) {
  return useQuery<UserWallet>({
    queryKey: ["wallet", entityId],
    queryFn: async () => {
      const { data, error } = await supabaseFinance.rpc("get_user_wallet", {
        p_entity_id: entityId!,
      });

      if (error) {
        console.error("❌ RPC error:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error("❌ Function error:", data);
        throw new Error(data?.message || "Unknown error");
      }
      return data.data;
    },
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000,
  });
}
