import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
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
  Calendar,
  ChevronLeft,
  HandCoins,
  Info,
  Percent,
  TrendingUp,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useMemberData } from "@/hooks/useMemberData";
import {
  useSaccoStorage,
  netShareCapitalForMember,
  emiFor,
  amortizeLoan,
} from "@/store/useSaccoStorage";
import { SACCO_LOAN_DEFAULTS } from "@/lib/config/sacco.config";

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

const DURATION_OPTIONS = [6, 12, 24, 36] as const;

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

export default function ApplyForLoanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sacco_id?: string;
    group_member_id?: string;
  }>();

  const { data: member } = useMemberData();
  const currentMemberId = params.group_member_id ?? member?.id ?? "";

  const sacco = useSaccoStorage((s) =>
    s.saccos.find((x) => x.sacco_id === params.sacco_id)
  );
  const applyForLoan = useSaccoStorage((s) => s.applyForLoan);

  /* ── Form ────────────────────────────────────────────────── */
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState<number>(
    SACCO_LOAN_DEFAULTS.DURATION_MONTHS
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    purpose?: string;
  }>({});

  /* ── Derived ─────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const myShareCapital = useMemo(
    () =>
      sacco && myMemberRow
        ? netShareCapitalForMember(sacco, myMemberRow.id)
        : 0,
    [sacco, myMemberRow]
  );

  const borrowingCeiling = useMemo(
    () => myShareCapital * SACCO_LOAN_DEFAULTS.BORROWING_MULTIPLIER,
    [myShareCapital]
  );

  const totalSaccoCapital = useMemo(
    () =>
      (sacco?.share_purchases ?? []).reduce((s, p) => s + p.total_value, 0),
    [sacco?.share_purchases]
  );

  const parsedAmount = Number(amount) || 0;
  const interestRate = SACCO_LOAN_DEFAULTS.INTEREST_RATE;
  const emi = useMemo(
    () =>
      parsedAmount > 0 ? emiFor(parsedAmount, interestRate, duration) : 0,
    [parsedAmount, interestRate, duration]
  );

  const totalRepayment = useMemo(
    () => (parsedAmount > 0 ? emi * duration : 0),
    [emi, duration, parsedAmount]
  );

  const totalInterest = Math.max(totalRepayment - parsedAmount, 0);

  const schedule = useMemo(
    () =>
      parsedAmount > 0 ? amortizeLoan(parsedAmount, interestRate, duration) : [],
    [parsedAmount, interestRate, duration]
  );

  const overBorrowingCeiling =
    parsedAmount > borrowingCeiling && myShareCapital > 0;
  const exceedsSaccoCapital = parsedAmount > totalSaccoCapital;

  /* ── Handlers ────────────────────────────────────────────── */

  const handleBack = useCallback(() => router.back(), [router]);

  const validate = (): { amount?: string; purpose?: string } => {
    const e: { amount?: string; purpose?: string } = {};
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0)
      e.amount = "Enter a valid amount.";
    else if (parsedAmount < 1000) e.amount = "Minimum loan is 1,000.";
    if (!purpose.trim()) e.purpose = "Please describe the purpose.";
    else if (purpose.trim().length < 10)
      e.purpose = "Please add at least 10 characters.";
    return e;
  };

  const handleSubmit = () => {
    if (!sacco || !myMemberRow) {
      toast.error("Missing SACCO membership");
      return;
    }

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (exceedsSaccoCapital) {
      Alert.alert(
        "Amount too large",
        `The SACCO has only ${sacco.currency_code} ${formatMoney(
          totalSaccoCapital
        )} in share capital. Reduce the amount.`
      );
      return;
    }

    const commit = () => {
      setSubmitting(true);
      try {
        const loan = applyForLoan(sacco.sacco_id, {
          member_row_id: myMemberRow.id,
          member_name:
            `${myMemberRow.first_name} ${myMemberRow.last_name}`.trim(),
          amount: parsedAmount,
          interest_rate: interestRate,
          duration_months: duration,
          purpose: purpose.trim(),
        });

        toast.success("Loan request sent");
        router.replace({
          pathname: "/(tabs)/groups/sacco/loans/[loanId]",
          params: {
            loanId: loan.id,
            sacco_id: sacco.sacco_id,
            group_member_id: currentMemberId,
          },
        });
      } catch (err: any) {
        toast.error(err?.message ?? "Could not submit request");
      } finally {
        setSubmitting(false);
      }
    };

    if (overBorrowingCeiling) {
      Alert.alert(
        "Above suggested ceiling",
        `Your share capital is ${sacco.currency_code} ${formatMoney(
          myShareCapital
        )}. The recommended ceiling is ${
          SACCO_LOAN_DEFAULTS.BORROWING_MULTIPLIER
        }× that (${sacco.currency_code} ${formatMoney(
          borrowingCeiling
        )}).\n\nYou can still submit, but the committee may decline.`,
        [
          { text: "Adjust", style: "cancel" },
          { text: "Submit anyway", style: "destructive", onPress: commit },
        ]
      );
      return;
    }

    commit();
  };

  /* ── Guards ──────────────────────────────────────────────── */

  if (!sacco) {
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
            <Text style={styles.missingTitle}>SACCO not found</Text>
            <Text style={styles.missingBody}>
              This SACCO is no longer available, or you don't have access to
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

  if (!myMemberRow) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <View
              style={[
                styles.missingIcon,
                { backgroundColor: ACCENT.redSoft },
              ]}
            >
              <AlertTriangle
                size={24}
                color={ACCENT.red}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.missingTitle}>Members only</Text>
            <Text style={styles.missingBody}>
              Only active members can apply for a loan.
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

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
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

          {/* ── Header ───────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>NEW REQUEST</Text>
            <Text style={styles.title}>Loan application</Text>
            <Text style={styles.subtitle}>
              Fill in the details. The loan committee will review and{" "}
              {sacco.loan_approval_quorum} approvals are needed before
              disbursement.
            </Text>
          </View>

          {/* ── Amount ───────────────────────────────────── */}
          <Clay bodyStyle={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Amount ({sacco.currency_code})
            </Text>
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={[
                styles.amountWrap,
                errors.amount && { borderColor: ACCENT.red },
              ]}
            >
              <Text style={styles.amountPrefix}>{sacco.currency_code}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.]/g, ""));
                  setErrors((p) => ({ ...p, amount: undefined }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={CLAY.inkFaint}
                editable={!submitting}
                autoFocus
              />
            </Clay>
            {errors.amount ? (
              <Text style={styles.fieldError}>{errors.amount}</Text>
            ) : (
              <Text style={styles.helperText}>
                Your share capital is {sacco.currency_code}{" "}
                {formatMoney(myShareCapital)} · Suggested ceiling{" "}
                {sacco.currency_code} {formatMoney(borrowingCeiling)}
              </Text>
            )}
          </Clay>

          {/* ── Purpose ──────────────────────────────────── */}
          <Clay bodyStyle={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Purpose</Text>
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={[
                styles.inputWell,
                errors.purpose && { borderColor: ACCENT.red },
              ]}
            >
              <TextInput
                value={purpose}
                onChangeText={(v) => {
                  setPurpose(v);
                  setErrors((p) => ({ ...p, purpose: undefined }));
                }}
                editable={!submitting}
                placeholder="e.g. Restock for my shop before school reopening"
                placeholderTextColor={CLAY.inkFaint}
                style={styles.purposeInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={200}
              />
            </Clay>
            {errors.purpose ? (
              <Text style={styles.fieldError}>{errors.purpose}</Text>
            ) : (
              <Text style={styles.helperText}>{purpose.length}/200</Text>
            )}
          </Clay>

          {/* ── Duration ─────────────────────────────────── */}
          <Clay bodyStyle={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Repayment duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((months) => {
                const selected = duration === months;
                return (
                  <TouchableOpacity
                    key={months}
                    onPress={() => setDuration(months)}
                    activeOpacity={0.9}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  >
                    <Clay
                      color={selected ? ACCENT.purple : CLAY.sunken}
                      radius={RADIUS.md}
                      depth={selected ? 1 : 0}
                      highlight={
                        selected
                          ? "rgba(255,255,255,0.30)"
                          : CLAY.highlight
                      }
                      shade={
                        selected
                          ? "rgba(40, 25, 80, 0.40)"
                          : CLAY.shadeSoft
                      }
                      bodyStyle={styles.durationOption}
                    >
                      <Text
                        style={[
                          styles.durationLabel,
                          selected && styles.durationLabelSelected,
                        ]}
                      >
                        {months}
                      </Text>
                      <Text
                        style={[
                          styles.durationHelper,
                          selected && styles.durationHelperSelected,
                        ]}
                      >
                        months
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Clay>

          {/* ── Rate (read-only) ─────────────────────────── */}
          <Clay bodyStyle={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Interest rate</Text>
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.readonlyBox}
            >
              <View style={styles.readonlyIcon}>
                <Percent size={14} color={ACCENT.navy} strokeWidth={2.6} />
              </View>
              <Text style={styles.readonlyValue}>
                {interestRate}% per year, reducing balance
              </Text>
            </Clay>
          </Clay>

          {/* ── Live preview ─────────────────────────────── */}
          {parsedAmount > 0 && !exceedsSaccoCapital ? (
            <Clay bodyStyle={styles.previewCard}>
              <View style={styles.previewHeader}>
                <TrendingUp
                  size={14}
                  color={ACCENT.purple}
                  strokeWidth={2.6}
                />
                <Text style={styles.previewHeaderText}>
                  If approved, here's what you'll pay
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Monthly payment</Text>
                <Text style={styles.previewValue}>
                  {sacco.currency_code} {formatMoney(emi)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Total interest</Text>
                <Text
                  style={[styles.previewValue, { color: ACCENT.amber }]}
                >
                  {sacco.currency_code} {formatMoney(totalInterest)}
                </Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabelBold}>Total repayment</Text>
                <Text style={styles.previewValueBold}>
                  {sacco.currency_code} {formatMoney(totalRepayment)}
                </Text>
              </View>
            </Clay>
          ) : null}

          {/* ── Warning if exceeds SACCO capital ─────────── */}
          {exceedsSaccoCapital ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={ACCENT.redSoft}
              shade="rgba(120, 40, 40, 0.32)"
              bodyStyle={styles.warnBox}
            >
              <AlertTriangle size={14} color={ACCENT.red} strokeWidth={2.6} />
              <Text style={styles.warnText}>
                Amount exceeds the SACCO's total share capital of{" "}
                {sacco.currency_code} {formatMoney(totalSaccoCapital)}.
              </Text>
            </Clay>
          ) : null}

          {/* ── Info note ────────────────────────────────── */}
          <Clay
            inset
            radius={RADIUS.md}
            color={CLAY.sunken}
            bodyStyle={styles.infoBox}
          >
            <Info size={14} color={ACCENT.navy} strokeWidth={2.6} />
            <Text style={styles.infoText}>
              After submission, {sacco.loan_approval_quorum} members of the
              SACCO must approve before funds are disbursed. You cannot
              approve your own request.
            </Text>
          </Clay>

          {/* ── Actions ──────────────────────────────────── */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              <Clay
                color={ACCENT.purple}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(40, 25, 80, 0.42)"
                bodyStyle={[
                  styles.primaryBtn,
                  submitting && { opacity: 0.7 },
                ]}
              >
                <HandCoins size={17} color="#fff" strokeWidth={2.6} />
                <Text style={styles.primaryBtnText}>
                  {submitting ? "Submitting…" : "Submit request"}
                </Text>
              </Clay>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBack}
              disabled={submitting}
              activeOpacity={0.9}
              style={[
                styles.secondaryBtn,
                submitting && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* ── Schedule preview ─────────────────────────── */}
          {schedule.length > 0 && !exceedsSaccoCapital ? (
            <>
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionLabelText}>
                  Payment schedule preview
                </Text>
              </View>

              <Clay bodyStyle={styles.schedulePreview}>
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
                {schedule.slice(0, 6).map((row) => (
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
                {schedule.length > 6 ? (
                  <View style={styles.scheduleMore}>
                    <Calendar
                      size={12}
                      color={CLAY.inkSoft}
                      strokeWidth={2.4}
                    />
                    <Text style={styles.scheduleMoreText}>
                      {schedule.length - 6} more month
                      {schedule.length - 6 === 1 ? "" : "s"}
                    </Text>
                  </View>
                ) : null}
              </Clay>
            </>
          ) : null}
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
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
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

  /* Header */
  header: { paddingTop: SPACING.sm, paddingBottom: SPACING.md, gap: 4 },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: ACCENT.purple,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: "500",
  },

  /* Field cards */
  fieldCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  helperText: {
    fontSize: TYPE.caption,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },
  fieldError: {
    fontSize: 11.5,
    fontWeight: "700",
    color: ACCENT.red,
  },

  /* Amount well */
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

  /* Purpose well */
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md,
  },
  purposeInput: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "600",
    minHeight: 72,
    padding: 0,
  },

  /* Duration */
  durationRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  durationOption: {
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
    alignItems: "center",
    gap: 2,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  durationLabelSelected: {
    color: "#FFFFFF",
  },
  durationHelper: {
    fontSize: 9.5,
    color: CLAY.inkFaint,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  durationHelperSelected: {
    color: "rgba(255,255,255,0.85)",
  },

  /* Read-only rate well */
  readonlyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  readonlyIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: ACCENT.navySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  readonlyValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
  },

  /* Live preview */
  previewCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  previewHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: ACCENT.purple,
    letterSpacing: -0.1,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  previewLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },
  previewValue: {
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.2,
  },
  previewValueBold: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },

  /* Warning well (exceeds SACCO capital) */
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  warnText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: ACCENT.red,
    lineHeight: 18,
  },

  /* Info well */
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
    lineHeight: 17,
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
  },

  /* Section label */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
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

  /* Schedule */
  schedulePreview: {
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
  scheduleMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CLAY.hairline,
  },
  scheduleMoreText: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "700",
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