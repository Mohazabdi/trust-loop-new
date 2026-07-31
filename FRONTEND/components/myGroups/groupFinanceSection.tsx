import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  EyeClosedIcon,
  EyeIcon,
  RotateCcw,
  Settings2,
  TrendingDown,
} from "lucide-react-native";
import { useMemo } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { GroupFinanceSectionStyles } from "../../styles/group_style/group_finance_section.styles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface balanceHeroProps {
  balances: number[];
  currency_code: string;
  currency_symbol: string;
  wallet_name: string;
  walletColor: string;
  onRefresh: () => void;
}

export default function GroupFinanceSection({
  balances,
  currency_code,
  currency_symbol,
  wallet_name,
  walletColor,
  onRefresh,
}: balanceHeroProps) {
  const totalBalance = balances.reduce((sum, current) => sum + current, 0);
  const { theme, isPrivacyOn, togglePrivacy, setIsWalletSettingsSheetOpen } =
    useGlobalStorage();
  const styles = useMemo(() => GroupFinanceSectionStyles(theme), [theme]);

  return (
    <LinearGradient
      colors={[walletColor, theme.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.groupFinanceContainer,
        {
          borderRadius: 24,
          shadowColor: walletColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {/* ---- Body ---- */}
      <View style={styles.groupFinanceBody}>
        <View style={styles.groupFinanceBalancesContainer}>
          <View style={styles.footer}>
            <View style={styles.footerCurrencyContainer}>
              <Text style={[styles.footerCurrencyText, { color: theme.surface }]}>
                {isPrivacyOn ? currency_code : "..."}
              </Text>
            </View>
            <View style={styles.footerBalanceTypeContainer}>
              <Text style={[styles.footerBalanceTypeText, { color: `${theme.surface}cc` }]}>
                Available Balance for {balances.length} account
                {balances.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {isPrivacyOn ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold", color: theme.surface }}>
                {currency_symbol}{" "}
              </Text>
              <Text style={[styles.groupFinanceAvailableBalNo, { color: theme.surface }]}>
                {totalBalance.toLocaleString()}.00
              </Text>
            </View>
          ) : (
            <Text style={[styles.groupFinanceAvailableBalNo, { color: theme.surface }]}>
              ........
            </Text>
          )}
        </View>

        {/* ---- Analysis ---- */}
        <View style={styles.groupFianceAnalysisContainer}>
          <View style={styles.groupFinanceIncome}>
            <ArrowDownCircle size={17} color={theme.success} />
            <Text style={[styles.analysisText, { color: theme.surface }]}>Income</Text>
            <Text style={[styles.AmountText, { color: theme.surface }]}>0.0k</Text>
          </View>
          <View style={styles.groupFinanceExpenses}>
            <ArrowUpCircle size={17} color={theme.error} />
            <Text style={[styles.analysisText, { color: theme.surface }]}>Expense</Text>
            <Text style={[styles.AmountText, { color: theme.surface }]}>0.0k</Text>
          </View>
          <View style={styles.groupFinanceNetFlow}>
            <TrendingDown size={17} color={theme.error} />
            <Text style={[styles.analysisText, { color: theme.surface }]}>NetFlow</Text>
            <Text style={[styles.AmountText, { color: theme.surface }]}>0.0k</Text>
          </View>
        </View>

        {/* ---- Footer info ---- */}
        <View style={styles.groupFinanceBodyFooter}>
          <Text style={[styles.groupFinanceSectionAccCount, { color: theme.surface }]}>
            {balances.length} Active Account{balances.length > 1 ? "s" : ""}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Text style={[styles.groupFinanceUpdatedatText, { color: `${theme.surface}cc` }]}>
              updated at : just now
            </Text>
          </View>
        </View>
      </View>

      {/* ---- Action buttons ---- */}
      <View style={styles.groupFinanceFooter}>
        <TouchableOpacity
          style={[
            styles.groupFinanceActions,
            { backgroundColor: `${theme.surface}20` }, // semi-transparent white
          ]}
          onPress={() => setIsWalletSettingsSheetOpen(true)}
        >
          <Settings2 size={17} color={theme.surface} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.groupFinanceActions, { backgroundColor: `${theme.surface}20` }]}
          onPress={togglePrivacy}
        >
          {isPrivacyOn ? (
            <EyeIcon size={17} color={theme.surface} />
          ) : (
            <EyeClosedIcon size={17} color={theme.surface} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.groupFinanceActions, { backgroundColor: `${theme.surface}20` }]}
          onPress={onRefresh}
        >
          <RotateCcw size={17} color={theme.surface} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}