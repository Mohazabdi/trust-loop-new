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

import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import {
  useSavingsStorage,
  type SavingsPlan,
} from "@/store/useSavingsStorage";

/* ------------------------------------------------------------------ */
/*  Design tokens — claymorphism system                               */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#E8EDF5",
  surface: "#F3F6FB",
  surfaceRaised: "#F7FAFE",
  sunken: "#DFE6F0",
  highlight: "#FFFFFF",
  shade: "rgba(148, 163, 184, 0.55)",
  shadeSoft: "rgba(148, 163, 184, 0.32)",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

/**
 * Savings-specific muted accent. Same hue as the savings sections
 * elsewhere in the app, desaturated to sit comfortably on the clay
 * canvas instead of glowing off it.
 */
const SAVINGS = {
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
  tealInk: "#2E5C58",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const STATUS_COLORS: Record<string, string> = {
  active: SAVINGS.teal,
  draft: SAVINGS.neutral,
  paused: SAVINGS.amber,
  completed: SAVINGS.growth,
};

const STATUS_SOFT: Record<string, string> = {
  active: SAVINGS.tealSoft,
  draft: SAVINGS.neutralSoft,
  paused: SAVINGS.amberSoft,
  completed: SAVINGS.growthSoft,
};

type StatusKey = keyof typeof STATUS_COLORS;
type FilterKey = "all" | StatusKey;

/* ------------------------------------------------------------------ */
/*  Clay primitive                                                    */
/* ------------------------------------------------------------------ */

function Clay({
  children,
  color = CLAY.surface,
  radius = RADIUS.lg,
  highlight = CLAY.highlight,
  shade = CLAY.shade,
  depth = 1,
  style,
  bodyStyle,
}: {
  children: React.ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: any;
  bodyStyle?: any;
}) {
  const offset = 4 + depth * 2;
  const drop = offset + 2;

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          shadowColor: shade,
          shadowOffset: { width: drop, height: drop },
          shadowOpacity: 1,
          shadowRadius: drop * 1.9,
          elevation: 3 + depth * 3,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            backgroundColor: color,
            borderRadius: radius,
            shadowColor: highlight,
            shadowOffset: { width: -offset, height: -offset },
            shadowOpacity: 1,
            shadowRadius: offset * 1.5,
          },
          bodyStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function MySavingsScreen() {
  const router = useRouter();
  const { setIsNotificationOpen } = useGlobalStorage();
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
  const resolvedMemberRole =
    params.member_role ?? groupMemberDetail?.member_role;

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
      <TouchableOpacity onPress={() => setFilter(value)} activeOpacity={0.9}>
        <Clay
          radius={RADIUS.xl}
          depth={0}
          color={selected ? SAVINGS.teal : CLAY.surface}
          highlight={
            selected ? "rgba(255,255,255,0.30)" : CLAY.highlight
          }
          shade={selected ? "rgba(30, 70, 66, 0.32)" : CLAY.shadeSoft}
          bodyStyle={styles.chip}
        >
          <Text
            style={[styles.chipText, selected && styles.chipTextSelected]}
          >
            {label}
          </Text>
          {count !== undefined && count > 0 ? (
            <View
              style={[
                styles.chipCount,
                selected && styles.chipCountSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipCountText,
                  selected && styles.chipCountTextSelected,
                ]}
              >
                {count}
              </Text>
            </View>
          ) : null}
        </Clay>
      </TouchableOpacity>
    );
  };

  const SavingsCard = ({ plan }: { plan: SavingsPlan }) => {
    const status = (plan.savings_status ?? "draft") as StatusKey;
    const statusColor = STATUS_COLORS[status];
    const statusSoft = STATUS_SOFT[status];
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
        activeOpacity={0.9}
      >
        <Clay bodyStyle={styles.card}>
          <View style={styles.cardTopRow}>
            <View
              style={[styles.typeBadge, { backgroundColor: statusSoft }]}
            >
              <PiggyBank size={11} color={statusColor} strokeWidth={2.6} />
              <Text style={[styles.typeBadgeText, { color: statusColor }]}>
                Savings
              </Text>
            </View>

            <View style={styles.statusGroup}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>

          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {plan.savings_name}
            </Text>
            <ChevronRight
              size={16}
              color={CLAY.inkFaint}
              strokeWidth={2.4}
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
            <Text style={styles.cardContext} numberOfLines={1}>
              {contextLine}
            </Text>
            <Text style={styles.cardAmount}>
              {plan.currency_code} {contributed.toLocaleString()}
            </Text>
          </View>
        </Clay>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Clay bodyStyle={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <PiggyBank size={26} color={SAVINGS.teal} strokeWidth={2.2} />
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
            activeOpacity={0.9}
            style={{ marginTop: SPACING.md }}
          >
            <Clay
              color={SAVINGS.teal}
              radius={RADIUS.md}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(30, 70, 66, 0.42)"
              bodyStyle={styles.emptyCta}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.emptyCtaText}>Create savings plan</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}
      </Clay>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
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
        {/* ── Floating back row ─────────────────────────── */}
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
              <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Header block with floating bell ───────────── */}
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

          <TouchableOpacity
            onPress={handleNotifications}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bellWrap}
          >
            <Clay radius={18} depth={1} bodyStyle={styles.bellBody}>
              <BellIcon size={20} color={CLAY.ink} strokeWidth={2.4} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Admin create action ───────────────────────── */}
        {isAdmin ? (
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Create savings plan"
            style={styles.createWrap}
          >
            <Clay
              color={SAVINGS.teal}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(30, 70, 66, 0.42)"
              bodyStyle={styles.createBtn}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.createBtnText}>Create savings plan</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── Search ────────────────────────────────────── */}
        <Clay
          radius={RADIUS.md}
          depth={0}
          shade={CLAY.shadeSoft}
          style={styles.searchShell}
          bodyStyle={styles.searchWrap}
        >
          <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
          <TextInput
            inputMode="text"
            value={search}
            onChangeText={setSearch}
            placeholder="Find a savings plan"
            placeholderTextColor={CLAY.inkFaint}
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <X size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : null}
        </Clay>

        {/* ── Filter chips ──────────────────────────────── */}
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

        {/* ── Sections ──────────────────────────────────── */}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Floating back row */
  backRow: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Header block with floating bell */
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
    marginTop: 2,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Admin create action */
  createWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Search — recessed well */
  searchShell: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
    borderRadius: RADIUS.md,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },

  /* Filter chips */
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
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.xl,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountSelected: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  chipCountText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
  },
  chipCountTextSelected: {
    color: "#FFFFFF",
  },

  /* Sections */
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
    color: CLAY.inkSoft,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
  },

  /* Savings card */
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
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
    paddingVertical: 4,
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
    color: CLAY.inkFaint,
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
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY.sunken,
    overflow: "hidden",
    marginTop: SPACING.xs,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  cardContext: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
    letterSpacing: 0.1,
    flex: 1,
  },
  cardAmount: {
    fontSize: 12,
    color: CLAY.ink,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  /* Empty */
  emptyWrap: {
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: SAVINGS.tealSoft,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: CLAY.ink,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
    fontWeight: "500",
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});