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

import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useSavingsStorage } from "@/store/useSavingsStorage";

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
 * Savings-specific muted accent plus withdrawal-specific tones.
 * Same hues used on the Savings Detail and Members screens, desaturated
 * to sit comfortably on the clay canvas instead of glowing off it.
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
  withdrawalTint: "#FCF0F0",
  withdrawalInk: "#7A3535",
  warning: "#C08A3E",
  warningSoft: "#F7EAD8",
  warningInk: "#7A5416",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

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

export default function SavingsWithdrawScreen() {
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
        `Exceeds available balance of ${plan.currency_code} ${formatMoney(
          availableBalance
        )}.`
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
        `This plan needs ${quorum} approvals, but only ${availableApprovers} other members are active. Invite more members first.`
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
            <Text style={styles.missingTitle}>Plan not found</Text>
            <Text style={styles.missingBody}>
              This savings plan is no longer available.
            </Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
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
          {/* ── Floating back row ──────────────────────── */}
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

          {/* ── Title block with floating bell ─────────── */}
          <View style={styles.titleBlock}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.eyebrow}>WITHDRAWAL REQUEST</Text>
              <Text style={styles.title} numberOfLines={2}>
                {plan.savings_name}
              </Text>
              <Text style={styles.subtitle}>
                Submit a request. It will be released once {quorum} members
                approve it.
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

          {/* ── Balance slab ───────────────────────────── */}
          <Clay
            color={SAVINGS.withdrawalTint}
            radius={RADIUS.xl}
            depth={1}
            bodyStyle={styles.balanceCard}
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
          </Clay>

          {/* ── Quorum banner ──────────────────────────── */}
          <Clay
            color={
              quorumReachable ? SAVINGS.tealTint : SAVINGS.warningSoft
            }
            radius={RADIUS.md}
            depth={0}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.quorumBox}
          >
            <ShieldCheck
              size={16}
              color={quorumReachable ? SAVINGS.tealInk : SAVINGS.warning}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.quorumText,
                {
                  color: quorumReachable
                    ? SAVINGS.tealInk
                    : SAVINGS.warningInk,
                },
              ]}
            >
              {quorumReachable
                ? `Needs ${quorum} approvals from ${availableApprovers} members`
                : `Not enough active members. Need ${quorum} approvers.`}
            </Text>
          </Clay>

          {/* ── Amount ─────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Amount to withdraw</Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[
                styles.amountWrap,
                exceedsBalance && { borderColor: SAVINGS.withdrawal },
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
                placeholderTextColor={CLAY.inkFaint}
                autoFocus
              />
            </Clay>

            {quickAmounts.length > 0 ? (
              <View style={styles.quickRow}>
                {quickAmounts.map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => {
                      setAmount(String(v));
                      setError("");
                    }}
                    activeOpacity={0.9}
                  >
                    <Clay
                      color={SAVINGS.tealTint}
                      radius={RADIUS.md}
                      depth={0}
                      shade={CLAY.shadeSoft}
                      bodyStyle={styles.quickChip}
                    >
                      <Text style={styles.quickChipText}>
                        {formatMoney(v)}
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setAmount(String(availableBalance));
                    setError("");
                  }}
                  activeOpacity={0.9}
                >
                  <Clay
                    color={SAVINGS.withdrawal}
                    radius={RADIUS.md}
                    depth={0}
                    highlight="rgba(255,255,255,0.30)"
                    shade="rgba(120, 40, 40, 0.32)"
                    bodyStyle={styles.quickChip}
                  >
                    <Text style={[styles.quickChipText, { color: "#FFFFFF" }]}>
                      Max
                    </Text>
                  </Clay>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* ── Reason ─────────────────────────────────── */}
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
                    activeOpacity={0.9}
                  >
                    <Clay
                      color={selected ? SAVINGS.withdrawalSoft : CLAY.sunken}
                      radius={RADIUS.md}
                      depth={selected ? 1 : 0}
                      highlight={
                        selected
                          ? "rgba(255,255,255,0.32)"
                          : CLAY.highlight
                      }
                      shade={
                        selected
                          ? "rgba(120, 40, 40, 0.28)"
                          : CLAY.shadeSoft
                      }
                      bodyStyle={styles.reasonChip}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          selected && styles.reasonChipTextSelected,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Note ───────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Note <Text style={styles.fieldOptional}>(optional)</Text>
            </Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[styles.inputWell, styles.textAreaWell]}
            >
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Paid school fees for 3 members"
                placeholderTextColor={CLAY.inkFaint}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={120}
              />
            </Clay>
            <Text style={styles.noteCount}>{note.length}/120</Text>
          </View>

          {/* ── Preview ────────────────────────────────── */}
          {isValidAmount ? (
            <Clay bodyStyle={styles.previewCard}>
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
            </Clay>
          ) : null}

          {/* ── Error ──────────────────────────────────── */}
          {error ? (
            <Clay
              color={SAVINGS.withdrawalSoft}
              radius={RADIUS.md}
              depth={0}
              shade="rgba(120, 40, 40, 0.22)"
              bodyStyle={styles.errorBox}
            >
              <AlertTriangle
                size={14}
                color={SAVINGS.withdrawal}
                strokeWidth={2.6}
              />
              <Text style={styles.errorText}>{error}</Text>
            </Clay>
          ) : null}

          {/* ── Info ───────────────────────────────────── */}
          <Clay
            color={SAVINGS.tealTint}
            radius={RADIUS.md}
            depth={0}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.infoBox}
          >
            <Info size={14} color={SAVINGS.tealInk} strokeWidth={2.4} />
            <Text style={styles.infoText}>
              All members will be notified. The request is released only when{" "}
              {quorum} members approve. You cannot approve your own request.
            </Text>
          </Clay>

          {/* ── Submit ─────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={!isValidAmount || !reason || !quorumReachable}
            style={styles.submitWrap}
          >
            <Clay
              color={SAVINGS.withdrawal}
              radius={RADIUS.lg}
              depth={2}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(120, 40, 40, 0.42)"
              bodyStyle={[
                styles.submitBtn,
                (!isValidAmount || !reason || !quorumReachable) && {
                  opacity: 0.55,
                },
              ]}
            >
              <Send size={16} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.submitBtnText}>
                {parsedAmount > 0
                  ? `Request ${plan.currency_code} ${formatMoney(parsedAmount)}`
                  : "Send request"}
              </Text>
            </Clay>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.9}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },

  /* Floating back row */
  backRow: {
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
  },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: SAVINGS.withdrawal,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: "500",
    maxWidth: 320,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Balance slab */
  balanceCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: "rgba(207, 107, 107, 0.16)",
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
    color: SAVINGS.withdrawalInk,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  balanceMeta: {
    fontSize: 12,
    color: SAVINGS.withdrawalInk,
    opacity: 0.75,
    fontWeight: "600",
  },

  /* Quorum banner */
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

  /* Fields */
  fieldGroup: { gap: SPACING.sm },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldOptional: { fontWeight: "600", color: CLAY.inkFaint, textTransform: "none" },

  /* Amount well */
  amountWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
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
    fontSize: 28,
    fontWeight: "800",
    color: CLAY.ink,
    padding: 0,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },

  /* Quick chips */
  quickRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: 2,
    flexWrap: "wrap",
  },
  quickChip: {
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    minWidth: 70,
    alignItems: "center",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: SAVINGS.tealInk,
    fontVariant: ["tabular-nums"],
  },

  /* Reason chips */
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  reasonChip: {
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  reasonChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  reasonChipTextSelected: {
    color: SAVINGS.withdrawal,
    fontWeight: "800",
  },

  /* Note well */
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  textAreaWell: {
    paddingVertical: SPACING.md,
  },
  input: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "600",
    padding: 0,
    minHeight: 26,
  },
  textArea: {
    minHeight: 66,
    textAlignVertical: "top",
  },
  noteCount: {
    fontSize: 10.5,
    color: CLAY.inkFaint,
    textAlign: "right",
    marginTop: -2,
    fontWeight: "600",
  },

  /* Preview */
  previewCard: {
    padding: SPACING.md + 4,
    borderRadius: RADIUS.lg,
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
    color: CLAY.inkSoft,
    letterSpacing: 0.2,
  },
  previewValue: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
  },
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
    marginVertical: 4,
  },
  previewLabelBold: {
    fontSize: 12.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.2,
  },
  previewValueBold: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },

  /* Error */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: SAVINGS.withdrawalInk,
    lineHeight: 18,
  },

  /* Info */
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: SAVINGS.tealInk,
    lineHeight: 17,
  },

  /* Submit + cancel */
  submitWrap: {
    marginTop: SPACING.sm,
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
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  cancelBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    backgroundColor: CLAY.sunken,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: CLAY.ink,
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
});