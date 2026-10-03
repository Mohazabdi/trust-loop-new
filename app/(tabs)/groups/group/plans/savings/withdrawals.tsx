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

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import {
  useSavingsStorage,
  type WithdrawalRequest,
} from "@/store/useSavingsStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS = {
  teal: "#0D9488",
  tealDeep: "#0F766E",
  tealDark: "#115E59",
  mintSoft: "#CCFBF1",
  withdrawal: "#DC2626",
  withdrawalDeep: "#B91C1C",
  withdrawalSoft: "#FEF2F2",
  growth: "#16A34A",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
} as const;

const STATUS_META = {
  pending: { color: SAVINGS.warning, label: "Pending" },
  approved: { color: SAVINGS.growth, label: "Approved" },
  declined: { color: SAVINGS.withdrawal, label: "Declined" },
} as const;

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function SavingsWithdrawalsScreen() {
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

  const requests = useMemo(
    () =>
      [...(plan?.withdrawal_requests ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
        activeOpacity={0.85}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: tone(meta.color, 0.12) },
            ]}
          >
            {request.status === "pending" ? (
              <Clock size={10} color={meta.color} strokeWidth={2.6} />
            ) : request.status === "approved" ? (
              <CheckCircle size={10} color={meta.color} strokeWidth={2.6} />
            ) : (
              <XCircle size={10} color={meta.color} strokeWidth={2.6} />
            )}
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>

          <Text style={styles.cardDate}>{formatDate(request.created_at)}</Text>
        </View>

        <View style={styles.cardAmountRow}>
          <Text
            style={[
              styles.cardAmount,
              {
                color:
                  request.status === "approved"
                    ? SAVINGS.withdrawalDeep
                    : theme.text,
                opacity: request.status === "declined" ? 0.5 : 1,
                textDecorationLine:
                  request.status === "declined" ? "line-through" : "none",
              },
            ]}
          >
            {plan?.currency_code ?? "KES"} {formatMoney(request.amount)}
          </Text>
          <ChevronRight
            size={16}
            color={theme.textSecondary}
            style={{ opacity: 0.5 }}
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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Withdrawals"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {plan?.savings_name?.toUpperCase() ?? "SAVINGS"}
          </Text>
          <Text style={styles.title}>Withdrawal requests</Text>
          <Text style={styles.subtitle}>
            Every request, its approvals, and its outcome.
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <SummaryStat
            value={counts.pending ?? 0}
            label="Pending"
            color={SAVINGS.warning}
            theme={theme}
            styles={styles}
          />
          <SummaryStat
            value={counts.approved ?? 0}
            label="Approved"
            color={SAVINGS.growth}
            theme={theme}
            styles={styles}
          />
          <SummaryStat
            value={counts.declined ?? 0}
            label="Declined"
            color={SAVINGS.withdrawal}
            theme={theme}
            styles={styles}
          />
        </View>

        {/* Total paid out */}
        {totalApproved > 0 ? (
          <View style={styles.payoutCard}>
            <ArrowDownCircle
              size={18}
              color={SAVINGS.withdrawalDeep}
              strokeWidth={2.4}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.payoutLabel}>Total withdrawn</Text>
              <Text style={styles.payoutValue}>
                {plan?.currency_code ?? "KES"} {formatMoney(totalApproved)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* List */}
        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              No withdrawal requests yet. The first one will appear here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: SPACING.sm, marginTop: SPACING.lg }}>
            {requests.map((r) => (
              <RequestCard key={r.withdrawal_id} request={r} />
            ))}
          </View>
        )}

        {/* New request CTA */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(tabs)/groups/group/plans/savings/withdraw",
              params,
            })
          }
          activeOpacity={0.85}
          style={styles.newRequest}
        >
          <Plus size={16} color={SAVINGS.withdrawal} strokeWidth={2.6} />
          <Text style={styles.newRequestText}>New withdrawal request</Text>
          <ChevronRight
            size={14}
            color={SAVINGS.withdrawal}
            strokeWidth={2.6}
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({
  value,
  label,
  color,
  theme,
  styles,
}: {
  value: number;
  label: string;
  color: string;
  theme: any;
  styles: any;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: SPACING.xxl },

    header: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      gap: 4,
    },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
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
      color: theme.textSecondary,
      fontWeight: "500",
      lineHeight: 18,
      marginTop: 2,
    },

    summaryRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.sm,
    },
    summaryStat: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      alignItems: "center",
      gap: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },

    payoutCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.withdrawalSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.15),
    },
    payoutLabel: {
      fontSize: 10.5,
      fontWeight: "800",
      color: SAVINGS.withdrawalDeep,
      letterSpacing: 1,
      textTransform: "uppercase",
      opacity: 0.75,
    },
    payoutValue: {
      fontSize: 20,
      fontWeight: "800",
      color: SAVINGS.withdrawalDeep,
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },

    card: {
      marginHorizontal: SPACING.xl,
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
      paddingVertical: 3,
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
      color: theme.textSecondary,
      fontWeight: "500",
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
      color: theme.textSecondary,
      fontWeight: "500",
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    cardMeta: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "600",
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
      backgroundColor: `${theme.text}15`,
    },

    emptyCard: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
      padding: SPACING.xxl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${theme.text}15`,
      alignItems: "center",
    },
    emptyCardText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 19,
    },

    newRequest: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.xl,
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.withdrawalSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.25),
    },
    newRequestText: {
      fontSize: 13.5,
      fontWeight: "700",
      color: SAVINGS.withdrawal,
      letterSpacing: 0.1,
    },
  });
}