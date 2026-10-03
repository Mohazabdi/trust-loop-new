// hooks/useWalletRealtime.ts
import { supabase } from "@/lib/mysupabase/supabase";
import { WalletAccount } from "@/lib/types/wallets";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useWalletRealtime(walletId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!walletId) return;

    // Subscribe to account changes linked to this wallet
    const channel = supabase
      .channel(`wallet-${walletId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "finance",
          table: "wallet_accounts",
          filter: `wallet_id=eq.${walletId}`, // only this wallet
        },
        () => {
          // Invalidate the accounts query — it refetches automatically
          queryClient.invalidateQueries({
            queryKey: ["wallet", walletId, "accounts"],
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "finance",
          table: "accounts",
        },
        () => {
          // Balance changes affect this wallet's accounts
          queryClient.invalidateQueries({
            queryKey: ["wallet", walletId, "accounts"],
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "finance",
          table: "wallets",
          filter: `id=eq.${walletId}`,
        },
        () => {
          // Wallet itself changed
          queryClient.invalidateQueries({
            queryKey: ["wallet"],
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "finance",
          table: "accounts",
        },
        (payload) => {
          const updatedAccount = payload.new;

          // Update the cached accounts list directly (no refetch)
          queryClient.setQueryData(
            ["wallet", walletId, "accounts"],
            (old: WalletAccount[] | undefined) => {
              if (!old) return old;
              return old.map((acc) =>
                acc.account_id === updatedAccount.id
                  ? { ...acc, ...updatedAccount }
                  : acc,
              );
            },
          );
        },
      )
      .subscribe();

    // Cleanup on unmount or when walletId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId, queryClient]);
}
