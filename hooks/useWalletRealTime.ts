// hooks/useWalletRealtime.ts
import { supabase } from "@/lib/mysupabase/supabase";
import { WalletAccount } from "@/lib/types/wallets";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useWalletRealtime(walletId?: string) {
  const queryClient = useQueryClient();
  
  // 1. Generate a unique ID for this specific component instance
  const instanceId = useRef(Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (!walletId) return;

    // 2. Append the unique instance ID to the channel name
    const channelName = `wallet-${walletId}-${instanceId.current}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "finance",
          table: "wallet_accounts",
          filter: `wallet_id=eq.${walletId}`, // only this wallet
        },
        () => {
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
      .subscribe(); // Make sure subscribe is ALWAYS at the very end

    // Cleanup on unmount or when walletId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId, queryClient]);
}