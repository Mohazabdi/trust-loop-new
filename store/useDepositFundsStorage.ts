import { Account } from "@/lib/types/account_layer.types";
import { create } from "zustand";

interface DepositFundsState {
  noOfUserAccounts: number;
  setNoOfUserAccounts: (n: number) => void;
  amount: string;
  setAmount: (a: string) => void;
  selectedAccount: Account | undefined;
  setSelectedAccount: (a: Account | undefined) => void;
  reset: () => void;
}
export const useDepositFundsStorage = create<DepositFundsState>((set) => ({
  noOfUserAccounts: 0,
  setNoOfUserAccounts: (noOfUserAccounts) => set({ noOfUserAccounts }),
  amount: "",
  setAmount: (amount) => set({ amount }),
  selectedAccount: undefined,
  setSelectedAccount: (selectedAccount) => set({ selectedAccount }),
  reset: () =>
    set({
      amount: "",
    }),
}));
