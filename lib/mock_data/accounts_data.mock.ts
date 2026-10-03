import {
    Account,
    AccStatus,
    AccType,
    ProviderType,
    Providor,
    Recipient,
    RecipientType,
} from "../types/account_layer.types";

const mockAccounts: Account[] = [
  {
    id: "001",
    acc_name: "Alvin's Personal account",
    acc_type: "personal",
    acc_currency: "KES",
    acc_number: "ACC_001",
    acc_status: "active",
    available_balance: 0,
    current_balance: 0,
    hold_balance: 0,
    max_balance: 0,
    max_transfer_amount: 0,
    min_balance: 0,
    min_transfer_amount: 0,
    overdraft_limit: 0,
    owner_entity_id: "alvin",
  },
  {
    id: "002",
    acc_name: "Alvin's Overdraft account",
    acc_type: "overdraft",
    acc_currency: "KES",
    acc_number: "ACC_002",
    acc_status: "dormant",
    available_balance: 0,
    current_balance: 0,
    hold_balance: 0,
    max_balance: 0,
    max_transfer_amount: 0,
    min_balance: 0,
    min_transfer_amount: 0,
    overdraft_limit: 0,
    owner_entity_id: "alvin",
  },
  {
    id: "003",
    acc_name: "Alvin's Loans account",
    acc_type: "loan",
    acc_currency: "KES",
    acc_number: "ACC_003",
    acc_status: "deleted",
    available_balance: 0,
    current_balance: 0,
    hold_balance: 0,
    max_balance: 0,
    max_transfer_amount: 0,
    min_balance: 0,
    min_transfer_amount: 0,
    overdraft_limit: 0,
    owner_entity_id: "alvin",
  },
  {
    id: "004",
    acc_name: "Mama Mboga Group account",
    acc_type: "group",
    acc_currency: "KES",
    acc_number: "ACC_001",
    acc_status: "frozen",
    available_balance: 0,
    current_balance: 0,
    hold_balance: 0,
    max_balance: 0,
    max_transfer_amount: 0,
    min_balance: 0,
    min_transfer_amount: 0,
    overdraft_limit: 0,
    owner_entity_id: "alvin",
  },
];
const mockRecipients: Recipient[] = [
  {
    id: "003",
    account_id: "acc_003",
    account_number: "acc_003_alvin",
    recipient_name: "Alvin Indiazi",
    recipient_type: "user",
    display_photo: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
  {
    id: "004",
    account_id: "acc_004",
    recipient_name: "Mama Mboga Chama",
    recipient_type: "group",
    account_number: "acc_003_chama",
  },
  {
    id: "005",
    account_id: "acc_005",
    recipient_name: "Loans Account",
    recipient_type: "internal_account",
    account_number: "acc_003_loans",
  },
];
const mockProvidors: Providor[] = [
  {
    id: "p001",
    providor_acc_id: "AC_001_P",
    providor_name: "Mpesa",
    providor_type: "mobile_money",
    providor_logo: require("../../assets/images/recipientImages/mpesaLogo.png"),
  },
  {
    id: "p002",
    providor_acc_id: "AC_001_P",
    providor_name: "Airtel Money",
    providor_type: "mobile_money",
  },
  {
    id: "p003",
    providor_acc_id: "AC_001_P",
    providor_name: "ABSA",
    providor_type: "bank",
  },
  {
    id: "p004",
    providor_acc_id: "AC_001_P",
    providor_name: "Equity",
    providor_type: "bank",
    providor_logo: require("../../assets/images/recipientImages/EquityBankLogo.png"),
  },
  {
    id: "p005",
    providor_acc_id: "AC_001_P",
    providor_name: "KCB",
    providor_type: "bank",
  },
];
export interface AccountFilters {
  acc_types?: Set<AccType>;
  acc_statuses?: Set<AccStatus>;
}
const accStatuses = (account: Account, statuses?: Set<AccStatus>) =>
  !statuses?.size || statuses?.has(account.acc_status);
const accTypes = (account: Account, acc_types?: Set<AccType>) =>
  !acc_types?.size || acc_types?.has(account.acc_type);
export const getAccounts = async (filters?: AccountFilters) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return mockAccounts.filter((account) => {
    return (
      accStatuses(account, filters?.acc_statuses) &&
      accTypes(account, filters?.acc_types)
    );
  }) as Account[];
};

export interface RecipientFilters {
  recipient_types?: Set<RecipientType>;
}
const recipientTypes = (recipient: Recipient, statuses?: Set<RecipientType>) =>
  !statuses?.size || statuses?.has(recipient.recipient_type);
export const getRecipients = async (filters?: RecipientFilters) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return mockRecipients.filter((recipient) => {
    return recipientTypes(recipient, filters?.recipient_types);
  }) as Recipient[];
};
export interface ProvidorFilters {
  providor_types?: Set<ProviderType>;
}
const providorTypes = (providor: Providor, types?: Set<ProviderType>) =>
  !types?.size || types?.has(providor.providor_type);
export const getProvidors = async (filters?: ProvidorFilters) => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); //sim server
  return mockProvidors.filter((providor) => {
    return providorTypes(providor, filters?.providor_types);
  }) as Providor[];
};
