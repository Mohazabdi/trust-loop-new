import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import RecentActivity from "@/components/myWallet/home/recentActivity";
import AccountsSection from "@/components/myWallet/home/userAccountsSection";
import GroupFinanceSection from "@/components/myGroups/groupFinanceSection";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BellIcon, ChevronLeft, RotateCcw } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const TYPE = { caption: 11, label: 12, body: 14, h3: 16 };

export default function GroupWalletScreen() {
  const params = useLocalSearchParams<{ group_id: string }>();
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();

  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: walletRefetch,
  } = useUserWallet(params.group_id);

  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: accountsRefetch,
  } = useWalletAccounts(wallet?.wallet_id);

  const isRefreshing = walletLoading || accountsLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([walletRefetch(), accountsRefetch()]);
    toast("Wallet up to date", {
      position: "top-center",
      icon: <RotateCcw size={20} color={theme.success} />,
    });
  }, [walletRefetch, accountsRefetch, theme.success]);

  const rightAction = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen],
  );
  const leftAction = () => router.back();

  const s = useMemo(() => makeStyles(theme), [theme]);

  const SectionHeader = ({
    title,
    trailing,
  }: {
    title: string;
    trailing?: React.ReactNode;
  }) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {trailing}
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomGroupHeader
        groupName={wallet?.wallet_name}
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{ icon: BellIcon, action: rightAction }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Balance card */}
        <View style={{ marginHorizontal: SPACING.xl, marginTop: SPACING.md }}>
          <GroupFinanceSection
            balances={accounts?.map((acc) => acc.available_balance) ?? []}
            currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
            currency_code={accounts?.[0]?.currency_code ?? "KES"}
            walletColor={accounts?.[0]?.color_tag ?? "#406825"}
            onRefresh={handleRefresh}
            wallet_name={wallet?.wallet_name ?? "Group Wallet"}
            group_id={params.group_id}
          />
        </View>

        {/* Accounts */}
        <SectionHeader title="Accounts" />
        <AccountsSection
          accounts={accounts ?? []}
          isLoading={accountsLoading}
          error={accountsError}
        />

        {/* Recent activity */}
        <SectionHeader
          title="Recent activity"
          trailing={
            <TouchableOpacity hitSlop={8}>
              <Text style={[s.link, { color: theme.primary }]}>See all</Text>
            </TouchableOpacity>
          }
        />
        <RecentActivity
          entity_id={params.group_id}
          available_balances={
            accounts?.map((acc) => acc.available_balance) ?? []
          }
          hold_balances={accounts?.map((acc) => acc.hold_balance) ?? []}
          current_balances={accounts?.map((acc) => acc.current_balance) ?? []}
          wallet_number={wallet?.wallet_number ?? "Group Wallet"}
          wallet_name={wallet?.wallet_name ?? "Group Wallet"}
          currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
          currency_code={accounts?.[0]?.currency_code ?? "KES"}
          currency_name={accounts?.[0]?.currency_name ?? "Kenyan Shilling"}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.xxl,
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: TYPE.h3,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.3,
    },
    link: {
      fontSize: TYPE.label,
      fontWeight: "700",
    },
  });
}