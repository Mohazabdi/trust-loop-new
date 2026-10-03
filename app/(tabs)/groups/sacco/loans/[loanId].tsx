import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  HandCoins,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useMemberData } from "@/hooks/useMemberData";
import {
  useSaccoStorage,
  amortizeLoan,
} from "@/store/useSaccoStorage";
import type { LoanStatus } from "@/lib/types/sacco";

/* ------------------------------------------------------------------ */
/*  Design tokens — balanced claymorphism                             */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#D9E0EC",
  surface: "#F0F4FA",
  surfaceRaised: "#F7FAFE",
  sunken: "#C8D1DF",
  highlight: "#FFFFFF",
  shade: "rgba(71, 85, 105, 0.44)",
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
  navyTint: "#DDE4F0",
  amber: "#96632A",
  amberSoft: "#EBD8B8",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const formatMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

const STATUS_META: Record<
  LoanStatus,
  { label: string; color: string; soft: string }
> = {
  pending: { label: "Pending approval", color: ACCENT.amber, soft: ACCENT.amberSoft },
  approved: { label: "Approved", color: ACCENT.green, soft: ACCENT.greenSoft },
  declined: { label: "Declined", color: ACCENT.red, soft: ACCENT.redSoft },
  active: { label: "Active", color: ACCENT.purple, soft: ACCENT.purpleSoft },
  completed: { label: "Completed", color: ACCENT.green, soft: ACCENT.greenSoft },
};

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
  inset = false,
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}) {
  const offset = 4 + depth * 2;
  const drop = offset + 2;

  if (inset) {
    return (
      <View
        style={[
          {
            backgroundColor: color,
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: CLAY.hairline,
            shadowColor: highlight,
            shadowOffset: { width: -2, height: -2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
          },
          style,
        ]}
      >
        <View
          style={[
            {
              backgroundColor: color,
              borderRadius: radius,
              shadowColor: CLAY.shadeSoft,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 0.85,
              shadowRadius: 6,
            },
            bodyStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          shadowColor: shade,
          shadowOffset: { width: drop, height: drop },
          shadowOpacity: 1,
          shadowRadius: drop * 1.65,
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
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function LoanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    loanId?: string;
    sacco_id?: string;
    group_member_id?: string;
  }>();

  const { data: member } = useMemberData();
  const currentMemberId = params.group_member_id ?? member?.id ?? "";

  const sacco = useSaccoStorage((s) =>
    s.saccos.find((x) => x.sacco_id === params.sacco_id)
  );
  const loan = useMemo(
    () => sacco?.loans.find((l) => l.id === params.loanId),
    [sacco?.loans, params.loanId]
  );

  const decideLoan = useSaccoStorage((s) => s.decideLoan);
  const recordLoanRepayment = useSaccoStorage((s) => s.recordLoanRepayment);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayError, setRepayError] = useState("");
  const [comment, setComment] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const handleBack = useCallback(() => router.back(), [router]);

  /* ── Derived ────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isApplicant = loan?.member_row_id === myMemberRow?.id;

  const alreadyDecided = useMemo(
    () =>
      (loan?.approvals ?? []).some(
        (a) => a.member_row_id === myMemberRow?.id
      ),
    [loan?.approvals, myMemberRow?.id]
  );

  const canApprove =
    !!loan &&
    loan.status === "pending" &&
    !!myMemberRow &&
    !isApplicant &&
    !alreadyDecided;

  const quorum = sacco?.loan_approval_quorum ?? 3;
  const approvalCount = useMemo(
    () =>
      (loan?.approvals ?? []).filter((a) => a.decision === "approve").length,
    [loan?.approvals]
  );

  const totalRepaid = useMemo(
    () => (loan?.repayments ?? []).reduce((s, r) => s + r.amount, 0),
    [loan?.repayments]
  );

  const outstanding = useMemo(
    () => (loan ? Math.max(loan.amount - totalRepaid, 0) : 0),
    [loan, totalRepaid]
  );

  const schedule = useMemo(
    () =>
      loan
        ? amortizeLoan(loan.amount, loan.interest_rate, loan.duration_months)
        : [],
    [loan]
  );

  const totalInterest = useMemo(
    () => schedule.reduce((sum, row) => sum + row.interest, 0),
    [schedule]
  );

  const progressPct = useMemo(
    () =>
      loan && loan.amount > 0
        ? Math.min(Math.round((totalRepaid / loan.amount) * 100), 100)
        : 0,
    [loan, totalRepaid]
  );

  /* ── Handlers ───────────────────────────────────────────── */

  const handleApprove = () => {
    if (!sacco || !loan || !myMemberRow || !canApprove) return;
    Alert.alert(
      "Approve loan",
      `You are approving a loan of ${sacco.currency_code} ${formatMoney(
        loan.amount
      )} to ${loan.member_name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            decideLoan(sacco.sacco_id, loan.id, {
              member_row_id: myMemberRow.id,
              member_name:
                `${myMemberRow.first_name} ${myMemberRow.last_name}`.trim(),
              decision: "approve",
              comment: comment.trim() || undefined,
            });
            toast.success("Approved");
            setComment("");
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    if (!sacco || !loan || !myMemberRow) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    decideLoan(sacco.sacco_id, loan.id, {
      member_row_id: myMemberRow.id,
      member_name:
        `${myMemberRow.first_name} ${myMemberRow.last_name}`.trim(),
      decision: "decline",
      decline_reason: declineReason.trim(),
    });
    toast.success("Request declined");
    setDeclineOpen(false);
    setDeclineReason("");
  };

  const handleOpenRepay = () => {
    if (!loan) return;
    const suggested = Math.min(outstanding, Math.round(outstanding / 3));
    setRepayAmount(String(suggested));
    setRepayError("");
    setRepayOpen(true);
  };

  const handleConfirmRepay = () => {
    if (!sacco || !loan || !myMemberRow) return;
    const amt = Number(repayAmount);
    if (!repayAmount.trim() || isNaN(amt) || amt <= 0) {
      setRepayError("Enter a valid amount");
      return;
    }
    if (amt > outstanding) {
      setRepayError(
        `Amount exceeds outstanding balance of ${sacco.currency_code} ${formatMoney(
          outstanding
        )}`
      );
      return;
    }
    recordLoanRepayment(sacco.sacco_id, loan.id, {
      amount: amt,
      note: `${myMemberRow.first_name} ${myMemberRow.last_name}`.trim(),
    });
    toast.success("Repayment recorded");
    setRepayOpen(false);
  };

  /* ── Guards ─────────────────────────────────────────────── */

  if (!sacco || !loan) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <View style={styles.missingIcon}>
              <AlertTriangle
                size={24}
                color={ACCENT.navy}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.missingTitle}>Loan not found</Text>
            <Text style={styles.missingBody}>
              This loan is no longer available, or you don't have access to
              it.
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.md }}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.md}
                depth={1}
                highlight="rgba(255,255,255,0.32)"
                shade="rgba(15, 30, 60, 0.44)"
                bodyStyle={styles.missingCta}
              >
                <Text style={styles.missingCtaText}>Go back</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[loan.status];
  const isActive = loan.status === "active";

  /* ── Render ─────────────────────────────────────────────── */

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
          {/* ── Back row ─────────────────────────────────── */}
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

          {/* ── Status card ──────────────────────────────── */}
          <Clay bodyStyle={styles.statusCard}>
            <View
              style={[styles.statusPill, { backgroundColor: meta.soft }]}
            >
              {loan.status === "pending" ? (
                <Clock size={11} color={meta.color} strokeWidth={2.6} />
              ) : loan.status === "declined" ? (
                <XCircle size={11} color={meta.color} strokeWidth={2.6} />
              ) : loan.status === "completed" ? (
                <CheckCircle
                  size={11}
                  color={meta.color}
                  strokeWidth={2.6}
                />
              ) : (
                <HandCoins size={11} color={meta.color} strokeWidth={2.6} />
              )}
              <Text style={[styles.statusPillText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            <Text style={styles.amount}>
              {sacco.currency_code} {formatMoney(loan.amount)}
            </Text>

            <Text style={styles.amountSub}>
              {loan.member_name}
              {isApplicant ? " · you" : ""}
            </Text>
          </Clay>

          {/* ── Info card ────────────────────────────────── */}
          <Clay bodyStyle={styles.infoCard}>
            <InfoRow label="Purpose" value={loan.purpose} />
            <View style={styles.infoDivider} />
            <InfoRow
              label="Interest rate"
              value={`${loan.interest_rate}% reducing balance`}
            />
            <View style={styles.infoDivider} />
            <InfoRow
              label="Duration"
              value={`${loan.duration_months} months`}
            />
            <View style={styles.infoDivider} />
            <InfoRow label="Applied" value={formatDate(loan.applied_at)} />
            {loan.due_date ? (
              <>
                <View style={styles.infoDivider} />
                <InfoRow label="Due" value={formatDate(loan.due_date)} />
              </>
            ) : null}
          </Clay>

          {/* ── Pending — approval progress ──────────────── */}
          {loan.status === "pending" ? (
            <View style={styles.progressSection}>
              <SectionLabel>Progress</SectionLabel>
              <View style={styles.progressDotsRow}>
                {Array.from({ length: quorum }).map((_, i) => {
                  const done = i < approvalCount;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        done && {
                          backgroundColor: ACCENT.green,
                          borderColor: ACCENT.green,
                        },
                      ]}
                    >
                      {done ? (
                        <CheckCircle
                          size={14}
                          color="#fff"
                          strokeWidth={3}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <Text style={styles.progressHint}>
                {approvalCount}/{quorum} approvals ·{" "}
                {quorum - approvalCount} more needed
              </Text>
            </View>
          ) : null}

          {/* ── Active — repayment progress ───────────────── */}
          {isActive ? (
            <Clay bodyStyle={styles.repayProgress}>
              <View style={styles.repayHeader}>
                <Text style={styles.repayLabel}>Repaid</Text>
                <Text style={styles.repayValue}>
                  {sacco.currency_code} {formatMoney(totalRepaid)} of{" "}
                  {sacco.currency_code} {formatMoney(loan.amount)}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPct}%`,
                      backgroundColor: ACCENT.purple,
                    },
                  ]}
                />
              </View>
              <View style={styles.repayFooter}>
                <Text style={styles.repayFooterText}>
                  {progressPct}% complete
                </Text>
                <Text style={styles.repayFooterText}>
                  Outstanding {sacco.currency_code} {formatMoney(outstanding)}
                </Text>
              </View>
            </Clay>
          ) : null}

          {/* ── Repay CTA ────────────────────────────────── */}
          {isActive && isApplicant ? (
            <TouchableOpacity
              onPress={handleOpenRepay}
              activeOpacity={0.9}
            >
              <Clay
                color={ACCENT.purple}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(40, 25, 80, 0.42)"
                bodyStyle={styles.primaryBtn}
              >
                <ArrowUpCircle size={17} color="#fff" strokeWidth={2.4} />
                <Text style={styles.primaryBtnText}>Record repayment</Text>
              </Clay>
            </TouchableOpacity>
          ) : null}

          {/* ── Comment for approve ───────────────────────── */}
          {canApprove ? (
            <Clay bodyStyle={styles.fieldCard}>
              <Text style={styles.fieldLabel}>
                Comment{" "}
                <Text style={styles.fieldOptional}>(optional)</Text>
              </Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a short note for the record"
                  placeholderTextColor={CLAY.inkFaint}
                  style={styles.commentInput}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={140}
                />
              </Clay>
            </Clay>
          ) : null}

          {/* ── Approve / decline actions ─────────────────── */}
          {canApprove ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => setDeclineOpen(true)}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  radius={RADIUS.lg}
                  depth={0}
                  shade={CLAY.shadeSoft}
                  bodyStyle={styles.declineBtn}
                >
                  <ThumbsDown
                    size={16}
                    color={ACCENT.red}
                    strokeWidth={2.6}
                  />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Clay>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApprove}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  color={ACCENT.green}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(20, 50, 30, 0.40)"
                  bodyStyle={styles.approveBtn}
                >
                  <ThumbsUp size={16} color="#fff" strokeWidth={2.6} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </Clay>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Approvals list ────────────────────────────── */}
          {loan.approvals.length > 0 ? (
            <>
              <SectionLabel>Approvals & comments</SectionLabel>
              <Clay bodyStyle={styles.list}>
                {loan.approvals.map((a, i, arr) => {
                  const isLast = i === arr.length - 1;
                  const isApprove = a.decision === "approve";
                  const color = isApprove ? ACCENT.green : ACCENT.red;
                  const soft = isApprove
                    ? ACCENT.greenSoft
                    : ACCENT.redSoft;
                  return (
                    <View
                      key={a.id}
                      style={[
                        styles.approvalRow,
                        !isLast && styles.rowDivider,
                      ]}
                    >
                      <View
                        style={[
                          styles.approvalBadge,
                          { backgroundColor: soft },
                        ]}
                      >
                        {isApprove ? (
                          <CheckCircle
                            size={13}
                            color={color}
                            strokeWidth={2.6}
                          />
                        ) : (
                          <XCircle
                            size={13}
                            color={color}
                            strokeWidth={2.6}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={styles.approvalName}
                          numberOfLines={1}
                        >
                          {a.member_name}
                        </Text>
                        <Text style={styles.approvalMeta}>
                          {isApprove ? "Approved" : "Declined"} ·{" "}
                          {formatRelative(a.decided_at)}
                        </Text>
                        {a.comment ? (
                          <Text style={styles.approvalComment}>
                            "{a.comment}"
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </Clay>
            </>
          ) : null}

          {/* ── Decline reason ────────────────────────────── */}
          {loan.status === "declined" && loan.decline_reason ? (
            <Clay
              bodyStyle={[
                styles.declineBanner,
                { backgroundColor: ACCENT.redSoft },
              ]}
            >
              <XCircle size={15} color={ACCENT.red} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.declineBannerLabel}>Decline reason</Text>
                <Text style={styles.declineBannerText}>
                  {loan.decline_reason}
                </Text>
              </View>
            </Clay>
          ) : null}

          {/* ── Schedule (active / completed) ─────────────── */}
          {loan.status === "active" || loan.status === "completed" ? (
            <>
              <TouchableOpacity
                onPress={() => setScheduleOpen((v) => !v)}
                activeOpacity={0.9}
              >
                <Clay bodyStyle={styles.sectionToggle}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.sectionLabel}>
                      Repayment schedule
                    </Text>
                    <Text style={styles.sectionHelper}>
                      {schedule.length} months · {sacco.currency_code}{" "}
                      {formatMoney(totalInterest)} total interest
                    </Text>
                  </View>
                  {scheduleOpen ? (
                    <ChevronUp size={18} color={CLAY.inkSoft} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown
                      size={18}
                      color={CLAY.inkSoft}
                      strokeWidth={2.4}
                    />
                  )}
                </Clay>
              </TouchableOpacity>

              {scheduleOpen ? (
                <Clay bodyStyle={styles.scheduleTable}>
                  <View style={styles.scheduleHead}>
                    <Text style={[styles.scheduleHeadCell, { flex: 0.5 }]}>
                      #
                    </Text>
                    <Text style={[styles.scheduleHeadCell, { flex: 1.4 }]}>
                      Payment
                    </Text>
                    <Text style={[styles.scheduleHeadCell, { flex: 1 }]}>
                      Interest
                    </Text>
                    <Text style={[styles.scheduleHeadCell, { flex: 1.2 }]}>
                      Balance
                    </Text>
                  </View>
                  {schedule.map((row) => (
                    <View key={row.month} style={styles.scheduleRow}>
                      <Text style={[styles.scheduleCell, { flex: 0.5 }]}>
                        {row.month}
                      </Text>
                      <Text style={[styles.scheduleCell, { flex: 1.4 }]}>
                        {formatMoney(row.payment)}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleCell,
                          { flex: 1, color: ACCENT.amber },
                        ]}
                      >
                        {formatMoney(row.interest)}
                      </Text>
                      <Text style={[styles.scheduleCell, { flex: 1.2 }]}>
                        {formatMoney(row.balance)}
                      </Text>
                    </View>
                  ))}
                </Clay>
              ) : null}
            </>
          ) : null}

          {/* ── Repayments list ───────────────────────────── */}
          {loan.repayments.length > 0 ? (
            <>
              <SectionLabel>Repayments</SectionLabel>
              <Clay bodyStyle={styles.list}>
                {[...loan.repayments].reverse().map((r, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return (
                    <View
                      key={r.id}
                      style={[styles.row, !isLast && styles.rowDivider]}
                    >
                      <View
                        style={[
                          styles.rowIcon,
                          { backgroundColor: ACCENT.greenSoft },
                        ]}
                      >
                        <CheckCircle
                          size={14}
                          color={ACCENT.green}
                          strokeWidth={2.4}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.rowTitle}>Repayment</Text>
                        <Text style={styles.rowMeta}>
                          {formatRelative(r.paid_at)}
                        </Text>
                      </View>
                      <Text style={styles.rowAmount}>
                        +{sacco.currency_code} {formatMoney(r.amount)}
                      </Text>
                    </View>
                  );
                })}
              </Clay>
            </>
          ) : null}

          {/* ── Info banners ──────────────────────────────── */}
          {loan.status === "pending" && !canApprove && !isApplicant ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.infoBox}
            >
              <Clock size={13} color={CLAY.inkSoft} strokeWidth={2.4} />
              <Text style={styles.infoText}>
                {alreadyDecided
                  ? "You have already responded to this request."
                  : "Awaiting review by other SACCO members."}
              </Text>
            </Clay>
          ) : null}

          {loan.status === "pending" && isApplicant ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.infoBox}
            >
              <Clock size={13} color={CLAY.inkSoft} strokeWidth={2.4} />
              <Text style={styles.infoText}>
                You cannot approve your own request. Wait for {quorum} other
                members to approve.
              </Text>
            </Clay>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Repay modal ─────────────────────────────────────── */}
      <Modal
        visible={repayOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRepayOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRepayOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.purple }]}
            />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.modalEyebrow}>REPAY LOAN</Text>
                <Text style={styles.modalTitle}>
                  Outstanding {sacco.currency_code}{" "}
                  {formatMoney(outstanding)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRepayOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Amount</Text>
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={[
                styles.amountWrap,
                repayError && { borderColor: ACCENT.red },
              ]}
            >
              <Text style={styles.amountPrefix}>{sacco.currency_code}</Text>
              <TextInput
                style={styles.amountInput}
                value={repayAmount}
                onChangeText={(v) => {
                  setRepayAmount(v.replace(/[^0-9.]/g, ""));
                  setRepayError("");
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={CLAY.inkFaint}
                autoFocus
              />
            </Clay>
            {repayError ? (
              <Text style={styles.fieldError}>{repayError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={handleConfirmRepay}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.sm }}
            >
              <Clay
                color={ACCENT.purple}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(40, 25, 80, 0.42)"
                bodyStyle={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>
                  Record repayment
                </Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </Modal>

      {/* ── Decline modal ───────────────────────────────────── */}
      <Modal
        visible={declineOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDeclineOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.red }]}
            />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.modalEyebrow, { color: ACCENT.red }]}>
                  DECLINE LOAN
                </Text>
                <Text style={styles.modalTitle}>
                  Why are you declining?
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeclineOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelper}>
              The applicant will see this reason. Be specific and
              constructive.
            </Text>

            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="e.g. Requested amount exceeds the SACCO's liquidity"
                placeholderTextColor={CLAY.inkFaint}
                style={styles.declineInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
                maxLength={200}
              />
            </Clay>
            <Text style={styles.declineCount}>
              {declineReason.length}/200
            </Text>

            <TouchableOpacity
              onPress={handleDecline}
              activeOpacity={0.9}
              disabled={!declineReason.trim()}
              style={{ marginTop: SPACING.sm }}
            >
              <Clay
                color={ACCENT.red}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.28)"
                shade="rgba(60, 20, 20, 0.38)"
                bodyStyle={[
                  styles.modalPrimary,
                  !declineReason.trim() && { opacity: 0.55 },
                ]}
              >
                <ThumbsDown size={15} color="#fff" strokeWidth={2.4} />
                <Text style={styles.modalPrimaryText}>Decline request</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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

  /* Back row */
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

  /* Status card */
  statusCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  amount: {
    fontSize: 32,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    marginTop: SPACING.xs,
  },
  amountSub: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.inkSoft,
    letterSpacing: 0.1,
  },

  /* Info card */
  infoCard: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: CLAY.inkSoft,
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    textAlign: "right",
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
  },

  /* Section label */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.md,
    marginBottom: -SPACING.xs,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabelText: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLabel: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionHelper: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "500",
    marginTop: 2,
  },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },

  /* Approval progress */
  progressSection: { gap: SPACING.sm },
  progressDotsRow: { flexDirection: "row", gap: SPACING.sm },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CLAY.hairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  progressHint: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  /* Repay progress */
  repayProgress: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  repayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  repayLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  repayValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY.sunken,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  repayFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  repayFooterText: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "700",
  },

  /* Primary buttons */
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
    color: "#fff",
    letterSpacing: 0.1,
  },

  /* Fields */
  fieldCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  fieldGroup: { gap: SPACING.sm },
  fieldLabel: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fieldOptional: {
    fontWeight: "600",
    color: CLAY.inkFaint,
    textTransform: "none",
  },
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
  },
  commentInput: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "500",
    minHeight: 70,
    padding: 0,
  },

  /* Actions */
  actionsRow: { flexDirection: "row", gap: SPACING.md },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: ACCENT.redSoft,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT.red,
    letterSpacing: 0.2,
  },

  /* Lists */
  list: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  approvalBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  approvalName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  approvalMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  approvalComment: {
    fontSize: 12,
    color: CLAY.ink,
    fontWeight: "500",
    fontStyle: "italic",
    opacity: 0.9,
    marginTop: 4,
    lineHeight: 17,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  rowAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ACCENT.green,
    fontVariant: ["tabular-nums"],
  },

  /* Decline banner */
  declineBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  declineBannerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: ACCENT.red,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  declineBannerText: {
    fontSize: 13,
    color: CLAY.ink,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Schedule table */
  scheduleTable: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    paddingHorizontal: SPACING.md,
  },
  scheduleHead: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
  },
  scheduleHeadCell: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  scheduleRow: {
    flexDirection: "row",
    paddingVertical: SPACING.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CLAY.hairline,
  },
  scheduleCell: {
    fontSize: 12,
    fontWeight: "700",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
  },

  /* Info boxes */
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
    color: CLAY.inkSoft,
    lineHeight: 17,
  },

  /* Modals */
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
    padding: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.md,
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
  },
  modalEyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: ACCENT.purple,
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  modalHelper: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    fontWeight: "500",
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
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
    color: ACCENT.red,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -6,
  },
  declineInput: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "500",
    minHeight: 100,
    padding: 0,
  },
  declineCount: {
    fontSize: 10.5,
    color: CLAY.inkFaint,
    textAlign: "right",
    marginTop: -8,
    fontWeight: "600",
  },
  modalPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.1,
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.navySoft,
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
  missingCta: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  missingCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});