import { RecipientStatus, RecipientType } from "./account_layer.types";

// types/recipients.ts
export interface Recipient {
  id: string;
  account_id: string;
  account_number: string;
  account_name?: string;
  recipient_name: string;
  recipient_type?: RecipientType;
  status?: RecipientStatus;
  display_photo?: string;
}
