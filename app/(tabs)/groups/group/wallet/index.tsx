import AccountsSection from "@/components/myWallet/home/userAccountsSection";
import RecentActivity from "@/components/myWallet/home/recentActivity";
import GroupFinanceSection from "@/components/myGroups/groupFinanceSection";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useLocalSearchParams } from "expo-router";
import { AlertCircle, RotateCcw } from "lucide-react-native";
import { useCallback } from "react";
import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { toast } from "sonner-native";

/* ------------------------------------------------------------------ */
/*  Design tokens — balanced claymorphism                             */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#D9E0EC",
  surface: "#F0F4FA",
  surfaceRaised: "#F7FAFE",
  sunken: "#C8D1DF",
  highlight: "#FFFFFF",
  shade: "rgba(71, 85, 105, 0.42)",
  shadeSoft: "rgba(71, 85, 105, 0.26)",
  ink: "#1A2438",
  inkSoft: "#4A566B",
  inkFaint: "#8A94A8",
  hairline: "rgba(71, 85, 105, 0.14)",
} as const;

const ACCENT = {
  green: "#2F7A4E",
  greenSoft: "#CFE6D8",
  red: "#A64A4A",
  redSoft: "#EDCECE",
  navy: "#2F4F8A",
  navySoft: "#CBD7EE",
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Section header (module-scope)                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionMarker} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function GroupWalletScreen() {
  const params = useLocalSearchParams<{ group_id: string }>();
  const insets = useSafeAreaInsets();

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
      icon: <RotateCcw size={20} color={ACCENT.green} />,
    });
  }, [walletRefetch, accountsRefetch]);

  // TODO: wire to a dedicated activity route once it exists.
  const handleSeeAllActivity = useCallback(() => {
    // no-op until /wallet/activity is added to the router
  }, []);

  const accountBalances = accounts?.map((acc) => acc.available_balance) ?? [];
  const accountHoldBalances = accounts?.map((acc) => acc.hold_balance) ?? [];
  const accountCurrentBalances =
    accounts?.map((acc) => acc.current_balance) ?? [];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SPACING.xxl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
      >
        {/* Intro — replaces the removed custom header */}
        <View style={styles.introBlock}>
          <Text style={styles.eyebrow}>GROUP WALLET</Text>
          <Text style={styles.heading} numberOfLines={1}>
            {wallet?.wallet_name ?? "Group Wallet"}
          </Text>
          <Text style={styles.sub}>
            Balances, accounts and recent activity for this group's shared
            wallet.
          </Text>
        </View>

        {/* Wallet error surface */}
        {walletError ? (
          <View style={styles.errorWrap}>
            <View style={styles.errorCard}>
              <AlertCircle size={22} color={ACCENT.red} strokeWidth={2.4} />
              <Text style={styles.errorText}>
                {typeof walletError === "string"
                  ? walletError
                  : "Couldn't load the wallet. Pull down to retry."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Balance hero */}
        <View style={styles.heroWrap}>
          <GroupFinanceSection
            balances={accountBalances}
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
            <TouchableOpacity
              hitSlop={8}
              onPress={handleSeeAllActivity}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="See all activity"
            >
              <Text style={styles.link}>See all</Text>
            </TouchableOpacity>
          }
        />
        <RecentActivity
          entity_id={params.group_id}
          available_balances={accountBalances}
          hold_balances={accountHoldBalances}
          current_balances={accountCurrentBalances}
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

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Intro */
  introBlock: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl + 8,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.3,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sub: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: "500",
    marginTop: 6,
    maxWidth: 340,
  },

  /* Error */
  errorWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: ACCENT.redSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(166, 74, 74, 0.30)",
  },
  errorText: {
    flex: 1,
    color: ACCENT.red,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Hero */
  heroWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMarker: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  link: {
    fontSize: 12,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: -0.1,
  },
});