export interface TransactionHistory {
  id: string;
  trans_id: string;
  entry_type: "debit" | "credit";
  trans_category: string;
  entry_amount: number;
  entry_status: "pending" | "posted" | "failed";
  transaction_description?:string;
  account_involved:string;
  trans_ref:string;
  date_of_transaction: string;
}
