import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
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
  Plus,
  RefreshCcw,
  Search,
  X,
} from "lucide-react-native";

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGetGroupMemberRotationPlans } from "@/hooks/useGetGroupMemberRotationPlans";
import { useGetRotationProgress } from "@/hooks/useGetRotationProgress";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";

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
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

const ACCENT = {
  green: "#3E9B62",
  greenSoft: "#DBEFE1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
  purple: "#7A6AC0",
  purpleSoft: "#E6E2F7",
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

/** Status colours, muted to sit on the clay canvas. */
const STATUS_COLORS = {
  active: ACCENT.green,
  dormant: ACCENT.neutral,
  paused: ACCENT.amber,
  complete: ACCENT.navy,
} as const;

const STATUS_SOFT: Record<keyof typeof STATUS_COLORS, string> = {
  active: ACCENT.greenSoft,
  dormant: ACCENT.neutralSoft,
  paused: ACCENT.amberSoft,
  complete: ACCENT.navySoft,
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
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
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

export default function MyRotationsScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const params = useLocalSearchParams<{
    group_member_id: string;
    group_id: string;
    member_role: string;
  }>();

  /* ── Resolve group_member_id from 3 sources, in order ────────── */
  /* Using `||` (not `??`) so empty strings fall through.          */
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

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: rotations,
    refetch,
    isRefetching,
  } = useGetGroupMemberRotationPlans(resolvedGroupMemberId);

  const isAdmin = params.member_role === "admin";

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const handleCreate = useCallback(() => {
    if (!resolvedGroupMemberId || !resolvedGroupId) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/rotation/create",
      params: {
        group_member_id: resolvedGroupMemberId,
        group_id: resolvedGroupId,
      },
    });
  }, [router, resolvedGroupMemberId, resolvedGroupId]);

  const handleOpenRotation = useCallback(
    (rotation: any) => {
      if (!resolvedGroupMemberId) return;
      router.push({
        pathname: "/(tabs)/groups/group/plans/rotation",
        params: {
          plan_id: rotation.rotation_plan_id,
          group_member_id: resolvedGroupMemberId,
        },
      });
    },
    [router, resolvedGroupMemberId]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  /* ── Derived data ───────────────────────────────────────────── */
  const allRotations = rotations ?? [];

  const counts = useMemo(
    () => ({
      total: allRotations.length,
      active: allRotations.filter((r: any) => r.rotation_status === "active")
        .length,
      dormant: allRotations.filter((r: any) => r.rotation_status === "dormant")
        .length,
      complete: allRotations.filter(
        (r: any) => r.rotation_status === "complete"
      ).length,
    }),
    [allRotations]
  );

  const filteredRotations = useMemo(() => {
    let list = allRotations;
    if (filter !== "all") {
      list = list.filter((r: any) => r.rotation_status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.rotation_name?.toLowerCase().includes(q) ||
          r.rotation_description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRotations, filter, search]);

  const grouped = useMemo(() => {
    const byStatus: Record<string, any[]> = {};
    for (const r of filteredRotations) {
      const key = r.rotation_status ?? "dormant";
      (byStatus[key] ??= []).push(r);
    }
    return byStatus;
  }, [filteredRotations]);

  const sectionOrder: StatusKey[] = ["active", "dormant", "paused", "complete"];

  /* ── Render helpers ─────────────────────────────────────────── */
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
        activeOpacity={0.9}
      >
        <Clay
          radius={RADIUS.xl}
          depth={0}
          color={selected ? theme.primary : CLAY.surface}
          highlight={
            selected ? "rgba(255,255,255,0.34)" : CLAY.highlight
          }
          shade={
            selected ? "rgba(12, 45, 22, 0.32)" : CLAY.shade
          }
          bodyStyle={[
            styles.chip,
            selected && styles.chipSelected,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              selected && styles.chipTextSelected,
            ]}
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

  const RotationCard = ({ rotation }: { rotation: any }) => {
    const status = (rotation.rotation_status ?? "dormant") as StatusKey;
    const statusColor = STATUS_COLORS[status];
    const statusSoft = STATUS_SOFT[status];
    const { data: progress } = useGetRotationProgress(rotation.rotation_plan_id);
    const pct = Math.round(progress?.progress_percentage ?? 0);

    /* Context line — one sentence that tells the user what's happening */
    let contextLine = "";
    if (status === "dormant") {
      contextLine = "Waiting for members to join";
    } else if (status === "complete") {
      contextLine = "Cycle finished";
    } else {
      contextLine = `${pct}% complete`;
    }

    return (
      <TouchableOpacity
        onPress={() => handleOpenRotation(rotation)}
        activeOpacity={0.9}
      >
        <Clay bodyStyle={styles.card}>
          {/* Top row: type badge + status */}
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: statusSoft },
              ]}
            >
              <RefreshCcw size={11} color={statusColor} strokeWidth={2.6} />
              <Text style={[styles.typeBadgeText, { color: statusColor }]}>
                Rotation
              </Text>
            </View>

            <View style={styles.statusGroup}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>

          {/* Name row with chevron */}
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {rotation.rotation_name ?? "Untitled rotation"}
            </Text>
            <ChevronRight
              size={16}
              color={CLAY.inkFaint}
              strokeWidth={2.4}
            />
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(Math.max(pct, 0), 100)}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>

          {/* Progress label */}
          <View style={styles.cardFooterRow}>
            <Text style={styles.cardContext}>{contextLine}</Text>
            {rotation.amount_collectable ? (
              <Text style={styles.cardAmount}>
                {rotation.currency_code ?? "KES"} {rotation.amount_collectable}
              </Text>
            ) : null}
          </View>
        </Clay>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Clay bodyStyle={styles.emptyCard}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: ACCENT.navySoft },
          ]}
        >
          <RefreshCcw size={26} color={ACCENT.navy} strokeWidth={1.8} />
        </View>
        <Text style={styles.emptyTitle}>
          {search || filter !== "all"
            ? "Nothing matches your filter"
            : "No rotations yet"}
        </Text>
        <Text style={styles.emptyBody}>
          {search || filter !== "all"
            ? "Try a different search or clear the filter."
            : isAdmin
            ? "Create your first rotation to start a merry-go-round with your group."
            : "Your admin hasn't started a rotation yet. Check back soon."}
        </Text>
        {isAdmin && !search && filter === "all" ? (
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.9}
            style={{ marginTop: SPACING.md }}
          >
            <Clay
              color={theme.primary}
              radius={RADIUS.md}
              depth={1}
              highlight="rgba(255,255,255,0.34)"
              shade="rgba(12, 45, 22, 0.42)"
              bodyStyle={styles.emptyCta}
            >
              <Plus size={16} color="#fff" strokeWidth={2.6} />
              <Text style={styles.emptyCtaText}>Create rotation</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}
      </Clay>
    </View>
  );

  const isLoading = !rotations && !isRefetching;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Rotations"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>MERRY-GO-ROUND</Text>
            <Text style={styles.title}>Your rotations</Text>
            {counts.total > 0 ? (
              <Text style={styles.subtitle}>
                {counts.total} {counts.total === 1 ? "rotation" : "rotations"}
                {counts.active > 0 ? ` · ${counts.active} active` : ""}
              </Text>
            ) : null}
          </View>
          {isAdmin ? (
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Create rotation plan"
            >
              <Clay
                color={theme.primary}
                radius={RADIUS.md}
                depth={1}
                highlight="rgba(255,255,255,0.34)"
                shade="rgba(12, 45, 22, 0.42)"
                bodyStyle={styles.createBtn}
              >
                <Plus size={16} color="#fff" strokeWidth={2.6} />
                <Text style={styles.createBtnText}>Create</Text>
              </Clay>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
          <TextInput
            inputMode="text"
            value={search}
            onChangeText={setSearch}
            placeholder="Find a rotation"
            placeholderTextColor={CLAY.inkFaint}
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <X size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
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
          <FilterChip label="Dormant" value="dormant" count={counts.dormant} />
          <FilterChip
            label="Complete"
            value="complete"
            count={counts.complete}
          />
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : filteredRotations.length === 0 ? (
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
                  {items.map((rotation) => (
                    <RotationCard
                      key={rotation.rotation_plan_id}
                      rotation={rotation}
                    />
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

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
    color: CLAY.inkSoft,
    marginTop: 2,
  },

  /* Create button (clay shell around content) */
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  createBtnText: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },

  /* Search — recessed well */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: SPACING.xl,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
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
  chipSelected: {},
  chipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  chipTextSelected: {
    color: "#fff",
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
    color: "#fff",
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

  /* Rotation card */
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
    fontWeight: "700",
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
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  cardContext: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  cardAmount: {
    fontSize: 12,
    color: CLAY.ink,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  /* Loading / empty */
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
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
    color: "#fff",
  },
});