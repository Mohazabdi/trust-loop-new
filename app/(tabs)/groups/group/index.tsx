import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronRight,
  Layers,
  MessageCircle,
  PiggyBank,
  Plus,
  RefreshCcw,
  Users2,
  Wallet2,
} from "lucide-react-native";

import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useGroupRealtime } from "@/hooks/useGroupRealTime";
import { useMemberData } from "@/hooks/useMemberData";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useGetGroupMemberRotationPlans } from "@/hooks/useGetGroupMemberRotationPlans";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useSavingsStorage } from "@/store/useSavingsStorage";

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
  shadeSoft: "rgba(71, 85, 105, 0.28)",
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
  purple: "#5B4B9E",
  purpleSoft: "#DCD5F0",
  navy: "#2F4F8A",
  navySoft: "#CBD7EE",
  amber: "#96632A",
  amberSoft: "#EBD8B8",
  neutral: "#4A566B",
  neutralSoft: "#CDD4E0",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = {
  caption: 11,
  label: 12,
  body: 14,
  h3: 16,
  h2: 20,
  h1: 26,
} as const;

const PLAN_COLORS = {
  rotation: ACCENT.green,
  savings: ACCENT.navy,
  tableBanking: ACCENT.purple,
} as const;

const PLAN_SOFT = {
  rotation: ACCENT.greenSoft,
  savings: ACCENT.navySoft,
  tableBanking: ACCENT.purpleSoft,
} as const;

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
          shadowRadius: drop * 1.6,
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
            shadowRadius: offset * 1.25,
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
/*  Tab config                                                        */
/* ------------------------------------------------------------------ */

type TabKey = "overview" | "plans" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "plans", label: "Plans" },
  { key: "activity", label: "Activity" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components (module scope — no remount on parent re-render)    */
/* ------------------------------------------------------------------ */

type PlanCardProps = {
  accent: string;
  accentSoft: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  subtitle: string;
  status?: string;
  onPress: () => void;
  disabled?: boolean;
};

function PlanCard({
  accent,
  accentSoft,
  icon: Icon,
  label,
  subtitle,
  status,
  onPress,
  disabled = false,
}: PlanCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} plan. ${subtitle}`}
      accessibilityState={{ disabled }}
    >
      <Clay bodyStyle={[styles.planCard, disabled && styles.planCardDisabled]}>
        <View style={[styles.planIcon, { backgroundColor: accentSoft }]}>
          <Icon size={20} color={accent} strokeWidth={2.4} />
        </View>

        <View style={styles.planBody}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planLabel} numberOfLines={1}>
              {label}
            </Text>
            {status ? (
              <View style={[styles.statusPill, { backgroundColor: accentSoft }]}>
                <Text
                  style={[styles.statusText, { color: accent }]}
                  numberOfLines={1}
                >
                  {status}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <ChevronRight size={16} color={CLAY.inkFaint} strokeWidth={2.4} />
      </Clay>
    </TouchableOpacity>
  );
}

type QuickLinkProps = {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
};

function QuickLink({ icon: Icon, label, onPress }: QuickLinkProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1 }}
    >
      <Clay bodyStyle={styles.quickTile}>
        <View style={styles.quickIconWrap}>
          <Icon size={18} color={ACCENT.navy} strokeWidth={2.4} />
        </View>
        <Text style={styles.quickLabel}>{label}</Text>
      </Clay>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function GroupHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ group_id: string }>();
  const { theme } = useGlobalStorage();

  const { data: member, refetch, isRefetching } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id,
  );
  useGroupRealtime(groupMemberDetail?.id);

  const { groups: myGroups, refetch: refetchGroups } = useGetMemberGroups();
  const { data: rotationPlans, refetch: refetchRotations } =
    useGetGroupMemberRotationPlans(groupMemberDetail?.id);

  const savingsPlans = useSavingsStorage((s) => s.plans);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const currentGroup = useMemo(
    () => myGroups?.find((g: any) => g.group_id === params.group_id),
    [myGroups, params.group_id],
  );

  const memberCount: number = currentGroup?.number_of_members ?? 0;
  const rotationCount: number = rotationPlans?.length ?? 0;
  const activeRotations = useMemo(
    () =>
      (rotationPlans ?? []).filter(
        (p: any) => p.rotation_status === "active",
      ),
    [rotationPlans],
  );

  const savingsCount: number = useMemo(
    () => savingsPlans.filter((p) => p.group_id === params.group_id).length,
    [savingsPlans, params.group_id],
  );

  const isAdmin = useMemo(() => {
    const role = groupMemberDetail?.member_role;
    return role === "admin" || role === "chairperson" || role === "treasurer";
  }, [groupMemberDetail?.member_role]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchGroups(), refetchRotations()]);
  }, [refetch, refetchGroups, refetchRotations]);

  const goTo = useCallback(
    (pathname: string, extraParams: Record<string, string | undefined> = {}) => {
      router.push({
        pathname: pathname as never,
        params: { group_id: params.group_id, ...extraParams },
      });
    },
    [router, params.group_id],
  );

  const rotationStatusLabel =
    rotationCount > 0 ? `${activeRotations.length} active` : "Not started";

  const savingsStatusLabel =
    savingsCount > 0
      ? `${savingsCount} plan${savingsCount === 1 ? "" : "s"}`
      : "Not started";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Segment tabs — rendered only on this index page, not on children */}
      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.9}
                style={styles.tabButton}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label} tab`}
              >
                <View
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
      >
        {/* --------------------------- Overview --------------------------- */}
        {activeTab === "overview" && (
          <>
            <View style={styles.identity}>
              <Text style={styles.eyebrow}>YOUR GROUP</Text>
              <Text style={styles.groupName} numberOfLines={1}>
                {groupMemberDetail?.group_name ?? "Group"}
              </Text>
              <View style={styles.metaRow}>
                <Users2 size={12} color={CLAY.inkSoft} strokeWidth={2.4} />
                <Text style={styles.metaText}>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </Text>
                {groupMemberDetail?.member_role ? (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={[styles.metaText, styles.metaRole]}>
                      {groupMemberDetail.member_role}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            <View style={styles.quickRow}>
              <QuickLink
                icon={Wallet2}
                label="Wallet"
                onPress={() => goTo("/(tabs)/groups/group/wallet")}
              />
              <QuickLink
                icon={Users2}
                label="Members"
                onPress={() =>
                  goTo("/(tabs)/groups/group/members", {
                    groupName: groupMemberDetail?.group_name,
                  })
                }
              />
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{rotationCount}</Text>
                <Text style={styles.summaryLabel}>
                  Rotation{rotationCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{savingsCount}</Text>
                <Text style={styles.summaryLabel}>Savings</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{memberCount}</Text>
                <Text style={styles.summaryLabel}>Members</Text>
              </View>
            </View>
          </>
        )}

        {/* ---------------------------- Plans ----------------------------- */}
        {activeTab === "plans" && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionTitle}>Plans</Text>
              </View>
              <Text style={styles.sectionHint}>
                Group saving and rotation structures
              </Text>
            </View>

            <View style={styles.planList}>
              <PlanCard
                accent={PLAN_COLORS.rotation}
                accentSoft={PLAN_SOFT.rotation}
                icon={RefreshCcw}
                label="Rotation"
                subtitle="Merry-go-round · ROSCA"
                status={rotationStatusLabel}
                onPress={() =>
                  goTo("/(tabs)/groups/group/plans/rotation/myRotations", {
                    group_member_id: groupMemberDetail?.id,
                    member_role: groupMemberDetail?.member_role,
                  })
                }
              />

              <PlanCard
                accent={PLAN_COLORS.savings}
                accentSoft={PLAN_SOFT.savings}
                icon={PiggyBank}
                label="Savings"
                subtitle="Target-based group savings"
                status={savingsStatusLabel}
                onPress={() =>
                  goTo("/(tabs)/groups/group/plans/savings/mySavings", {
                    group_member_id: groupMemberDetail?.id,
                    member_role: groupMemberDetail?.member_role,
                  })
                }
              />

              <PlanCard
                accent={PLAN_COLORS.tableBanking}
                accentSoft={PLAN_SOFT.tableBanking}
                icon={Layers}
                label="Table Banking"
                subtitle="Save together & borrow"
                status="Under development"
                onPress={() => {}}
                disabled
              />

              {isAdmin ? (
                <TouchableOpacity
                  onPress={() => goTo("/(tabs)/groups/group/plans/picker")}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Create a new plan"
                  style={styles.createPlanWrap}
                >
                  <Clay
                    color={ACCENT.navy}
                    radius={RADIUS.lg}
                    depth={1}
                    highlight="rgba(255,255,255,0.30)"
                    shade="rgba(15, 30, 60, 0.38)"
                    bodyStyle={styles.createPlanBody}
                  >
                    <View style={styles.createPlanIcon}>
                      <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <Text style={styles.createPlanText}>Create a new plan</Text>
                  </Clay>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}

        {/* --------------------------- Activity --------------------------- */}
        {activeTab === "activity" && (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <RefreshCcw size={26} color={ACCENT.navy} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyBody}>
                Group contributions, plan updates and member activity will
                appear here as they happen.
              </Text>
            </Clay>
          </View>
        )}
      </ScrollView>

      {/* Chat FAB — clay slab, brand colour */}
      <TouchableOpacity
        onPress={() => goTo("/(tabs)/groups/group/chat")}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Open group chat"
        style={styles.chatFab}
      >
        <Clay
          color={ACCENT.navy}
          radius={28}
          depth={1}
          highlight="rgba(255,255,255,0.32)"
          shade="rgba(15, 30, 60, 0.42)"
          bodyStyle={styles.chatFabBody}
        >
          <MessageCircle size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Clay>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },

  /* Segment tabs */
  tabBarWrap: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.lg,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.65)",
    shadowColor: CLAY.shadeSoft,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: { flex: 1 },
  tabPill: {
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: CLAY.surfaceRaised,
    shadowColor: CLAY.shade,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.inkSoft,
    letterSpacing: -0.1,
  },
  tabTextActive: {
    color: CLAY.ink,
    fontWeight: "800",
  },

  /* Identity */
  identity: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  groupName: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.7,
    marginTop: SPACING.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + 2,
    marginTop: SPACING.sm,
  },
  metaText: {
    fontSize: TYPE.label,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },
  metaRole: { color: ACCENT.navy, fontWeight: "800" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.8,
    marginHorizontal: 2,
  },

  /* Quick links */
  quickRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  quickTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  quickIconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },

  /* Overview — summary strip */
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: CLAY.surface,
    borderRadius: RADIUS.lg,
    shadowColor: CLAY.shade,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: CLAY.hairline,
  },

  /* Section header */
  sectionHeader: {
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
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  sectionHint: {
    fontSize: 12,
    color: CLAY.inkSoft,
    marginTop: 4,
    fontWeight: "500",
  },

  /* Plan cards */
  planList: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  planCardDisabled: { opacity: 0.6 },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  planBody: { flex: 1, gap: 3 },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  planLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  planSubtitle: {
    fontSize: TYPE.label,
    fontWeight: "500",
    color: CLAY.inkSoft,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    maxWidth: 140,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* Create plan — solid navy clay CTA */
  createPlanWrap: {
    marginTop: SPACING.sm,
  },
  createPlanBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  createPlanIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  createPlanText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },

  /* Activity empty state */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  emptyCard: {
    paddingVertical: SPACING.xl + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: "500",
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },

  /* Chat FAB */
  chatFab: {
    position: "absolute",
    right: SPACING.xl,
    bottom: SPACING.xl + 4,
    borderRadius: 28,
  },
  chatFabBody: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});