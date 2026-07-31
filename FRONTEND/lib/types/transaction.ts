export interface TransactionInput {
  trans_type: string;
  trans_amount: number;
  currency: string;
  trans_category_id: string;
  initiator_id: string;
  source_wallet_id: string;
  source_acc: string;
  destination_acc: string;
  providor_id: string | null;
  idempotency_key: string;
  trans_description?: string;
}

export interface TransactionResult {
  success: boolean;
  data?: {
    transaction_id: string;
    transaction_status: string;
    provision_id: string;
    transaction_type: string;
    idempotency_id: string;
  };
  message?: string;
  error_code?: string;
}

export interface FinalizeInput {
  transaction_id: string;
  transaction_status: "completed" | "failed";
  idempotency_id: string;
}
export interface FinalizeResult {
  success: boolean;
  data?: {
    transaction_id: string;
  };
  message?: string;
  error_code?: string;
}
