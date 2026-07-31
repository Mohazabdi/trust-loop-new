import { ImageSourcePropType } from "react-native";

export type AccType =
  | "personal"
  | "overdraft"
  | "group"
  | "organization"
  | "escrow"
  | "savings"
  | "sys_revenue"
  | "sys_clearing"
  | "sys_fee_income"
  | "sys_settlement"
  | "loan"
  | "project";
export type AccStatus = "active" | "dormant" | "frozen" | "closed" | "deleted";
export interface Account {
  id: string;
  acc_number: string;
  acc_name: string;
  acc_type: AccType;
  owner_entity_id: string;
  acc_status: AccStatus;
  acc_currency: string;
  acc_description?: string;
  overdraft_limit: number;
  min_balance: number;
  max_balance: number;
  max_transfer_amount: number;
  min_transfer_amount: number;
  opened_at?: Date;
  closed_at?: Date;
  created_by?: string;
  current_balance: number;
  available_balance: number;
  hold_balance: number;
  created_at?: Date;
  updated_at?: Date;
}
export type RecipientType =
  | "user"
  | "internal_account"
  | "bank"
  | "mobile_money"
  | "group"
  | "organization";
export type RecipientStatus = "active" | "dormant" | "suspended" | "deleted";
export interface Recipient {
  id: string;
  account_id: string;
  account?: Account;
  recipient_type: RecipientType;
  recipient_name: string;
  info?: string;
  display_photo?: ImageSourcePropType | string;
  account_number: string;
  status?: RecipientStatus;
}
export type ProviderType = "bank" | "internal" | "mobile_money";
export interface Providor {
  id: string;
  providor_name: string;
  providor_acc_id: string;
  providor_description?: string;
  providor_logo?: ImageSourcePropType | string;
  providor_type: ProviderType;
}
export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "reversal"
  | "fee"
  | "adjustment"
  | "interest";
export interface TransactionData {
  p_trans_type: TransactionType;
  p_trans_amount: number;
  p_currency: string;
  p_trans_category_id: string;
  p_initiator_id: string;
  p_source_wallet_id: string;
  p_source_acc: string;
  p_destination_acc: string;
  p_idempotency_key: string;
  p_trans_description?: string;
}
export type ActionType = "edit" | "change" | "delete" | "choose";
export type SheetContent = "ACCOUNTS" | "RECIPIENTS" | null;
