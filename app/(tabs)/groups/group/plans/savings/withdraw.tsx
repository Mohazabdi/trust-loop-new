import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  AlertTriangle,
  ArrowDownCircle,
  BellIcon,
  ChevronLeft,
  Info,
  Send,
  ShieldCheck,
  TrendingDown,
} from "lucide-react-native";
import { toast } from "sonner-native";

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useSavingsStorage } from "@/store/useSavingsStorage";

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
  withdrawal: "#DC2626",
  withdrawalDeep: "#B91C1C",
  withdrawalSoft: "#FEF2F2",
  growth: "#16A34A",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
} as const;

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const REASONS = [
  { id: "emergency", label: "Emergency" },
  { id: "payout", label: "Member payout" },
  { id: "investment", label: "Investment" },
  { id: "expense", label: "Group expense" },
  { id: "other", label: "Other" },
] as const;

type ReasonId = (typeof REASONS)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function SavingsWithdrawScreen() {
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
  const createWithdrawalRequest = useSavingsStorage(
    (s) => s.createWithdrawalRequest
  );

  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<ReasonId | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  /* ── Balance calc ───────────────────────────────────────────── */
  const netBalance = useMemo(
    () => plan?.contributions.reduce((sum, c) => sum + c.amount, 0) ?? 0,
    [plan]
  );

  const pendingTotal = useMemo(
    () =>
      (plan?.withdrawal_requests ?? [])
        .filter((w) => w.status === "pending")
        .reduce((sum, w) => sum + w.amount, 0),
    [plan]
  );

  const availableBalance = Math.max(netBalance - pendingTotal, 0);

  const parsedAmount = Number(amount) || 0;
  const balanceAfter = netBalance - parsedAmount;
  const exceedsBalance = parsedAmount > availableBalance;
  const isValidAmount = parsedAmount > 0 && !exceedsBalance;

  /* ── Quorum info ────────────────────────────────────────────── */
  const quorum = plan?.approval_quorum ?? 3;
  const activeMembersCount =
    plan?.members.filter((m) => m.status === "active").length ?? 0;
  /* Approvers available = active members minus the requester */
  const availableApprovers = Math.max(activeMembersCount - 1, 0);
  const quorumReachable = availableApprovers >= quorum;

  const quickAmounts = useMemo(() => {
    if (!plan) return [];
    const seed = plan.amount_per_contribution;
    return [seed, seed * 2, seed * 5].filter((v) => v <= availableBalance);
  }, [plan, availableBalance]);

  /* ── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = () => {
    setError("");
    if (!plan) return;

    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (exceedsBalance) {
      setError(
        `Exceeds available balance of ${plan.currency_code} ${formatMoney(availableBalance)}.`
      );
      return;
    }

    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    const reasonLabel = REASONS.find((r) => r.id === reason)?.label ?? "Other";

    if (!quorumReachable) {
      Alert.alert(
        "Not enough approvers",
        `This plan needs ${quorum} approvals, but only ${availableApprovers} other members are active. Invite more members first.`,
      );
      return;
    }

    const requesterName =
      groupMemberDetail?.first_name || member?.first_name
        ? `${groupMemberDetail?.first_name ?? member?.first_name ?? ""} ${
            groupMemberDetail?.last_name ?? member?.last_name ?? ""
          }`.trim()
        : "Member";

    const request = createWithdrawalRequest({
      plan_id: plan.savings_plan_id,
      requested_by_id: params.group_member_id ?? "",
      requested_by_name: requesterName,
      amount: parsedAmount,
      reason: reasonLabel,
      note: note.trim() || undefined,
    });

    toast.success("Withdrawal request sent");
    router.replace({
      pathname: "/(tabs)/groups/group/plans/savings/withdrawalDetail",
      params: {
        plan_id: plan.savings_plan_id,
        withdrawal_id: request.withdrawal_id,
        group_id: params.group_id,
        group_member_id: params.group_member_id,
        member_role: params.member_role,
      },
    });
  };

  /* ── Guard: plan missing ────────────────────────────────────── */
  if (!plan) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <CustomGroupHeader
          groupName="Withdraw"
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
        groupName="Request withdrawal"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WITHDRAWAL REQUEST</Text>
            <Text style={styles.title}>{plan.savings_name}</Text>
            <Text style={styles.subtitle}>
              Submit a request. It will be released once {quorum} members
              approve it.
            </Text>
          </View>

          {/* Balance card */}
          <LinearGradient
            colors={[SAVINGS.withdrawalSoft, "#FFF7F7", SAVINGS.withdrawalSoft]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceTop}>
              <View style={styles.balanceBadge}>
                <ArrowDownCircle
                  size={11}
                  color={SAVINGS.withdrawal}
                  strokeWidth={2.6}
                />
                <Text style={styles.balanceBadgeText}>AVAILABLE</Text>
              </View>
              <TrendingDown
                size={14}
                color={SAVINGS.withdrawal}
                strokeWidth={2.2}
                style={{ opacity: 0.5 }}
              />
            </View>

            <Text style={styles.balanceAmount} numberOfLines={1}>
              {plan.currency_code} {formatMoney(availableBalance)}
            </Text>
            {pendingTotal > 0 ? (
              <Text style={styles.balanceMeta}>
                {plan.currency_code} {formatMoney(pendingTotal)} pending in
                other requests
              </Text>
            ) : (
              <Text style={styles.balanceMeta}>No pending requests</Text>
            )}
          </LinearGradient>

          {/* Quorum banner */}
          <View
            style={[
              styles.quorumBox,
              {
                backgroundColor: quorumReachable
                  ? SAVINGS.mintSoft
                  : SAVINGS.warningSoft,
              },
            ]}
          >
            <ShieldCheck
              size={16}
              color={quorumReachable ? SAVINGS.tealDark : SAVINGS.warning}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.quorumText,
                {
                  color: quorumReachable ? SAVINGS.tealDark : SAVINGS.warning,
                },
              ]}
            >
              {quorumReachable
                ? `Needs ${quorum} approvals from ${availableApprovers} members`
                : `Not enough active members. Need ${quorum} approvers.`}
            </Text>
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Amount to withdraw</Text>
            <View
              style={[
                styles.amountWrap,
                exceedsBalance && styles.amountWrapError,
              ]}
            >
              <Text style={styles.amountPrefix}>{plan.currency_code}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={`${theme.text}30`}
                autoFocus
              />
            </View>

            {quickAmounts.length > 0 ? (
              <View style={styles.quickRow}>
                {quickAmounts.map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => {
                      setAmount(String(v));
                      setError("");
                    }}
                    activeOpacity={0.85}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>{formatMoney(v)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setAmount(String(availableBalance));
                    setError("");
                  }}
                  activeOpacity={0.85}
                  style={[styles.quickChip, styles.quickChipMax]}
                >
                  <Text style={[styles.quickChipText, { color: "#fff" }]}>
                    Max
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Reason */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Reason</Text>
            <View style={styles.reasonGrid}>
              {REASONS.map((r) => {
                const selected = reason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => {
                      setReason(r.id);
                      setError("");
                    }}
                    activeOpacity={0.85}
                    style={[
                      styles.reasonChip,
                      selected && {
                        borderColor: SAVINGS.withdrawal,
                        backgroundColor: SAVINGS.withdrawalSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        selected && {
                          color: SAVINGS.withdrawal,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Note */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Note <Text style={styles.fieldOptional}>(optional)</Text>
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Paid school fees for 3 members"
              placeholderTextColor={theme.textSecondary}
              style={styles.noteInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={120}
            />
            <Text style={styles.noteCount}>{note.length}/120</Text>
          </View>

          {/* Preview */}
          {isValidAmount ? (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Current balance</Text>
                <Text style={styles.previewValue}>
                  {plan.currency_code} {formatMoney(netBalance)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Requested</Text>
                <Text
                  style={[styles.previewValue, { color: SAVINGS.withdrawal }]}
                >
                  − {plan.currency_code} {formatMoney(parsedAmount)}
                </Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabelBold}>If approved</Text>
                <Text style={styles.previewValueBold}>
                  {plan.currency_code} {formatMoney(balanceAfter)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <AlertTriangle
                size={14}
                color={SAVINGS.withdrawal}
                strokeWidth={2.4}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Info */}
          <View style={styles.infoBox}>
            <Info size={14} color={SAVINGS.tealDark} strokeWidth={2.4} />
            <Text style={styles.infoText}>
              All members will be notified. The request is released only when{" "}
              {quorum} members approve. You cannot approve your own request.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!isValidAmount || !reason || !quorumReachable}
            style={[
              styles.submitWrap,
              (!isValidAmount || !reason || !quorumReachable) && {
                opacity: 0.5,
              },
            ]}
          >
            <LinearGradient
              colors={[SAVINGS.withdrawal, SAVINGS.withdrawalDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              <Send size={16} color="#fff" strokeWidth={2.4} />
              <Text style={styles.submitBtnText}>
                {parsedAmount > 0
                  ? `Request ${plan.currency_code} ${formatMoney(parsedAmount)}`
                  : "Send request"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.85}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
      gap: SPACING.lg,
    },

    header: { paddingTop: SPACING.lg, gap: 4 },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: SAVINGS.withdrawal,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: TYPE.h2,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
      marginTop: 4,
    },

    balanceCard: {
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.15),
      gap: SPACING.sm,
    },
    balanceTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    balanceBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: tone(SAVINGS.withdrawal, 0.12),
    },
    balanceBadgeText: {
      fontSize: 9.5,
      fontWeight: "800",
      color: SAVINGS.withdrawal,
      letterSpacing: 0.8,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: "800",
      color: SAVINGS.withdrawalDeep,
      letterSpacing: -1,
      fontVariant: ["tabular-nums"],
      marginTop: 4,
    },
    balanceMeta: {
      fontSize: 12,
      color: SAVINGS.withdrawalDeep,
      opacity: 0.7,
      fontWeight: "500",
    },

    quorumBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
    },
    quorumText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: "700",
      lineHeight: 18,
    },

    fieldGroup: { gap: SPACING.sm },
    fieldLabel: {
      fontSize: TYPE.label,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: 0.2,
    },
    fieldOptional: { fontWeight: "500", color: theme.textSecondary },

    amountWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 10,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.surface ?? theme.background,
    },
    amountWrapError: { borderColor: SAVINGS.withdrawal },
    amountPrefix: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 0.4,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
      padding: 0,
      letterSpacing: -0.8,
      fontVariant: ["tabular-nums"],
    },

    quickRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: 2,
      flexWrap: "wrap",
    },
    quickChip: {
      paddingHorizontal: SPACING.md + 2,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.mintSoft,
      minWidth: 70,
      alignItems: "center",
    },
    quickChipMax: { backgroundColor: SAVINGS.withdrawal },
    quickChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: SAVINGS.tealDark,
      fontVariant: ["tabular-nums"],
    },

    reasonGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm,
    },
    reasonChip: {
      paddingHorizontal: SPACING.md + 2,
      paddingVertical: SPACING.sm + 2,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      backgroundColor: theme.surface ?? theme.background,
    },
    reasonChipText: {
      fontSize: 12.5,
      fontWeight: "600",
      color: theme.text,
    },

    noteInput: {
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.surface ?? theme.background,
      minHeight: 80,
    },
    noteCount: {
      fontSize: 10.5,
      color: theme.textSecondary,
      textAlign: "right",
      marginTop: -2,
    },

    previewCard: {
      padding: SPACING.md + 2,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
      gap: SPACING.sm,
    },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
      letterSpacing: 0.2,
    },
    previewValue: {
      fontSize: 13.5,
      fontWeight: "700",
      color: theme.text,
      fontVariant: ["tabular-nums"],
    },
    previewDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${theme.text}12`,
      marginVertical: 2,
    },
    previewLabelBold: {
      fontSize: 12.5,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: 0.2,
    },
    previewValueBold: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"],
    },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.withdrawalSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.2),
    },
    errorText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: "600",
      color: SAVINGS.withdrawalDeep,
      lineHeight: 18,
    },

    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.mintSoft,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "500",
      color: SAVINGS.tealDark,
      lineHeight: 17,
    },

    submitWrap: {
      marginTop: SPACING.sm,
      borderRadius: RADIUS.lg,
      shadowColor: SAVINGS.withdrawal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
    },
    submitBtnText: {
      fontSize: 14.5,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
    cancelBtn: {
      paddingVertical: 13,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: `${theme.text}15`,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },
  });
}