import {
  ACC_STATUS_UICONFIG_MAP,
  ACC_TYPE_UICONFIG_MAP,
} from "@/lib/configurations/financeMaps.config";
import { WalletAccount } from "@/lib/types/wallets";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LinearGradient } from "expo-linear-gradient";
import { TruncatedText } from "@/utils/TruncateText";
import { CreditCard } from "lucide-react-native";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const RADIUS = 20;
const CARD_WIDTH_RATIO = 0.82;
const GAP = 12;

interface accountProps {
  isLoading: boolean;
  error: Error | null;
  accounts: WalletAccount[] | [];
}

export default function AccountsSection({
  accounts,
  isLoading,
  error,
}: accountProps) {
  const { theme, isPrivacyOn } = useGlobalStorage();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const CARD_WIDTH = SCREEN_WIDTH * CARD_WIDTH_RATIO;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;
  const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const AccountCard = ({
    account,
    index,
  }: {
    account: WalletAccount;
    index: number;
  }) => {
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

    const animatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SNAP_INTERVAL,
        index * SNAP_INTERVAL,
        (index + 1) * SNAP_INTERVAL,
      ];
      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.92, 1, 0.92],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.75, 1, 0.75],
        Extrapolation.CLAMP,
      );
      return { transform: [{ scale }], opacity };
    });

    return (
      <Animated.View
        style={[
          { width: CARD_WIDTH, marginRight: GAP },
          animatedStyle,
        ]}
      >
        {/* Shadow wrapper */}
        <View
          style={{
            borderRadius: RADIUS,
            backgroundColor: color,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={[color, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: RADIUS,
              paddingHorizontal: 20,
              paddingVertical: 18,
              minHeight: 156,
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: statusConfig.color,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: `${theme.surface}b0`,
                  }}
                >
                  {statusConfig.label}
                </Text>
              </View>
              <TouchableOpacity hitSlop={8}>
                <Text
                  style={{
                    fontSize: 16,
                    color: `${theme.surface}b0`,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  ···
                </Text>
              </TouchableOpacity>
            </View>

            {/* Middle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: `${theme.surface}20`,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon size={22} color={theme.surface} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <TruncatedText
                  text={account.account_name}
                  maxLines={1}
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: theme.surface,
                    letterSpacing: -0.2,
                  }}
                />
                <Text
                  style={{
                    fontSize: 11.5,
                    color: `${theme.surface}aa`,
                    fontWeight: "500",
                  }}
                >
                  {account.account_number}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: `${theme.surface}b0`,
                    marginBottom: 3,
                  }}
                >
                  Available
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: theme.surface,
                    letterSpacing: -0.6,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {isPrivacyOn
                    ? "••••••"
                    : `${account.currency_code} ${account.available_balance}`}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: `${theme.surface}22`,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: theme.surface,
                  }}
                >
                  {label}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  };

  /* ── States ──────────────────────────────────────────── */
  if (isLoading && (!accounts || accounts.length === 0)) {
    return (
      <View style={{ paddingVertical: 24, alignItems: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          marginHorizontal: 20,
          padding: 16,
          borderRadius: RADIUS,
          backgroundColor: `${theme.text}06`,
        }}
      >
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          Couldn't load accounts
        </Text>
      </View>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <View
        style={{
          marginHorizontal: 20,
          padding: 24,
          borderRadius: RADIUS,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: `${theme.text}15`,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          No accounts yet
        </Text>
      </View>
    );
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <View>
      {/* Count row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: theme.textSecondary,
            letterSpacing: 0.4,
          }}
        >
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {accounts.map((_, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: `${theme.text}22`,
              }}
            />
          ))}
        </View>
      </View>

      <Animated.ScrollView
        horizontal
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING,
          paddingVertical: 8,
        }}
      >
        {accounts.map((account, index) => (
          <AccountCard
            key={account.account_id}
            account={account}
            index={index}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}