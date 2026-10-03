import { ProviderType } from "./account_layer.types";

// lib/types/providers.ts
export interface Provider {
  id: string;
  provider_name: string;
  provider_type: ProviderType;
  provider_acc_id: string;
  provider_photo_url?: string;
}
