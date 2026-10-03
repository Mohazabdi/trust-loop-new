import { useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownCircle,
  BellIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  XCircle,
} from "lucide-react-native";

import { useGlobalStorage } from "@/store/useGlobalStorage";
import {
  useSavingsStorage,
  type WithdrawalRequest,
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
 * Savings teal + growth green + withdrawal red, all muted to sit
 * comfortably on the clay canvas instead of glowing off it.
 */
const SAVINGS = {
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
  tealTint: "#EBF5F4",
  tealInk: "#2E5C58",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  withdrawal: "#CF6B6B",
  withdrawalSoft: "#FAE3E3",
  withdrawalTint: "#FCF0F0",
  withdrawalInk: "#7A3535",
  warning: "#C08A3E",
  warningSoft: "#F7EAD8",
  warningInk: "#7A5416",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const STATUS_META = {
  pending: {
    color: SAVINGS.warning,
    soft: SAVINGS.warningSoft,
    ink: SAVINGS.warningInk,
    label: "Pending",
  },
  approved: {
    color: SAVINGS.growth,
    soft: SAVINGS.growthSoft,
    ink: SAVINGS.growth,
    label: "Approved",
  },
  declined: {
    color: SAVINGS.withdrawal,
    soft: SAVINGS.withdrawalSoft,
    ink: SAVINGS.withdrawalInk,
    label: "Declined",
  },
} as const;

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

export default function SavingsWithdrawalsScreen() {
  const router = useRouter();
  const { setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

  const plan = useSavingsStorage((s) =>
    s.plans.find((p) => p.savings_plan_id === params.plan_id)
  );

  const requests = useMemo(
    () =>
      [...(plan?.withdrawal_requests ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [plan]
  );

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { pending: 0, approved: 0, declined: 0 } as Record<string, number>
    );
  }, [requests]);

  const totalApproved = useMemo(
    () =>
      requests
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + r.amount, 0),
    [requests]
  );

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const handleOpenRequest = useCallback(
    (request: WithdrawalRequest) => {
      router.push({
        pathname: "/(tabs)/groups/group/plans/savings/withdrawalDetail",
        params: {
          plan_id: params.plan_id,
          withdrawal_id: request.withdrawal_id,
          group_id: params.group_id,
          group_member_id: params.group_member_id,
          member_role: params.member_role,
        },
      });
    },
    [router, params]
  );

  const RequestCard = ({ request }: { request: WithdrawalRequest }) => {
    const meta = STATUS_META[request.status];
    const approvalCount = request.approvals.filter(
      (a) => a.decision === "approve"
    ).length;
    const quorum = plan?.approval_quorum ?? 3;

    return (
      <TouchableOpacity
        onPress={() => handleOpenRequest(request)}
        activeOpacity={0.9}
      >
        <Clay bodyStyle={styles.card}>
          <View style={styles.cardTop}>
            <View
              style={[styles.statusPill, { backgroundColor: meta.soft }]}
            >
              {request.status === "pending" ? (
                <Clock size={10} color={meta.color} strokeWidth={2.6} />
              ) : request.status === "approved" ? (
                <CheckCircle
                  size={10}
                  color={meta.color}
                  strokeWidth={2.6}
                />
              ) : (
                <XCircle
                  size={10}
                  color={meta.color}
                  strokeWidth={2.6}
                />
              )}
              <Text style={[styles.statusText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            <Text style={styles.cardDate}>
              {formatDate(request.created_at)}
            </Text>
          </View>

          <View style={styles.cardAmountRow}>
            <Text
              style={[
                styles.cardAmount,
                {
                  color:
                    request.status === "approved"
                      ? SAVINGS.growth
                      : request.status === "declined"
                      ? SAVINGS.withdrawalInk
                      : CLAY.ink,
                  opacity: request.status === "declined" ? 0.6 : 1,
                  textDecorationLine:
                    request.status === "declined" ? "line-through" : "none",
                },
              ]}
            >
              {plan?.currency_code ?? "KES"} {formatMoney(request.amount)}
            </Text>
            <ChevronRight
              size={16}
              color={CLAY.inkFaint}
              strokeWidth={2.4}
            />
          </View>

          <Text style={styles.cardReason} numberOfLines={1}>
            {request.reason}
            {request.note ? ` · ${request.note}` : ""}
          </Text>

          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMeta}>
              {request.requested_by_name}
            </Text>

            {request.status === "pending" ? (
              <View style={styles.cardProgress}>
                <View style={styles.progressDots}>
                  {Array.from({ length: quorum }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        i < approvalCount && {
                          backgroundColor: SAVINGS.warning,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.cardMeta}>
                  {approvalCount}/{quorum}
                </Text>
              </View>
            ) : null}
          </View>
        </Clay>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.eyebrow}>
              {plan?.savings_name?.toUpperCase() ?? "SAVINGS"}
            </Text>
            <Text style={styles.title}>Withdrawal requests</Text>
            <Text style={styles.subtitle}>
              Every request, its approvals, and its outcome.
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

        {/* ── Summary strip ─────────────────────────────── */}
        <View style={styles.summaryRow}>
          <SummaryStat
            value={counts.pending ?? 0}
            label="Pending"
            color={SAVINGS.warning}
          />
          <SummaryStat
            value={counts.approved ?? 0}
            label="Approved"
            color={SAVINGS.growth}
          />
          <SummaryStat
            value={counts.declined ?? 0}
            label="Declined"
            color={SAVINGS.withdrawal}
          />
        </View>

        {/* ── Total paid out ────────────────────────────── */}
        {totalApproved > 0 ? (
          <View style={styles.payoutWrap}>
            <Clay
              color={SAVINGS.withdrawalTint}
              radius={RADIUS.lg}
              depth={1}
              bodyStyle={styles.payoutCard}
            >
              <View
                style={[
                  styles.payoutIcon,
                  { backgroundColor: SAVINGS.withdrawalSoft },
                ]}
              >
                <ArrowDownCircle
                  size={18}
                  color={SAVINGS.withdrawal}
                  strokeWidth={2.6}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.payoutLabel}>TOTAL WITHDRAWN</Text>
                <Text style={styles.payoutValue}>
                  {plan?.currency_code ?? "KES"}{" "}
                  {formatMoney(totalApproved)}
                </Text>
              </View>
            </Clay>
          </View>
        ) : null}

        {/* ── Section label ─────────────────────────────── */}
        {requests.length > 0 ? (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionLabel}>All requests</Text>
          </View>
        ) : null}

        {/* ── List ──────────────────────────────────────── */}
        {requests.length === 0 ? (
          <View style={styles.listWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                No withdrawal requests yet. The first one will appear here.
              </Text>
            </Clay>
          </View>
        ) : (
          <View style={styles.listWrapStack}>
            {requests.map((r) => (
              <RequestCard key={r.withdrawal_id} request={r} />
            ))}
          </View>
        )}

        {/* ── New request CTA ───────────────────────────── */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(tabs)/groups/group/plans/savings/withdraw",
              params,
            })
          }
          activeOpacity={0.9}
          style={styles.newRequestWrap}
        >
          <Clay
            color={SAVINGS.withdrawalSoft}
            radius={RADIUS.lg}
            depth={0}
            shade="rgba(120, 40, 40, 0.22)"
            bodyStyle={styles.newRequest}
          >
            <Plus
              size={16}
              color={SAVINGS.withdrawal}
              strokeWidth={2.6}
            />
            <Text style={styles.newRequestText}>
              New withdrawal request
            </Text>
            <ChevronRight
              size={14}
              color={SAVINGS.withdrawal}
              strokeWidth={2.6}
            />
          </Clay>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary stat                                                      */
/* ------------------------------------------------------------------ */

function SummaryStat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Clay
      radius={RADIUS.lg}
      depth={0}
      shade={CLAY.shadeSoft}
      style={{ flex: 1 }}
      bodyStyle={styles.summaryStat}
    >
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Clay>
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
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 320,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Summary */
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  summaryStat: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  /* Payout slab */
  payoutWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  payoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: SAVINGS.withdrawal,
    letterSpacing: 1,
  },
  payoutValue: {
    fontSize: 20,
    fontWeight: "800",
    color: SAVINGS.withdrawalInk,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },

  /* Section label */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  /* List wrappers */
  listWrap: { paddingHorizontal: SPACING.xl },
  listWrapStack: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },

  /* Request card */
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardDate: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  cardAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cardAmount: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  cardReason: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "700",
  },
  cardProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDots: {
    flexDirection: "row",
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CLAY.sunken,
  },

  /* Empty */
  emptyCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  emptyCardText: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },

  /* New request CTA */
  newRequestWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  newRequest: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  newRequestText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: SAVINGS.withdrawal,
    letterSpacing: 0.1,
  },
});