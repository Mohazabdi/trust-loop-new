import {
    ArrowLeftRight,
    BanknoteArrowDown,
    BanknoteArrowUp,
    Building2,
    Cog,
    Coins,
    CreditCard,
    FolderOpen,
    HandCoins,
    Landmark,
    LucideIcon,
    PlusCircle,
    RotateCcw,
    Shield,
    Smartphone,
    Sprout,
    User2,
    Users2,
} from "lucide-react-native";
import {
    AccStatus,
    AccType,
    ProviderType,
    RecipientStatus,
    RecipientType,
    TransactionType,
} from "../types/account_layer.types";

interface accountTypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}
export const ACC_TYPE_UICONFIG_MAP: Record<AccType, accountTypeConfig> = {
  personal: { icon: CreditCard, label: "Personal", color: "#11241d" },
  overdraft: { icon: Coins, label: "Overdraft", color: "#505050" },
  group: { icon: Users2, label: "Group", color: "rgb(6, 28, 53)" },
  organization: { icon: Building2, label: "Organization", color: "#b3007d" },
  escrow: { icon: Shield, label: "Escrow", color: "#270f22" },
  savings: { icon: Sprout, label: "Savings", color: "#726706" },
  sys_revenue: { icon: Cog, label: "System Revenue", color: "#ffff" },
  sys_clearing: { icon: Cog, label: "System Clearing", color: "#ffffff" },
  sys_fee_income: { icon: Cog, label: "System Fee Income", color: "#ffffff" },
  sys_settlement: { icon: Cog, label: "System Settlement", color: "#ffffff" },
  loan: { icon: HandCoins, label: "Loan", color: "#5e2f09" },
  project: { icon: FolderOpen, label: "Project", color: "#82049b" },
};
interface AccStatusConfig {
  label: string;
  color: string;
}
export const ACC_STATUS_UICONFIG_MAP: Record<AccStatus, AccStatusConfig> = {
  active: { label: "Active", color: "#10B981" },
  dormant: { label: "Dormant", color: "rgb(180, 180, 180)" },
  frozen: { label: "Frozen", color: "#d7faf7" },
  closed: { label: "Closed", color: "#fae634" },
  deleted: { label: "Deleted", color: "#feae" },
};

interface RecipientStatusConfig {
  label: string;
  color: string;
}
export const RECIPIENT_STATUS_UICONFIG_MAP: Record<
  RecipientStatus,
  RecipientStatusConfig
> = {
  active: { label: "Active", color: "#10B981" },
  dormant: { label: "Dormant", color: "rgb(126, 126, 126)" },
  suspended: { label: "Innactive", color: "#fae634" },
  deleted: { label: "Deleted", color: "rgba(207, 15, 8, 0.93)" },
};
interface RecipientTypeConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}
interface ProvidorTypeConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}
export const PROVIDOR_TYPE_UICONFIG_MAP: Record<
  ProviderType,
  ProvidorTypeConfig
> = {
  mobile_money: { label: "Mobile Money", color: "", icon: Smartphone },
  bank: { label: "Bank", color: "", icon: Landmark },
  internal: { label: "Internal Account", color: "", icon: CreditCard },
};
export const RECIPIENT_TYPE_UICONFIG_MAP: Record<
  RecipientType,
  RecipientTypeConfig
> = {
  user: { label: "User", color: "#122411", icon: User2 },
  internal_account: {
    label: "Internal Account",
    color: "#241111",
    icon: CreditCard,
  },
  bank: { label: "Bank", color: "#122411", icon: Landmark },
  mobile_money: { label: "Mobile Money", color: "#122411", icon: Smartphone },
  group: { label: "Group", color: "#211124", icon: Users2 },
  organization: { label: "Organization", color: "#242011", icon: Building2 },
};
interface TransactionTypeConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}
export const TRANSACTION_TYPE_UICONFIG_MAP: Record<
  TransactionType,
  TransactionTypeConfig
> = {
  deposit: {
    label: "Deposit",
    color: "rgba(58, 138, 11, 0.93)",
    icon: BanknoteArrowUp,
  },
  withdrawal: {
    label: "Withdrawal",
    color: "rgba(170, 63, 14, 0.93)",
    icon: BanknoteArrowDown,
  },
  transfer: {
    label: "Transfer",
    color: "rgba(9, 44, 158, 0.93)",
    icon: ArrowLeftRight,
  },
  reversal: {
    label: "Reversal",
    color: "rgba(150, 13, 127, 0.93)",
    icon: RotateCcw,
  },
  fee: { label: "Fee", color: "#ffee", icon: Coins },
  adjustment: {
    label: "Adjustment",
    color: "rgba(92, 92, 92, 0.93)",
    icon: Cog,
  },
  interest: {
    label: "Intrest",
    color: "rgba(212, 193, 22, 0.93)",
    icon: PlusCircle,
  },
};
