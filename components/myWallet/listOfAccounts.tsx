import { useMemberData } from "@/hooks/useMemberData";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { ACC_TYPE_UICONFIG_MAP } from "@/lib/configurations/financeMaps.config";
import { WalletAccount } from "@/lib/types/wallets";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { ListOfAccountsStyles } from "@/styles/wallet_styles/list_of_accounts.styles";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
    CheckCircle,
    CreditCard,
    EyeClosedIcon,
    EyeIcon,
    RotateCcw,
} from "lucide-react-native";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
interface ListOfAccountsProps {
  // selectedAccount?: Account;
  // onSelectedAccount?: (account: Account | undefined) => void;
  closeBottomSheet: () => void;
}

export default function ListOfAccounts({
  closeBottomSheet,
}: ListOfAccountsProps) {
  const { theme, isPrivacyOn, togglePrivacy } = useGlobalStorage();
  const { selectedAccount, setSelectedAccount } = useTransferFundsStorage();
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
  } = useMemberData();
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
  } = useUserWallet(member?.id);
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useWalletAccounts(wallet?.wallet_id);

  const styles = useMemo(() => ListOfAccountsStyles(theme), [theme]);
  const handleSelectedAccount = (account: WalletAccount) => {
    account.account_id === selectedAccount?.account_id
      ? setSelectedAccount?.(undefined)
      : setSelectedAccount?.(account);
    console.log(`Accounts selected :${account.account_id}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.containerHeader}>
        Tap to Select/Deselect a Source account
      </Text>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 10 }}>
        {accounts?.map((account) => {
          const Icon =
            ACC_TYPE_UICONFIG_MAP[account.account_type]?.icon ?? CreditCard;
          const color =
            ACC_TYPE_UICONFIG_MAP[account.account_type]?.color ?? "#c2c2c2";
          const label =
            ACC_TYPE_UICONFIG_MAP[account.account_type]?.label ?? "Account";
          return (
            <View style={styles.accountCardContainter} key={account.account_id}>
              <TouchableOpacity
                style={[
                  styles.accountCardBody,
                  {
                    borderColor:
                      account.account_id === selectedAccount?.account_id
                        ? theme.success
                        : theme.border,
                  },
                ]}
                onPress={() => handleSelectedAccount(account)}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.accountTypeText, { borderColor: color }]}
                  >
                    {label}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.accountDetailsContainer}>
                    <View style={styles.accountDetailsIcon}>
                      <Icon size={32} color={theme.text} />
                    </View>
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>
                        {account.account_name}
                      </Text>
                      <Text style={styles.accountNumber}>
                        {account.account_number}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountBalanceContainer}>
                    <Text style={styles.accountCurrency}>
                      {isPrivacyOn ? account.currency_code : "--"}
                    </Text>
                    <Text style={styles.accountBalance}>
                      {isPrivacyOn ? account.available_balance : "----"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </BottomSheetScrollView>
      <View style={styles.accountCardActions}>
        <TouchableOpacity onPress={togglePrivacy} style={styles.optionsIcons}>
          {isPrivacyOn ? (
            <EyeIcon size={20} color={theme.foreground} />
          ) : (
            <EyeClosedIcon size={20} color={theme.foreground} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionsIcons}>
          <RotateCcw size={20} color={theme.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionsIcons,
            {
              backgroundColor:
                selectedAccount?.account_id !== undefined
                  ? theme.success
                  : theme.surface,
              borderColor:
                selectedAccount?.account_id !== undefined
                  ? theme.surface
                  : theme.border,
            },
          ]}
          onPress={closeBottomSheet}
        >
          <Text style={styles.optionsIconsText}>Done</Text>
          <CheckCircle size={20} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
