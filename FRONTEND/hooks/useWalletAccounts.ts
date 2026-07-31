import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { WalletAccount } from "@/lib/types/wallets";
import { useQuery } from "@tanstack/react-query";

// hooks/useWalletAccounts.ts
export function useWalletAccounts(walletId?: string) {
  return useQuery<WalletAccount[] | []>({
    queryKey: ["wallet", walletId, "accounts"],
    queryFn: async () => {
      const { data, error } = await supabaseFinance.rpc("get_wallet_accounts", {
        p_wallet_id: walletId!,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message);
      return data.data.accounts;
    },
    enabled: !!walletId,
    staleTime: 2 * 60 * 1000, // accounts change more often
  });
}
