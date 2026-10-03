import {
    ActionType,
    //Providor,
    //Recipient,
} from "@/lib/types/account_layer.types";
import { Provider } from "@/lib/types/providers";
import { Recipient } from "@/lib/types/recipients";
//import { Recipient } from "@/lib/types/recipients";
import { WalletAccount } from "@/lib/types/wallets";
import { create } from "zustand";

interface TransferFundsState {
  transactionCategory:string;
  setTransactionCategory:(s:string)=>void;
  noOfUserAccounts: number;
  setNoOfUserAccounts: (n: number) => void;
  amount: string;
  setAmount: (a: string) => void;
  description: string;
  setDescription: (d: string) => void;
  selectedRecipient: Recipient | undefined;
  setSelectedRecipient: (r: Recipient | undefined) => void;
  selectedAccount: WalletAccount | undefined;
  setSelectedAccount: (a: WalletAccount | undefined) => void;
  selectedBankProvider: Provider | undefined;
  setSelectedBankProvider: (p: Provider | undefined) => void;
  selectedMobileProvider: Provider | undefined;
  recipientDrawerAction: ActionType;
  setRecipientDrawerAction: (a: ActionType) => void;
  setSelectedMobileProvider: (p: Provider | undefined) => void;
  reset: () => void;
}
export const useTransferFundsStorage = create<TransferFundsState>((set) => ({
  transactionCategory: 'Funds Trasfer',
  setTransactionCategory: (transactionCategory) => set({ transactionCategory }),
   noOfUserAccounts: 0,
  setNoOfUserAccounts: (noOfUserAccounts) => set({ noOfUserAccounts }),
  amount: "",
  setAmount: (amount) => set({ amount }),
  recipientDrawerAction: "change",
  setRecipientDrawerAction: (recipientDrawerAction) =>
    set({ recipientDrawerAction }),
  description: "",
  setDescription: (description) => set({ description }),
  selectedAccount: undefined,
  setSelectedAccount: (selectedAccount) => set({ selectedAccount }),
  selectedRecipient: undefined,
  setSelectedRecipient: (selectedRecipient) => set({ selectedRecipient }),
  selectedBankProvider: undefined,
  setSelectedBankProvider: (selectedBankProvider) =>
    set({ selectedBankProvider }),
  selectedMobileProvider: undefined,
  setSelectedMobileProvider: (selectedMobileProvider) =>
    set({ selectedMobileProvider }),

  reset: () =>
    set({
      transactionCategory:'',
      amount: "",
      description: "",
      selectedRecipient: undefined,
    }),
}));
