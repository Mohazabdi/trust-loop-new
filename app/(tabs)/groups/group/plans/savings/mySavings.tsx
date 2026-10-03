import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BellIcon,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Search,
  X,
} from "lucide-react-native";

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import {
  useSavingsStorage,
  type SavingsPlan,
} from "@/store/useSavingsStorage";

/* ------------------------------------------------------------------ */
/*  Tokens                                                            */
/* ------------------------------------------------------------------ */

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS = {
  teal: "#0D9488",
  tealDeep: "#0F766E",
  tealDark: "#115E59",
  mintSoft: "#CCFBF1",
  growth: "#16A34A",
} as const;

const STATUS_COLORS: Record<string, string> = {
  active: SAVINGS.teal,
  draft: "#6B7280",
  paused: "#D97706",
  completed: SAVINGS.growth,
};

type StatusKey = keyof typeof STATUS_COLORS;
type FilterKey = "all" | StatusKey;

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function MySavingsScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const params = useLocalSearchParams<{
    group_member_id: string;
    group_id: string;
    member_role: string;
  }>();

  /* Resolve group_member_id from 3 sources */
  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const resolvedGroupMemberId =
    params.group_member_id ||
    storedGroupMemberId ||
    groupMemberDetail?.id ||
    undefined;

  const resolvedGroupId = params.group_id;
  const resolvedMemberRole = params.member_role ?? groupMemberDetail?.member_role;

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const plans = useSavingsStorage((s) => s.plans);

  const groupPlans = useMemo(
    () => plans.filter((p) => p.group_id === resolvedGroupId),
    [plans, resolvedGroupId]
  );

  const isAdmin = resolvedMemberRole === "admin";

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const handleCreate = useCallback(() => {
    if (!resolvedGroupMemberId || !resolvedGroupId) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/create",
      params: {
        group_member_id: resolvedGroupMemberId,
        group_id: resolvedGroupId,
      },
    });
  }, [router, resolvedGroupMemberId, resolvedGroupId]);

  const handleOpenPlan = useCallback(
    (plan: SavingsPlan) => {
      router.push({
        pathname: "/(tabs)/groups/group/plans/savings/detail",
        params: {
          plan_id: plan.savings_plan_id,
          group_id: resolvedGroupId,
          group_member_id: resolvedGroupMemberId,
          member_role: resolvedMemberRole,
        },
      });
    },
    [router, resolvedGroupId, resolvedGroupMemberId, resolvedMemberRole]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  /* ── Derived ────────────────────────────────────────────────── */
  const counts = useMemo(() => {
    const total = groupPlans.length;
    const active = groupPlans.filter(
      (p) => p.savings_status === "active"
    ).length;
    const draft = groupPlans.filter(
      (p) => p.savings_status === "draft"
    ).length;
    const completed = groupPlans.filter(
      (p) => p.savings_status === "completed"
    ).length;
    return { total, active, draft, completed };
  }, [groupPlans]);

  const filtered = useMemo(() => {
    let list = groupPlans;
    if (filter !== "all") {
      list = list.filter((p) => p.savings_status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.savings_name.toLowerCase().includes(q) ||
          p.savings_description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [groupPlans, filter, search]);

  const grouped = useMemo(() => {
    const by: Record<string, SavingsPlan[]> = {};
    for (const p of filtered) {
      const key = p.savings_status ?? "draft";
      (by[key] ??= []).push(p);
    }
    return by;
  }, [filtered]);

  const sectionOrder: StatusKey[] = ["active", "draft", "paused", "completed"];

  /* ── Render ─────────────────────────────────────────────────── */
  const FilterChip = ({
    label,
    value,
    count,
  }: {
    label: string;
    value: FilterKey;
    count?: number;
  }) => {
    const selected = filter === value;
    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        activeOpacity={0.85}
        style={[
          styles.chip,
          selected && {
            backgroundColor: SAVINGS.teal,
            borderColor: SAVINGS.teal,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            selected && { color: "#fff", fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
        {count !== undefined && count > 0 ? (
          <View
            style={[
              styles.chipCount,
              selected && { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <Text
              style={[styles.chipCountText, selected && { color: "#fff" }]}
            >
              {count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const SavingsCard = ({ plan }: { plan: SavingsPlan }) => {
    const status = (plan.savings_status ?? "draft") as StatusKey;
    const statusColor = STATUS_COLORS[status];
    const contributed = plan.contributions.reduce((s, c) => s + c.amount, 0);
    const pct =
      plan.target_amount > 0
        ? Math.min(Math.round((contributed / plan.target_amount) * 100), 100)
        : 0;

    let contextLine = "";
    if (status === "draft") contextLine = "Not yet started";
    else if (status === "completed") contextLine = "Target reached";
    else
      contextLine = `${pct}% of ${plan.currency_code} ${plan.target_amount.toLocaleString()}`;

    return (
      <TouchableOpacity
        onPress={() => handleOpenPlan(plan)}
        activeOpacity={0.85}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: tone(statusColor, 0.12) },
            ]}
          >
            <PiggyBank size={11} color={statusColor} strokeWidth={2.6} />
            <Text style={[styles.typeBadgeText, { color: statusColor }]}>
              Savings
            </Text>
          </View>

          <View style={styles.statusGroup}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {plan.savings_name}
          </Text>
          <ChevronRight
            size={16}
            color={theme.textSecondary}
            style={{ opacity: 0.5 }}
          />
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: statusColor },
            ]}
          />
        </View>

        <View style={styles.cardFooterRow}>
          <Text style={styles.cardContext}>{contextLine}</Text>
          <Text style={styles.cardAmount}>
            {plan.currency_code} {contributed.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: tone(SAVINGS.teal, 0.1) },
        ]}
      >
        <PiggyBank size={26} color={SAVINGS.teal} strokeWidth={1.8} />
      </View>
      <Text style={styles.emptyTitle}>
        {search || filter !== "all"
          ? "Nothing matches your filter"
          : "No savings plans yet"}
      </Text>
      <Text style={styles.emptyBody}>
        {search || filter !== "all"
          ? "Try a different search or clear the filter."
          : isAdmin
          ? "Create your first savings plan to start building a group reserve."
          : "Your admin hasn't started a savings plan yet. Check back soon."}
      </Text>
      {isAdmin && !search && filter === "all" ? (
        <TouchableOpacity
          onPress={handleCreate}
          activeOpacity={0.85}
          style={[styles.emptyCta, { backgroundColor: SAVINGS.teal }]}
        >
          <Plus size={16} color="#fff" strokeWidth={2.4} />
          <Text style={styles.emptyCtaText}>Create savings plan</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Savings"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={SAVINGS.teal}
            colors={[SAVINGS.teal]}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>GROUP RESERVE</Text>
            <Text style={styles.title}>Savings plans</Text>
            {counts.total > 0 ? (
              <Text style={styles.subtitle}>
                {counts.total} {counts.total === 1 ? "plan" : "plans"}
                {counts.active > 0 ? ` · ${counts.active} active` : ""}
              </Text>
            ) : null}
          </View>
          {isAdmin ? (
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create savings plan"
              style={[styles.createBtn, { backgroundColor: SAVINGS.teal }]}
            >
              <Plus size={16} color="#fff" strokeWidth={2.6} />
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color={theme.textSecondary} />
          <TextInput
            inputMode="text"
            value={search}
            onChangeText={setSearch}
            placeholder="Find a savings plan"
            placeholderTextColor={theme.textSecondary}
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <X size={15} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip label="All" value="all" count={counts.total} />
          <FilterChip label="Active" value="active" count={counts.active} />
          <FilterChip label="Draft" value="draft" count={counts.draft} />
          <FilterChip
            label="Completed"
            value="completed"
            count={counts.completed}
          />
        </ScrollView>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          sectionOrder.map((statusKey) => {
            const items = grouped[statusKey];
            if (!items || items.length === 0) return null;
            return (
              <View key={statusKey} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View
                      style={[
                        styles.sectionDot,
                        { backgroundColor: STATUS_COLORS[statusKey] },
                      ]}
                    />
                    <Text style={styles.sectionTitle}>
                      {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.sectionCount}>{items.length}</Text>
                </View>
                <View style={{ gap: SPACING.sm }}>
                  {items.map((plan) => (
                    <SavingsCard key={plan.savings_plan_id} plan={plan} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: SPACING.xxl },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      gap: SPACING.md,
    },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: TYPE.h1,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 12.5,
      fontWeight: "500",
      color: theme.textSecondary,
      marginTop: 2,
    },
    createBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: SPACING.md + 2,
      paddingVertical: SPACING.sm + 2,
      borderRadius: RADIUS.md,
    },
    createBtnText: {
      fontSize: TYPE.label,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.2,
    },

    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: SPACING.xl,
      paddingHorizontal: 14,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      paddingVertical: 12,
      fontSize: 14.5,
    },

    chipsRow: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      gap: SPACING.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: SPACING.md + 2,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      backgroundColor: theme.surface ?? theme.background,
    },
    chipText: { fontSize: 12.5, fontWeight: "600", color: theme.text },
    chipCount: {
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      backgroundColor: `${theme.text}10`,
      alignItems: "center",
      justifyContent: "center",
    },
    chipCountText: {
      fontSize: 10.5,
      fontWeight: "800",
      color: theme.textSecondary,
    },

    section: { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.md,
    },
    sectionHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    sectionCount: {
      fontSize: TYPE.caption,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      gap: SPACING.sm,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
    },
    typeBadgeText: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    statusGroup: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: {
      fontSize: 10,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    cardTitle: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.3,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: `${theme.text}10`,
      overflow: "hidden",
      marginTop: SPACING.xs,
    },
    progressFill: { height: "100%", borderRadius: 3 },
    cardFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: SPACING.xs,
    },
    cardContext: {
      fontSize: 11.5,
      color: theme.textSecondary,
      fontWeight: "600",
      letterSpacing: 0.1,
      flex: 1,
    },
    cardAmount: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },

    emptyState: {
      marginTop: SPACING.xxl,
      marginHorizontal: SPACING.xl,
      padding: SPACING.xxl,
      alignItems: "center",
      gap: SPACING.sm,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm,
    },
    emptyTitle: {
      fontSize: 15.5,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      letterSpacing: -0.2,
    },
    emptyBody: {
      fontSize: 12.5,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: SPACING.md,
    },
    emptyCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    emptyCtaText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  });
}