import { AccStatus, AccType } from "./account_layer.types";

export interface UserWallet {
  wallet_id: string;
  wallet_name: string;
  wallet_number: string;
  wallet_type: string;
  wallet_status: string;
}

export interface WalletAccount {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: AccType;
  currency_code: string;
  currency_symbol: string | null;
  current_balance: number;
  available_balance: number;
  account_status: AccStatus;
  color_tag: string | null;
  hold_balance:number;
  currency_name?:string;
}
