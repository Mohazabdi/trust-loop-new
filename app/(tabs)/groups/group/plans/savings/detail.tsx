import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
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
  ArrowDownCircle,
  ArrowUpCircle,
  BellIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Repeat,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { toast } from "sonner-native";

import CircularProgress from "@/components/myGroups/PieProgress";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useMemberData } from "@/hooks/useMemberData";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import {
  useSavingsStorage,
  type SavingsFrequency,
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
  tealTint: "#EBF5F4",
  tealInk: "#2E5C58",
  mint: "#A7E3DE",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  withdrawal: "#CF6B6B",
  withdrawalSoft: "#FAE3E3",
  warning: "#C08A3E",
  warningSoft: "#F7EAD8",
  warningInk: "#7A5416",
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const STATUS_COLORS: Record<string, string> = {
  active: SAVINGS.teal,
  draft: SAVINGS.neutral,
  paused: SAVINGS.warning,
  completed: SAVINGS.growth,
};

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatDateShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const initialsOf = (first?: string, last?: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase() || "?"}`;

function projectCompletion(
  remaining: number,
  perCycle: number,
  frequency: SavingsFrequency,
  from: Date = new Date()
): Date {
  const cycles = Math.max(1, Math.ceil(remaining / perCycle));
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + cycles);
  else if (frequency === "weekly") d.setDate(d.getDate() + cycles * 7);
  else d.setMonth(d.getMonth() + cycles);
  return d;
}

const MILESTONES = [25, 50, 75, 100] as const;

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

export default function SavingsDetailScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

  const plan = useSavingsStorage((s) =>
    s.plans.find((p) => p.savings_plan_id === params.plan_id)
  );
  const updatePlan = useSavingsStorage((s) => s.updatePlan);
  const recordContribution = useSavingsStorage((s) => s.recordContribution);
  const reconcileCreator = useSavingsStorage((s) => s.reconcileCreator);

  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeError, setContributeError] = useState("");

  /* ── Determine permission level ─────────────────────────────── */
  const isAdmin = useMemo(() => {
    if (!plan) return false;
    const role = params.member_role ?? groupMemberDetail?.member_role;
    const isCreator = plan.created_by_id === params.group_member_id;
    return role === "admin" || isCreator;
  }, [
    plan?.created_by_id,
    params.member_role,
    params.group_member_id,
    groupMemberDetail?.member_role,
  ]);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  /* ── Self-heal: ensure creator is listed as a member ───────── */
  useEffect(() => {
    if (
      plan &&
      params.group_member_id &&
      plan.created_by_id === params.group_member_id &&
      !plan.members.some((m) => m.group_member_id === params.group_member_id)
    ) {
      reconcileCreator(plan.savings_plan_id, {
        group_member_id: params.group_member_id,
        first_name:
          groupMemberDetail?.first_name ?? member?.first_name ?? "You",
        last_name: groupMemberDetail?.last_name ?? member?.last_name ?? "",
      });
    }
  }, [
    plan?.savings_plan_id,
    params.group_member_id,
    groupMemberDetail?.first_name,
    groupMemberDetail?.last_name,
    member?.first_name,
    member?.last_name,
    reconcileCreator,
  ]);

  /* ── Derived ────────────────────────────────────────────────── */

  /* Full ledger with direction — kept as a single source of truth */
  const ledger = useMemo(
    () =>
      (plan?.contributions ?? []).map((c) => ({
        ...c,
        direction: c.amount >= 0 ? ("in" as const) : ("out" as const),
        absAmount: Math.abs(c.amount),
      })),
    [plan?.contributions]
  );

  /* Gross money in (only positive contributions) */
  const grossContributed = useMemo(
    () =>
      ledger
        .filter((c) => c.direction === "in")
        .reduce((sum, c) => sum + c.absAmount, 0),
    [ledger]
  );

  /* Total withdrawn (absolute of negative contributions) */
  const totalWithdrawn = useMemo(
    () =>
      ledger
        .filter((c) => c.direction === "out")
        .reduce((sum, c) => sum + c.absAmount, 0),
    [ledger]
  );

  /* Net balance = what's actually in the reserve right now */
  const netBalance = grossContributed - totalWithdrawn;

  const target = plan?.target_amount ?? 0;
  const pct =
    target > 0 ? Math.min(Math.round((netBalance / target) * 100), 100) : 0;
  const remaining = Math.max(target - netBalance, 0);

  const status = plan?.savings_status ?? "draft";
  const statusColor = STATUS_COLORS[status] ?? SAVINGS.teal;

  const nextMilestone = useMemo(
    () => MILESTONES.find((m) => m > pct) ?? null,
    [pct]
  );

  const projectedDate = useMemo(() => {
    if (!plan || remaining === 0) return null;
    return projectCompletion(
      remaining,
      plan.amount_per_contribution,
      plan.frequency
    );
  }, [plan, remaining]);

  const activeMembers = useMemo(
    () => (plan?.members ?? []).filter((m) => m.status === "active").length,
    [plan?.members]
  );

  const pendingMembers = useMemo(
    () => (plan?.members ?? []).filter((m) => m.status === "invited").length,
    [plan?.members]
  );

  /* ── Withdrawal request info ────────────────────────────────── */
  const pendingRequests = useMemo(
    () =>
      (plan?.withdrawal_requests ?? []).filter((w) => w.status === "pending"),
    [plan?.withdrawal_requests]
  );

  const pendingRequestCount = pendingRequests.length;

  const pendingAmountTotal = useMemo(
    () => pendingRequests.reduce((sum, w) => sum + w.amount, 0),
    [pendingRequests]
  );

  /* Latest pending request — shown in the banner */
  const latestPendingRequest = useMemo(
    () =>
      [...pendingRequests].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null,
    [pendingRequests]
  );

  /* Whether the current user still has to act on any pending request */
  const myPendingApproval = useMemo(() => {
    const myId = params.group_member_id;
    if (!myId) return null;
    return (
      pendingRequests.find(
        (w) =>
          w.requested_by_id !== myId &&
          !w.approvals.some((a) => a.group_member_id === myId)
      ) ?? null
    );
  }, [pendingRequests, params.group_member_id]);

  const quorum = plan?.approval_quorum ?? 3;

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleOpenContribute = () => {
    setContributeAmount(plan ? String(plan.amount_per_contribution) : "");
    setContributeError("");
    setContributeOpen(true);
  };

  const handleRecordContribution = () => {
    const amount = Number(contributeAmount);
    if (!contributeAmount.trim() || isNaN(amount) || amount <= 0) {
      setContributeError("Please enter a valid amount.");
      return;
    }
    if (!plan) return;

    const self = plan.members.find(
      (m) => m.group_member_id === params.group_member_id
    );
    const memberName = self
      ? `${self.first_name} ${self.last_name}`.trim()
      : "You";

    recordContribution(plan.savings_plan_id, {
      group_member_id: params.group_member_id ?? "",
      member_name: memberName,
      amount,
      cycle_number: plan.contributions.length + 1,
    });

    if (plan.savings_status === "draft") {
      updatePlan(plan.savings_plan_id, { savings_status: "active" });
    }
    if (netBalance + amount >= plan.target_amount) {
      updatePlan(plan.savings_plan_id, { savings_status: "completed" });
      toast.success("Target reached — well done!");
    } else {
      toast.success("Contribution recorded");
    }

    setContributeOpen(false);
  };

  /* Navigate to the withdrawal request screen */
  const handleRequestWithdrawal = () => {
    if (!plan) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/withdraw",
      params: {
        plan_id: plan.savings_plan_id,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  const handleOpenWithdrawals = () => {
    if (!plan) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/withdrawals",
      params: {
        plan_id: plan.savings_plan_id,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  const handleOpenRequestDetail = (withdrawalId: string) => {
    if (!plan) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/withdrawalDetail",
      params: {
        plan_id: plan.savings_plan_id,
        withdrawal_id: withdrawalId,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  const handleOpenSettings = () => {
    if (!plan) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/settings",
      params: {
        plan_id: plan.savings_plan_id,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  const handleOpenMembers = () => {
    if (!plan) return;
    router.push({
      pathname: "/(tabs)/groups/group/plans/savings/members",
      params: {
        plan_id: plan.savings_plan_id,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  /* ── Missing plan ───────────────────────────────────────────── */
  if (!plan) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
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
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <Text style={styles.missingTitle}>Savings plan not found</Text>
            <Text style={styles.missingBody}>
              This plan is no longer available, or you don't have access to it.
            </Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* ── Title block with floating bell ────────────── */}
        <View style={styles.titleBlock}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>SAVINGS PLAN</Text>
            <Text style={styles.screenTitle} numberOfLines={2}>
              {plan.savings_name}
            </Text>
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

        {/* ── Hero ──────────────────────────────────────── */}
        <Clay
          color={SAVINGS.teal}
          radius={RADIUS.xl}
          depth={2}
          highlight="rgba(255,255,255,0.30)"
          shade="rgba(30, 70, 66, 0.42)"
          style={styles.heroWrap}
          bodyStyle={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroStatus}>
              <View
                style={[styles.heroStatusDot, { backgroundColor: "#FFFFFF" }]}
              />
              <Text style={styles.heroStatusText}>{status}</Text>
            </View>

            <View style={styles.heroTopActions}>
              {isAdmin ? (
                <View style={styles.adminTag}>
                  <Text style={styles.adminTagText}>ADMIN</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={handleOpenSettings}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Plan settings"
                style={styles.heroSettingsBtn}
              >
                <Settings2 size={16} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroRing}>
              <CircularProgress
                percentage={pct}
                size={104}
                strokeWidth={9}
                color={SAVINGS.mint}
                backgroundColor="rgba(255,255,255,0.18)"
              />
            </View>

            <View style={styles.heroDetails}>
              <Text style={styles.heroEyebrow}>Net balance</Text>
              <Text style={styles.heroAmount} numberOfLines={1}>
                {plan.currency_code} {formatMoney(netBalance)}
              </Text>
              <Text style={styles.heroTarget}>
                of {plan.currency_code} {formatMoney(target)} target
              </Text>
            </View>
          </View>

          <View style={styles.heroProgressWrap}>
            <View style={styles.heroProgressTrack}>
              <View
                style={[styles.heroProgressFill, { width: `${pct}%` }]}
              />
            </View>
            <View style={styles.heroMilestoneRow}>
              {MILESTONES.map((m) => (
                <View key={m} style={styles.heroMilestoneItem}>
                  <View
                    style={[
                      styles.heroMilestoneDot,
                      pct >= m && styles.heroMilestoneDotReached,
                    ]}
                  />
                  <Text
                    style={[
                      styles.heroMilestoneLabel,
                      pct >= m && { color: "#FFFFFF", fontWeight: "800" },
                    ]}
                  >
                    {m}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>
              {status === "completed"
                ? "Target reached"
                : nextMilestone
                ? `Next milestone: ${nextMilestone}%`
                : "Keep going"}
            </Text>
            {projectedDate && status !== "completed" ? (
              <Text style={styles.heroFooterText}>
                Est. {formatDateShort(projectedDate)}
              </Text>
            ) : null}
          </View>
        </Clay>

        {/* ── Primary CTA ───────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleOpenContribute}
            activeOpacity={0.9}
          >
            <Clay
              color={SAVINGS.teal}
              radius={RADIUS.lg}
              depth={2}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(30, 70, 66, 0.42)"
              bodyStyle={styles.primaryBtn}
            >
              <ArrowUpCircle size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.primaryBtnText}>
                Contribute {plan.currency_code}{" "}
                {formatMoney(plan.amount_per_contribution)}
              </Text>
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Pending approvals banner ──────────────────── */}
        {pendingRequestCount > 0 ? (
          <TouchableOpacity
            onPress={
              myPendingApproval
                ? () => handleOpenRequestDetail(myPendingApproval.withdrawal_id)
                : handleOpenWithdrawals
            }
            activeOpacity={0.9}
            style={styles.bannerWrap}
          >
            <Clay
              color={SAVINGS.warningSoft}
              radius={RADIUS.lg}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.pendingBanner}
            >
              <View style={styles.pendingBannerIcon}>
                <Clock size={15} color={SAVINGS.warning} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pendingBannerTitle}>
                  {myPendingApproval
                    ? "Your approval is needed"
                    : `${pendingRequestCount} withdrawal request${
                        pendingRequestCount === 1 ? "" : "s"
                      } awaiting approval`}
                </Text>
                <Text style={styles.pendingBannerMeta} numberOfLines={1}>
                  {plan.currency_code} {formatMoney(pendingAmountTotal)} ·{" "}
                  {latestPendingRequest?.requested_by_name ?? ""}
                </Text>
              </View>
              <ChevronRight
                size={15}
                color={SAVINGS.warning}
                strokeWidth={2.6}
              />
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── Admin quick actions ───────────────────────── */}
        {isAdmin ? (
          <View style={styles.adminQuickRow}>
            <TouchableOpacity
              onPress={handleOpenMembers}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <Clay bodyStyle={styles.adminQuickCard}>
                <View
                  style={[
                    styles.adminQuickIcon,
                    { backgroundColor: SAVINGS.tealSoft },
                  ]}
                >
                  <Users size={16} color={SAVINGS.teal} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.adminQuickTitle}>Members</Text>
                  <Text style={styles.adminQuickMeta}>
                    {activeMembers} active
                    {pendingMembers > 0 ? ` · ${pendingMembers} pending` : ""}
                  </Text>
                </View>
                <ChevronRight
                  size={14}
                  color={CLAY.inkFaint}
                  strokeWidth={2.4}
                />
              </Clay>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRequestWithdrawal}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <Clay bodyStyle={styles.adminQuickCard}>
                <View
                  style={[
                    styles.adminQuickIcon,
                    { backgroundColor: SAVINGS.withdrawalSoft },
                  ]}
                >
                  <ArrowDownCircle
                    size={16}
                    color={SAVINGS.withdrawal}
                    strokeWidth={2.4}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.adminQuickTitle}>Request withdrawal</Text>
                  <Text style={styles.adminQuickMeta}>
                    Needs {quorum} approvals
                  </Text>
                </View>
                <ChevronRight
                  size={14}
                  color={CLAY.inkFaint}
                  strokeWidth={2.4}
                />
              </Clay>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Quorum note ───────────────────────────────── */}
        <View style={styles.quorumWrap}>
          <Clay
            color={SAVINGS.tealTint}
            radius={RADIUS.md}
            depth={0}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.quorumNote}
          >
            <ShieldCheck
              size={13}
              color={SAVINGS.tealInk}
              strokeWidth={2.4}
            />
            <Text style={styles.quorumNoteText}>
              Withdrawals need {quorum} member approval
              {quorum === 1 ? "" : "s"} before funds are released
            </Text>
          </Clay>
        </View>

        {/* ── Stats row ─────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBlock
            icon={TrendingUp}
            label="Contributed"
            value={`${formatMoney(grossContributed)}`}
            accent={SAVINGS.growth}
          />
          <StatBlock
            icon={ArrowDownCircle}
            label="Withdrawn"
            value={`${formatMoney(totalWithdrawn)}`}
            accent={totalWithdrawn > 0 ? SAVINGS.withdrawal : undefined}
          />
          <StatBlock
            icon={Repeat}
            label="Frequency"
            value={plan.frequency}
            capitalize
          />
        </View>

        {/* ── Members ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>Members</Text>
            <View
              style={[
                styles.sectionCountPill,
                { backgroundColor: SAVINGS.tealSoft },
              ]}
            >
              <Text
                style={[styles.sectionCountText, { color: SAVINGS.tealInk }]}
              >
                {plan.members.length}
              </Text>
            </View>
          </View>

          {isAdmin ? (
            <TouchableOpacity
              onPress={handleOpenMembers}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Manage members"
              style={styles.manageLink}
            >
              <Text style={styles.manageLinkText}>Manage</Text>
              <ChevronRight
                size={13}
                color={SAVINGS.teal}
                strokeWidth={2.8}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {plan.members.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                No members yet.
                {isAdmin ? " Tap Manage to invite group members." : ""}
              </Text>
            </Clay>
          </View>
        ) : (
          <Clay style={styles.listWrap} bodyStyle={styles.membersList}>
            {plan.members.map((m, i) => {
              const isLast = i === plan.members.length - 1;
              const isCreator = m.group_member_id === plan.created_by_id;
              const isInvited = m.status === "invited";
              return (
                <View
                  key={m.id}
                  style={[styles.memberRow, !isLast && styles.rowDivider]}
                >
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: SAVINGS.tealSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberAvatarText,
                        { color: SAVINGS.teal },
                      ]}
                    >
                      {initialsOf(m.first_name, m.last_name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.first_name} {m.last_name}
                      </Text>
                      {isCreator ? (
                        <View style={styles.creatorPill}>
                          <Text style={styles.creatorPillText}>Creator</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.memberRole}>
                      {isInvited
                        ? "Invite pending"
                        : m.status === "active"
                        ? "Active"
                        : m.status}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.memberStatusPill,
                      {
                        backgroundColor: isInvited
                          ? SAVINGS.warningSoft
                          : SAVINGS.growthSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberStatusText,
                        {
                          color: isInvited
                            ? SAVINGS.warning
                            : SAVINGS.growth,
                        },
                      ]}
                    >
                      {m.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Clay>
        )}

        {/* ── Fund activity ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>Fund activity</Text>
            <View
              style={[
                styles.sectionCountPill,
                { backgroundColor: SAVINGS.tealSoft },
              ]}
            >
              <Text
                style={[styles.sectionCountText, { color: SAVINGS.tealInk }]}
              >
                {ledger.length}
              </Text>
            </View>
          </View>

          {pendingRequestCount + (plan.withdrawal_requests?.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={handleOpenWithdrawals}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View withdrawal requests"
              style={styles.manageLink}
            >
              <Text style={styles.manageLinkText}>
                {pendingRequestCount > 0
                  ? `Requests · ${pendingRequestCount}`
                  : "Requests"}
              </Text>
              <ChevronRight
                size={13}
                color={SAVINGS.teal}
                strokeWidth={2.8}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Money-in / money-out summary */}
        <View style={styles.flowSummaryWrap}>
          <Clay bodyStyle={styles.flowSummary}>
            <View style={styles.flowSummaryItem}>
              <View
                style={[
                  styles.flowSummaryIcon,
                  { backgroundColor: SAVINGS.growthSoft },
                ]}
              >
                <ArrowUpCircle
                  size={14}
                  color={SAVINGS.growth}
                  strokeWidth={2.4}
                />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.flowSummaryLabel}>Total in</Text>
                <Text style={styles.flowSummaryValue}>
                  {plan.currency_code} {formatMoney(grossContributed)}
                </Text>
              </View>
            </View>

            <View style={styles.flowSummaryDivider} />

            <View style={styles.flowSummaryItem}>
              <View
                style={[
                  styles.flowSummaryIcon,
                  { backgroundColor: SAVINGS.withdrawalSoft },
                ]}
              >
                <ArrowDownCircle
                  size={14}
                  color={SAVINGS.withdrawal}
                  strokeWidth={2.4}
                />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.flowSummaryLabel}>Total out</Text>
                <Text style={styles.flowSummaryValue}>
                  {plan.currency_code} {formatMoney(totalWithdrawn)}
                </Text>
              </View>
            </View>
          </Clay>
        </View>

        {/* Activity ledger */}
        {ledger.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                No money movement yet. Tap Contribute to record the first
                deposit.
              </Text>
            </Clay>
          </View>
        ) : (
          <Clay style={styles.listWrap} bodyStyle={styles.activityList}>
            {[...ledger].reverse().map((c, i, arr) => {
              const isLast = i === arr.length - 1;
              const isIn = c.direction === "in";
              return (
                <View
                  key={c.id}
                  style={[styles.activityRow, !isLast && styles.rowDivider]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: isIn
                          ? SAVINGS.growthSoft
                          : SAVINGS.withdrawalSoft,
                      },
                    ]}
                  >
                    {isIn ? (
                      <ArrowUpCircle
                        size={15}
                        color={SAVINGS.growth}
                        strokeWidth={2.4}
                      />
                    ) : (
                      <ArrowDownCircle
                        size={15}
                        color={SAVINGS.withdrawal}
                        strokeWidth={2.4}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {c.member_name}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {isIn ? "Contribution" : "Withdrawal"} ·{" "}
                      {formatRelative(c.contributed_at)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.activityAmount,
                      {
                        color: isIn
                          ? SAVINGS.growth
                          : SAVINGS.withdrawal,
                      },
                    ]}
                  >
                    {isIn ? "+" : "−"}
                    {plan.currency_code} {formatMoney(c.absAmount)}
                  </Text>
                </View>
              );
            })}
          </Clay>
        )}

        {/* Description */}
        {plan.savings_description ? (
          <View style={styles.descriptionWrap}>
            <Clay
              color={SAVINGS.tealTint}
              radius={RADIUS.lg}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.descriptionCard}
            >
              <Text style={styles.descriptionLabel}>ABOUT THIS PLAN</Text>
              <Text style={styles.descriptionText}>
                {plan.savings_description}
              </Text>
            </Clay>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Contribute modal ────────────────────────────── */}
      <Modal
        visible={contributeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setContributeOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setContributeOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: SAVINGS.teal },
              ]}
            />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.modalEyebrow}>CONTRIBUTE</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {plan.savings_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setContributeOpen(false)}
                hitSlop={10}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelper}>
              Recording a contribution moves money from your wallet into the
              group reserve in the live app.
            </Text>

            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[
                styles.amountWrap,
                contributeError && { borderColor: SAVINGS.withdrawal },
              ]}
            >
              <Text style={styles.amountPrefix}>{plan.currency_code}</Text>
              <TextInput
                style={styles.amountInput}
                value={contributeAmount}
                onChangeText={(v) => {
                  setContributeAmount(v);
                  setContributeError("");
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={CLAY.inkFaint}
                autoFocus
              />
            </Clay>
            {contributeError ? (
              <Text style={styles.fieldError}>{contributeError}</Text>
            ) : null}

            <View style={styles.quickAmounts}>
              {[1, 2, 5].map((mult) => {
                const value = plan.amount_per_contribution * mult;
                return (
                  <TouchableOpacity
                    key={mult}
                    onPress={() => setContributeAmount(String(value))}
                    activeOpacity={0.9}
                    style={{ flex: 1 }}
                  >
                    <Clay
                      color={SAVINGS.tealSoft}
                      radius={RADIUS.md}
                      depth={0}
                      shade={CLAY.shadeSoft}
                      bodyStyle={styles.quickChip}
                    >
                      <Text style={styles.quickChipText}>
                        {mult}× {formatMoney(value)}
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleRecordContribution}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.lg }}
            >
              <Clay
                color={SAVINGS.teal}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(30, 70, 66, 0.42)"
                bodyStyle={styles.modalPrimaryBtn}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Record contribution
                </Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat block                                                        */
/* ------------------------------------------------------------------ */

function StatBlock({
  icon: Icon,
  label,
  value,
  accent,
  capitalize,
}: {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  value: string;
  accent?: string;
  capitalize?: boolean;
}) {
  const color = accent ?? CLAY.ink;
  return (
    <Clay radius={RADIUS.lg} depth={0} shade={CLAY.shadeSoft} style={{ flex: 1 }} bodyStyle={styles.statBlock}>
      <View
        style={[
          styles.statIconWrap,
          {
            backgroundColor: accent
              ? accent === SAVINGS.growth
                ? SAVINGS.growthSoft
                : SAVINGS.withdrawalSoft
              : CLAY.sunken,
          },
        ]}
      >
        <Icon size={14} color={color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          capitalize && { textTransform: "capitalize" },
        ]}
      >
        {label}
      </Text>
    </Clay>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

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

  /* Title block with floating bell */
  titleBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Hero */
  heroWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  hero: {
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg + 2,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md + 2,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroStatusDot: { width: 7, height: 7, borderRadius: 4 },
  heroStatusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#FFFFFF",
    opacity: 0.9,
  },
  heroTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  adminTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  heroSettingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  heroRing: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  heroDetails: { flex: 1, gap: 2 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#FFFFFF",
    opacity: 0.6,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  heroTarget: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.7,
    fontWeight: "500",
    marginTop: 2,
  },

  heroProgressWrap: { marginTop: SPACING.lg, gap: SPACING.sm },
  heroProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: SAVINGS.mint,
  },
  heroMilestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  heroMilestoneItem: { alignItems: "center", gap: 3 },
  heroMilestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  heroMilestoneDotReached: { backgroundColor: SAVINGS.mint },
  heroMilestoneLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    fontVariant: ["tabular-nums"],
  },

  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  heroFooterText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.85,
  },

  /* CTA */
  actionRow: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Pending banner */
  bannerWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  pendingBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(192, 138, 62, 0.2)",
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: SAVINGS.warningInk,
    letterSpacing: -0.1,
  },
  pendingBannerMeta: {
    fontSize: 11.5,
    color: SAVINGS.warningInk,
    fontWeight: "500",
  },

  /* Admin quick actions */
  adminQuickRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  adminQuickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  adminQuickIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  adminQuickTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  adminQuickMeta: {
    fontSize: 10.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },

  /* Quorum note */
  quorumWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  quorumNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  quorumNoteText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: SAVINGS.tealInk,
    lineHeight: 16,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  statBlock: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 4,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  /* Sections */
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
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  sectionCountPill: {
    minWidth: 26,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: "center",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  manageLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: SAVINGS.teal,
    letterSpacing: 0.2,
  },

  /* List wrappers */
  listWrap: {
    paddingHorizontal: SPACING.xl,
  },

  /* Members */
  membersList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  memberRole: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  creatorPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: SAVINGS.tealSoft,
  },
  creatorPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: SAVINGS.tealInk,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  memberStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  /* Flow summary */
  flowSummaryWrap: {
    paddingHorizontal: SPACING.xl,
  },
  flowSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  flowSummaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  flowSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  flowSummaryLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  flowSummaryValue: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  flowSummaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: CLAY.hairline,
    marginHorizontal: SPACING.md,
  },

  /* Activity list */
  activityList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  activityMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  activityAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },

  /* Empty */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
  },
  emptyCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  emptyCardText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Description */
  descriptionWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  descriptionCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  descriptionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: SAVINGS.tealInk,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: SAVINGS.tealInk,
    lineHeight: 19,
    fontWeight: "500",
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  missingCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: SPACING.sm,
    width: "100%",
    maxWidth: 320,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  missingBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  modalSheetWrap: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: 0,
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  modalEyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: SAVINGS.teal,
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  modalClose: {
    color: CLAY.inkSoft,
    fontSize: 18,
    fontWeight: "600",
  },
  modalHelper: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    marginBottom: SPACING.lg,
    fontWeight: "500",
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  amountPrefix: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.4,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    padding: 0,
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  fieldError: {
    color: SAVINGS.withdrawal,
    fontSize: 12,
    fontWeight: "700",
    marginTop: SPACING.sm,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickChip: {
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: SAVINGS.tealInk,
    fontVariant: ["tabular-nums"],
  },
  modalPrimaryBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});