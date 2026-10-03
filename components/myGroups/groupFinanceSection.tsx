import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpCircle, EyeClosedIcon, EyeIcon } from "lucide-react-native";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

interface balanceHeroProps {
  balances: number[];
  currency_code: string;
  currency_symbol: string;
  wallet_name: string;
  walletColor: string;
  onRefresh: () => void;
  group_id?: string;
}

export default function GroupFinanceSection({
  balances,
  currency_symbol,
  wallet_name,
  walletColor,
  group_id,
}: balanceHeroProps) {
  const router = useRouter();
  const { theme, isPrivacyOn, togglePrivacy } = useGlobalStorage();

  const totalBalance = useMemo(
    () => balances.reduce((sum, current) => sum + current, 0),
    [balances],
  );

  const formatted = useMemo(
    () =>
      totalBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [totalBalance],
  );

  const displayValue = isPrivacyOn
    ? "••••••••"
    : `${currency_symbol} ${formatted}`;

  const subline = isPrivacyOn
    ? "Hidden"
    : `Available · ${wallet_name ?? "Group wallet"}`;

  return (
    // Shadow lives on the outer wrapper, not on the gradient
    <View
      style={{
        borderRadius: 20,
        backgroundColor: walletColor,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[walletColor, theme.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 18,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.1,
              textTransform: "uppercase",
              color: `${theme.surface}b0`,
            }}
          >
            Group balance
          </Text>

          <TouchableOpacity
            onPress={togglePrivacy}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isPrivacyOn ? "Show balance" : "Hide balance"}
            style={{
              padding: 6,
              borderRadius: 8,
              backgroundColor: `${theme.surface}22`,
            }}
          >
            {isPrivacyOn ? (
              <EyeIcon size={16} color={theme.surface} />
            ) : (
              <EyeClosedIcon size={16} color={theme.surface} />
            )}
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: 34,
              fontWeight: "800",
              letterSpacing: -1,
              color: theme.surface,
              fontVariant: ["tabular-nums"],
            }}
          >
            {displayValue}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: `${theme.surface}aa`,
              marginTop: 4,
              fontWeight: "500",
            }}
          >
            {subline}
          </Text>
        </View>

        {/* Action */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 18,
            paddingTop: 20,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(tabs)/groups/group/wallet/withdraw",
                params: { group_id },
              })
            }
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: theme.surface,
            }}
          >
            <ArrowUpCircle size={17} color={walletColor} strokeWidth={2.2} />
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: "700",
                color: walletColor,
              }}
            >
              Withdrawal request
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}