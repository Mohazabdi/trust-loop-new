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
  Calendar,
  CheckCircle,
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

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import CircularProgress from "@/components/myGroups/PieProgress";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useMemberData } from "@/hooks/useMemberData";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import {
  useSavingsStorage,
  type SavingsFrequency,
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
  mint: "#5EEAD4",
  mintSoft: "#CCFBF1",
  growth: "#16A34A",
  growthSoft: "#DCFCE7",
  withdrawal: "#DC2626",
  withdrawalDeep: "#B91C1C",
  withdrawalSoft: "#FEF2F2",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  tint: "#F0FDFA",
} as const;

const STATUS_COLORS: Record<string, string> = {
  active: SAVINGS.teal,
  draft: "#6B7280",
  paused: "#D97706",
  completed: SAVINGS.growth,
};

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

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

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        <CustomGroupHeader
          groupName="Savings"
          leftAction={{ icon: ChevronLeft, action: handleBack }}
          rightAction={{ icon: BellIcon, action: handleNotifications }}
        />
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            This savings plan could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName={plan.savings_name}
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={styles.heroShadow}>
          <LinearGradient
            colors={[SAVINGS.tealDark, SAVINGS.teal, SAVINGS.tealDeep]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroStatus}>
                <View
                  style={[styles.heroStatusDot, { backgroundColor: "#fff" }]}
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
                  <Settings2 size={16} color="#fff" strokeWidth={2.2} />
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
                        pct >= m && { color: "#fff", fontWeight: "700" },
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
          </LinearGradient>
        </View>

        {/* ── Primary CTA ──────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleOpenContribute}
            activeOpacity={0.85}
            style={styles.primaryBtn}
          >
            <LinearGradient
              colors={[SAVINGS.teal, SAVINGS.tealDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <ArrowUpCircle size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.primaryBtnText}>
                Contribute {plan.currency_code}{" "}
                {formatMoney(plan.amount_per_contribution)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Pending approvals banner ─────────────────────── */}
        {pendingRequestCount > 0 ? (
          <TouchableOpacity
            onPress={
              myPendingApproval
                ? () => handleOpenRequestDetail(myPendingApproval.withdrawal_id)
                : handleOpenWithdrawals
            }
            activeOpacity={0.85}
            style={styles.pendingBanner}
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
            <ChevronRight size={15} color={SAVINGS.warning} strokeWidth={2.6} />
          </TouchableOpacity>
        ) : null}

        {/* ── Admin quick actions ──────────────────────────── */}
        {isAdmin ? (
          <View style={styles.adminQuickRow}>
            <TouchableOpacity
              onPress={handleOpenMembers}
              activeOpacity={0.85}
              style={styles.adminQuickCard}
            >
              <View
                style={[
                  styles.adminQuickIcon,
                  { backgroundColor: tone(SAVINGS.teal, 0.1) },
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
                color={theme.textSecondary}
                style={{ opacity: 0.6 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRequestWithdrawal}
              activeOpacity={0.85}
              style={styles.adminQuickCard}
            >
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
                color={theme.textSecondary}
                style={{ opacity: 0.6 }}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Quorum note ──────────────────────────────────── */}
        <View style={styles.quorumNote}>
          <ShieldCheck
            size={13}
            color={SAVINGS.tealDark}
            strokeWidth={2.4}
          />
          <Text style={styles.quorumNoteText}>
            Withdrawals need {quorum} member approval
            {quorum === 1 ? "" : "s"} before funds are released
          </Text>
        </View>

        {/* ── Stats row ──────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBlock
            icon={TrendingUp}
            label="Contributed"
            value={`${formatMoney(grossContributed)}`}
            accent={SAVINGS.growth}
            theme={theme}
            styles={styles}
          />
          <StatBlock
            icon={ArrowDownCircle}
            label="Withdrawn"
            value={`${formatMoney(totalWithdrawn)}`}
            accent={totalWithdrawn > 0 ? SAVINGS.withdrawal : undefined}
            theme={theme}
            styles={styles}
          />
          <StatBlock
            icon={Repeat}
            label="Frequency"
            value={plan.frequency}
            theme={theme}
            styles={styles}
            capitalize
          />
        </View>

        {/* ── Members ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Members</Text>
            <View
              style={[
                styles.sectionCountPill,
                { backgroundColor: SAVINGS.mintSoft },
              ]}
            >
              <Text
                style={[styles.sectionCountText, { color: SAVINGS.tealDark }]}
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
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              No members yet.
              {isAdmin ? " Tap Manage to invite group members." : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.membersList}>
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
                      { backgroundColor: tone(SAVINGS.teal, 0.12) },
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
                          ? tone("#D97706", 0.12)
                          : tone(SAVINGS.growth, 0.12),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberStatusText,
                        {
                          color: isInvited ? "#D97706" : SAVINGS.growth,
                        },
                      ]}
                    >
                      {m.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Fund activity ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Fund activity</Text>
            <View
              style={[
                styles.sectionCountPill,
                { backgroundColor: SAVINGS.mintSoft },
              ]}
            >
              <Text
                style={[styles.sectionCountText, { color: SAVINGS.tealDark }]}
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
        <View style={styles.flowSummary}>
          <View style={styles.flowSummaryItem}>
            <View
              style={[
                styles.flowSummaryIcon,
                { backgroundColor: tone(SAVINGS.growth, 0.12) },
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
        </View>

        {/* Activity ledger */}
        {ledger.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              No money movement yet. Tap Contribute to record the first deposit.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
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
                          ? tone(SAVINGS.growth, 0.12)
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
                        color: isIn ? SAVINGS.growth : SAVINGS.withdrawal,
                      },
                    ]}
                  >
                    {isIn ? "+" : "−"}
                    {plan.currency_code} {formatMoney(c.absAmount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Description */}
        {plan.savings_description ? (
          <View style={styles.descriptionWrap}>
            <Text style={styles.descriptionLabel}>About this plan</Text>
            <Text style={styles.descriptionText}>
              {plan.savings_description}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Contribute modal ────────────────────────────────── */}
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
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.modalEyebrow}>CONTRIBUTE</Text>
              <Text style={styles.modalTitle}>{plan.savings_name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setContributeOpen(false)}
              hitSlop={10}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalHelper}>
            Recording a contribution moves money from your wallet into the
            group reserve in the live app.
          </Text>

          <View style={styles.amountWrap}>
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
              placeholderTextColor={`${theme.text}30`}
              autoFocus
            />
          </View>
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
                  activeOpacity={0.85}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>
                    {mult}× {formatMoney(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleRecordContribution}
            activeOpacity={0.85}
            style={styles.modalPrimaryBtnWrap}
          >
            <LinearGradient
              colors={[SAVINGS.teal, SAVINGS.tealDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalPrimaryBtn}
            >
              <Text style={styles.modalPrimaryBtnText}>
                Record contribution
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  theme,
  styles,
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
  theme: any;
  styles: any;
  accent?: string;
  capitalize?: boolean;
}) {
  const color = accent ?? theme.text;
  return (
    <View style={styles.statBlock}>
      <View
        style={[
          styles.statIconWrap,
          {
            backgroundColor: accent ? tone(accent, 0.12) : `${theme.text}08`,
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    /* Hero */
    heroShadow: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      borderRadius: RADIUS.xl,
      backgroundColor: SAVINGS.tealDark,
      shadowColor: SAVINGS.tealDark,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 8,
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
      color: "#fff",
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
      color: "#fff",
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
      color: "#fff",
      opacity: 0.6,
      marginBottom: 4,
    },
    heroAmount: {
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.8,
      color: "#fff",
      fontVariant: ["tabular-nums"],
    },
    heroTarget: {
      fontSize: 12,
      color: "#fff",
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
      color: "#fff",
      opacity: 0.85,
    },

    /* CTA */
    actionRow: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
    },
    primaryBtn: {
      borderRadius: RADIUS.lg,
      shadowColor: SAVINGS.teal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
    },
    primaryBtnText: {
      fontSize: 14.5,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },

    /* Pending banner */
    pendingBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      padding: SPACING.md + 2,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.warningSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.warning, 0.25),
    },
    pendingBannerIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tone(SAVINGS.warning, 0.2),
    },
    pendingBannerTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: "#92400E",
      letterSpacing: -0.1,
    },
    pendingBannerMeta: {
      fontSize: 11,
      color: "#92400E",
      fontWeight: "500",
      opacity: 0.85,
    },

    /* Admin quick actions */
    adminQuickRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.md,
    },
    adminQuickCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    adminQuickIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    adminQuickTitle: {
      fontSize: 12.5,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.1,
    },
    adminQuickMeta: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: "500",
    },

    /* Quorum note */
    quorumNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 2,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.mintSoft,
    },
    quorumNoteText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: "600",
      color: SAVINGS.tealDark,
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
      flex: 1,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      alignItems: "center",
      gap: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    statIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 9,
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
      fontWeight: "700",
      color: theme.textSecondary,
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
      gap: SPACING.sm,
    },
    sectionTitle: {
      fontSize: TYPE.h3,
      fontWeight: "800",
      color: theme.text,
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

    /* Members */
    membersList: {
      marginHorizontal: SPACING.xl,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.text}10`,
    },
    memberAvatar: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    memberAvatarText: {
      fontSize: 13,
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
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    memberRole: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    creatorPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: SAVINGS.mintSoft,
    },
    creatorPillText: {
      fontSize: 9,
      fontWeight: "800",
      color: SAVINGS.tealDark,
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
    flowSummary: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: SPACING.xl,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
    },
    flowSummaryItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    flowSummaryIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    flowSummaryLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    flowSummaryValue: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.2,
      fontVariant: ["tabular-nums"],
    },
    flowSummaryDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: `${theme.text}12`,
      marginHorizontal: SPACING.md,
    },

    /* Activity list */
    activityList: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    activityIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    activityName: {
      fontSize: 13.5,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.1,
    },
    activityMeta: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    activityAmount: {
      fontSize: 13.5,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.2,
    },

    /* Empty */
    emptyCard: {
      marginHorizontal: SPACING.xl,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${theme.text}15`,
      alignItems: "center",
    },
    emptyCardText: {
      fontSize: 12.5,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
    },

    /* Description */
    descriptionWrap: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.xxl,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.tint,
    },
    descriptionLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: SAVINGS.tealDark,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    descriptionText: {
      fontSize: 13,
      color: SAVINGS.tealDark,
      lineHeight: 19,
    },

    /* Modal */
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    modalSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.md,
      paddingBottom: 40,
    },
    modalHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.text}20`,
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
      color: theme.text,
      letterSpacing: -0.4,
    },
    modalHelper: {
      fontSize: 12.5,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: SPACING.lg,
    },
    amountWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.surface ?? theme.background,
    },
    amountPrefix: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 0.4,
    },
    amountInput: {
      flex: 1,
      fontSize: 26,
      fontWeight: "800",
      color: theme.text,
      padding: 0,
      letterSpacing: -0.6,
      fontVariant: ["tabular-nums"],
    },
    fieldError: {
      color: "#DC2626",
      fontSize: 12,
      marginTop: SPACING.sm,
    },
    quickAmounts: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    quickChip: {
      flex: 1,
      paddingVertical: SPACING.sm + 2,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.mintSoft,
      alignItems: "center",
    },
    quickChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: SAVINGS.tealDark,
      fontVariant: ["tabular-nums"],
    },
    modalPrimaryBtnWrap: {
      marginTop: SPACING.lg,
      borderRadius: RADIUS.lg,
    },
    modalPrimaryBtn: {
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      alignItems: "center",
    },
    modalPrimaryBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
  });
}