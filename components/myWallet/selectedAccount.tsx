import { ACC_TYPE_UICONFIG_MAP } from "@/lib/configurations/financeMaps.config";
import { WalletAccount } from "@/lib/types/wallets";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { SelectedAccountStyles } from "@/styles/wallet_styles/selected_account.style";
import {
    CreditCard,
    EyeClosedIcon,
    EyeIcon,
    RotateCcw,
    SquareArrowOutUpRight,
} from "lucide-react-native";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
interface SelectedAccountProps {
  account: WalletAccount;
  openBottomSheet: () => void;
}
export default function SelectedAccount({
  account,
  openBottomSheet,
}: SelectedAccountProps) {
  const { theme, isPrivacyOn, togglePrivacy } = useGlobalStorage();
  const styles = useMemo(() => SelectedAccountStyles(theme), [theme]);
  const Icon = ACC_TYPE_UICONFIG_MAP[account.account_type]?.icon ?? CreditCard;
  const color = ACC_TYPE_UICONFIG_MAP[account.account_type]?.color ?? "#baf0f1";
  const label = ACC_TYPE_UICONFIG_MAP[account.account_type]?.label ?? "Account";

  return (
    <View style={styles.container}>
      <View style={styles.accountCardContainter}>
        <View style={styles.accountCardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Selected Account</Text>
            <Text style={[styles.accountTypeText, { borderColor: color }]}>
              {label}
            </Text>
          </View>
          <TouchableOpacity style={styles.cardBody} onPress={openBottomSheet}>
            <View style={styles.accountDetailsContainer}>
              <View style={styles.accountDetailsIcon}>
                <Icon size={32} color={theme.text} />
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{account.account_name}</Text>
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
          </TouchableOpacity>
          <View style={styles.accountCardActions}>
            <TouchableOpacity
              onPress={togglePrivacy}
              style={styles.optionsIcons}
            >
              {isPrivacyOn ? (
                <EyeIcon size={20} color={theme.foreground} />
              ) : (
                <EyeClosedIcon size={20} color={theme.foreground} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsIcons}>
              <RotateCcw size={17} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
