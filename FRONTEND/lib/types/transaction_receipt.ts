export interface TransactionReceipt {
  id: string;
  recipient_entity_id: string;
  transaction_category: string;
  source_name: string;
  source_type: "member" | "group";
  entry_status: string;
  providor_ref: string;
  providor_name: string;
  source_acc_no: string;
  recipient_name: string;
  recipient_type: "member" | "group";
  source_acc_name: string;
  transaction_ref: string;
  recipient_acc_no: string;
  source_wallet_no: string;
  transaction_type: string;
  ledger_entry_date: string;
  ledger_entry_type: "debit" | "credit";
  providor_acc_name: string;
  applied_fee_amount: number;
  recipient_acc_name: string;
  source_wallet_name: string;
  date_of_transaction: string;
  ledger_entry_amount: number;
  ledger_entry_status: "pending" | "posted" | "failed";
  recipient_wallet_no: string;
  recipient_wallet_name: string;
}
