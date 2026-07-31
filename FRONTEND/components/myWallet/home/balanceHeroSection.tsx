import { useGlobalStorage } from "@/store/useGlobalStorage";
import { BalanceHeroSectionStyles } from "@/styles/wallet_styles/balance_hero.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { LinearGradient } from "expo-linear-gradient";
import {
  EyeClosedIcon,
  EyeIcon,
  RotateCcw,
  Wallet2,
  Wifi,
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { toast } from "sonner-native";

interface balanceHeroProps {
  balances: number[];
  currency_code: string;
  currency_symbol: string;
  wallet_name: string;
  walletColor: string;      // main brand color for this wallet
  onRefresh: () => void;
}

export default function BalanceHeroSection({
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
  const styles = useMemo(() => BalanceHeroSectionStyles(theme), [theme]);

  return (
    <LinearGradient
      // Gradient from walletColor to the theme's dark secondary for depth
      colors={[walletColor, theme.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { borderColor: walletColor }]}
    >
      <View style={styles.content}>
        {/* ---- Wallet info panel ---- */}
        <View style={styles.widgetPanel}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Wallet2 size={25} color={theme.surface} />
            </View>
            <View style={styles.headerMid}>
              <TruncatedText
                text={wallet_name}
                style={[styles.headerMidText, { color: theme.surface }]}
              />
            </View>
            <View style={styles.headerRight}>
              <Wifi size={20} color={theme.success} />
            </View>
          </View>

          <View style={styles.totalBalancePanel}>
            {isPrivacyOn ? (
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: theme.surface }}>
                  {currency_symbol}{" "}
                </Text>
                <Text style={[styles.totalBalanceText, { color: theme.surface }]}>
                  {totalBalance.toLocaleString()}.00
                </Text>
              </View>
            ) : (
              <Text style={[styles.totalBalanceText, { color: theme.surface }]}>
                .........
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerCurrencyContainer}>
              <Text style={[styles.footerCurrencyText, { color: theme.surface }]}>
                {isPrivacyOn ? currency_code : "..."}
              </Text>
            </View>
            <View style={styles.footerBalanceTypeContainer}>
              <Text style={[styles.footerBalanceTypeText, { color: theme.surface }]}>
                Available Balance for {balances.length} account
                {balances.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* ---- Action buttons ---- */}
        <View style={styles.optionsPanel}>
          {/* Privacy toggle – gradient button */}
          <Pressable onPress={togglePrivacy}>
            <LinearGradient
              colors={[walletColor, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.optionsIcons}
            >
              {isPrivacyOn ? (
                <EyeIcon size={20} color={theme.surface} />
              ) : (
                <EyeClosedIcon size={20} color={theme.surface} />
              )}
            </LinearGradient>
          </Pressable>

          {/* Refresh button – gradient button */}
          <Pressable onPress={onRefresh}>
            <LinearGradient
              colors={[walletColor, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.optionsIcons}
            >
              <RotateCcw size={20} color={theme.surface} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}