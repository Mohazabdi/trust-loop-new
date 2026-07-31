import {
  ACC_STATUS_UICONFIG_MAP,
  ACC_TYPE_UICONFIG_MAP,
} from "@/lib/configurations/financeMaps.config";
import { WalletAccount } from "@/lib/types/wallets";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LinearGradient } from "expo-linear-gradient";
import { UserAccountsSectionStyles } from "@/styles/wallet_styles/user_accounts_section.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { CreditCard, Dot, SquareArrowOutUpRight } from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface accountProps {
  isLoading: boolean;
  error: Error | null;
  accounts: WalletAccount[] | [];
}

export default function AccountsSection({ accounts, isLoading, error }: accountProps) {
  const { theme, isPrivacyOn } = useGlobalStorage();
  const styles = useMemo(() => UserAccountsSectionStyles(theme), [theme]);

  const CARD_WIDTH = SCREEN_WIDTH * 0.78;
  const GAP = 16;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sectionTitle}>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} size={10} />
          ) : (
            <Text style={styles.titleText}>
              Account{accounts?.length !== 1 ? "s" : ""} ({accounts?.length})
            </Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{
            paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2, // centred first/last card
          }}
        >
          {accounts?.map((account) => {
            const Icon =
              ACC_TYPE_UICONFIG_MAP[account.account_type]?.icon ?? CreditCard;
            const color =
              ACC_TYPE_UICONFIG_MAP[account.account_type]?.color ?? "#193017";
            const label =
              ACC_TYPE_UICONFIG_MAP[account.account_type]?.label ?? "Account";
            const statusConfig =
              ACC_STATUS_UICONFIG_MAP[account.account_status] ?? {
                color: theme.textSecondary,
                label: account.account_status,
              };

            return (
              <LinearGradient
                key={account.account_id}
                colors={[color, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.accountCard,
                  {
                    width: CARD_WIDTH,
                    marginRight: GAP,
                    borderRadius: 24,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: `${color}40`, // subtle border glow
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.accountStatusContainer}>
                    <Dot size={30} color={statusConfig.color} />
                    <Text style={[styles.accountStatusText, { color: theme.surface }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.moreAccountOptions}>
                    <Text style={[styles.moreAccountOptionsDots, { color: theme.surface }]}>
                      ...
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <View style={styles.accountDetailsContainer}>
                    <View style={styles.accountDetailsIcon}>
                      <Icon size={32} color={color} />
                    </View>
                    <View style={styles.accountDetails}>
                      <TruncatedText
                        text={account.account_name}
                        maxLines={2}
                        style={[styles.accountName, { color: theme.surface }]}
                      />
                      <Text style={[styles.accountNumber, { color: `${theme.surface}cc` }]}>
                        {account.account_number}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountBalanceContainer}>
                    <Text style={[styles.accountCurrency, { color: `${theme.surface}cc` }]}>
                      {isPrivacyOn ? account.currency_code : "--"}
                    </Text>
                    <Text style={[styles.accountBalance, { color: theme.surface }]}>
                      {isPrivacyOn ? account.available_balance : "----"}
                    </Text>
                  </View>
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.accountTypeText,
                      {
                        backgroundColor: `${theme.surface}20`, // semi-transparent white
                        color: theme.surface,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  <TouchableOpacity>
                    <SquareArrowOutUpRight size={20} color={theme.surface} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}