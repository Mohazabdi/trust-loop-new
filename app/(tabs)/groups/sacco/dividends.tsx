import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  Info,
  Plus,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useMemberData } from "@/hooks/useMemberData";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import { SACCO_DIVIDEND_DEFAULTS } from "@/lib/config/sacco.config";
import type { SaccoDividendDeclaration } from "@/lib/types/sacco";

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

export default function SaccoDividendsScreen() {
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
  const declareDividends = useSaccoStorage((s) => s.declareDividends);

  const [refreshing, setRefreshing] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [rateShares, setRateShares] = useState(
    String(SACCO_DIVIDEND_DEFAULTS.RATE_ON_SHARES)
  );
  const [rebateDeposits, setRebateDeposits] = useState(
    String(SACCO_DIVIDEND_DEFAULTS.REBATE_ON_DEPOSITS)
  );
  const [errors, setErrors] = useState<{
    year?: string;
    rateShares?: string;
    rebateDeposits?: string;
  }>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleBack = useCallback(() => router.back(), [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  /* ── Derived ─────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isAdmin = useMemo(() => {
    const role = myMemberRow?.role;
    return role === "admin" || sacco?.created_by_id === currentMemberId;
  }, [myMemberRow?.role, sacco?.created_by_id, currentMemberId]);

  const declarations = useMemo(
    () =>
      [...(sacco?.dividend_declarations ?? [])].sort(
        (a, b) => b.year - a.year
      ),
    [sacco?.dividend_declarations]
  );

  const myTotalEarned = useMemo(() => {
    if (!sacco || !myMemberRow) return 0;
    return (sacco.dividend_declarations ?? []).reduce((sum, d) => {
      const allocation = d.allocations.find(
        (a) => a.member_row_id === myMemberRow.id
      );
      return sum + (allocation?.net_payout ?? 0);
    }, 0);
  }, [sacco, myMemberRow]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Handlers ────────────────────────────────────────────── */

  const handleOpenDeclare = () => {
    setYear(String(new Date().getFullYear() - 1));
    setRateShares(String(SACCO_DIVIDEND_DEFAULTS.RATE_ON_SHARES));
    setRebateDeposits(String(SACCO_DIVIDEND_DEFAULTS.REBATE_ON_DEPOSITS));
    setErrors({});
    setDeclareOpen(true);
  };

  const handleDeclare = () => {
    if (!sacco) return;

    const e: typeof errors = {};
    const y = Number(year);
    const rs = Number(rateShares);
    const rd = Number(rebateDeposits);

    if (!year.trim() || isNaN(y) || y < 2000 || y > 2100)
      e.year = "Enter a valid year (e.g. 2026).";
    if (rateShares.trim() && (isNaN(rs) || rs < 0 || rs > 100))
      e.rateShares = "Rate must be between 0 and 100.";
    if (rebateDeposits.trim() && (isNaN(rd) || rd < 0 || rd > 100))
      e.rebateDeposits = "Rebate must be between 0 and 100.";

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (sacco.dividend_declarations.some((d) => d.year === y)) {
      Alert.alert(
        "Already declared",
        `A dividend declaration for ${y} already exists. Delete it first if you need to revise.`
      );
      return;
    }

    Alert.alert(
      "Declare dividends",
      `Year ${y}\nRate on shares: ${rs}%\nRebate on deposits: ${rd}%\n\nThis will compute payouts for all active members.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Declare",
          onPress: () => {
            const decl = declareDividends(sacco.sacco_id, {
              year: y,
              rate_on_shares: rs,
              rebate_on_deposits: rd,
            });
            if (decl) {
              toast.success(`Dividends declared for ${y}`);
              setDeclareOpen(false);
            } else {
              toast.error("Could not declare dividends");
            }
          },
        },
      ]
    );
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

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
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

        {/* ── Identity ─────────────────────────────────── */}
        <View style={styles.identity}>
          <SaccoBadge
            category={sacco.sasra_license_category}
            verified={!!sacco.sasra_verified_at}
            size="sm"
          />
          <Text style={styles.groupName} numberOfLines={2}>
            {sacco.group_name}
          </Text>
          <Text style={styles.subtitle}>
            Year-end distributions paid on share capital and deposits
          </Text>
        </View>

        {/* ── My earnings hero ─────────────────────────── */}
        <Clay
          color={ACCENT.green}
          radius={RADIUS.xl}
          depth={2}
          highlight="rgba(255,255,255,0.32)"
          shade="rgba(15, 45, 30, 0.44)"
          style={styles.heroWrap}
          bodyStyle={styles.hero}
        >
          <View style={styles.heroEyebrowRow}>
            <Coins size={12} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.heroEyebrow}>MY TOTAL EARNINGS</Text>
          </View>
          <Text style={styles.heroAmount} numberOfLines={1}>
            {sacco.currency_code} {formatMoney(myTotalEarned)}
          </Text>
          <Text style={styles.heroMeta}>
            From {declarations.length} declaration
            {declarations.length === 1 ? "" : "s"}
          </Text>
        </Clay>

        {/* ── Admin CTA ────────────────────────────────── */}
        {isAdmin ? (
          <TouchableOpacity
            onPress={handleOpenDeclare}
            activeOpacity={0.9}
            style={styles.ctaWrap}
          >
            <Clay
              color={ACCENT.green}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(20, 50, 30, 0.40)"
              bodyStyle={styles.primaryBtn}
            >
              <Plus size={17} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.primaryBtnText}>Declare dividends</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── Info strip ───────────────────────────────── */}
        <View style={styles.infoWrap}>
          <Clay
            inset
            radius={RADIUS.md}
            color={CLAY.sunken}
            bodyStyle={styles.infoBox}
          >
            <Info size={14} color={ACCENT.navy} strokeWidth={2.6} />
            <Text style={styles.infoText}>
              Dividends are paid on share capital. Rebates are paid on member
              deposits. Both are subject to{" "}
              {SACCO_DIVIDEND_DEFAULTS.WITHHOLDING_TAX}% withholding tax.
            </Text>
          </Clay>
        </View>

        {/* ── Section header ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>Declarations</Text>
          </View>
          <View
            style={[
              styles.sectionCountPill,
              { backgroundColor: ACCENT.greenSoft },
            ]}
          >
            <Text
              style={[styles.sectionCountText, { color: ACCENT.green }]}
            >
              {declarations.length}
            </Text>
          </View>
        </View>

        {/* ── Declarations list ────────────────────────── */}
        {declarations.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Coins size={22} color={ACCENT.green} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyCardText}>
                {isAdmin
                  ? "No dividends declared yet. Declare them at year-end after the AGM approves the rates."
                  : "No dividends have been declared yet. Check back after the AGM."}
              </Text>
            </Clay>
          </View>
        ) : (
          <View style={styles.declListWrap}>
            {declarations.map((d) => {
              const isOpen = expanded.has(d.id);
              const myAllocation = myMemberRow
                ? d.allocations.find(
                    (a) => a.member_row_id === myMemberRow.id
                  )
                : undefined;

              return (
                <Clay key={d.id} bodyStyle={styles.declCard}>
                  <TouchableOpacity
                    onPress={() => toggleExpand(d.id)}
                    activeOpacity={0.9}
                    style={styles.declHeader}
                  >
                    <View style={styles.declYearBox}>
                      <Text style={styles.declYearText}>{d.year}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.declTitle}>
                        {d.rate_on_shares}% on shares
                        {d.rebate_on_deposits > 0
                          ? ` · ${d.rebate_on_deposits}% rebate`
                          : ""}
                      </Text>
                      <Text style={styles.declMeta}>
                        {d.allocations.length} member
                        {d.allocations.length === 1 ? "" : "s"} ·{" "}
                        {formatDate(d.declared_at)}
                      </Text>
                    </View>
                    {isOpen ? (
                      <ChevronUp
                        size={16}
                        color={CLAY.inkFaint}
                        strokeWidth={2.4}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        color={CLAY.inkFaint}
                        strokeWidth={2.4}
                      />
                    )}
                  </TouchableOpacity>

                  {myAllocation ? (
                    <View style={styles.myAllocation}>
                      <Text style={styles.myAllocLabel}>Your payout</Text>
                      <Text style={styles.myAllocValue}>
                        {sacco.currency_code}{" "}
                        {formatMoney(myAllocation.net_payout)}
                      </Text>
                    </View>
                  ) : null}

                  {isOpen ? (
                    <View style={styles.allocList}>
                      {d.allocations.map((a, i) => {
                        const isLast = i === d.allocations.length - 1;
                        const isMe = myMemberRow?.id === a.member_row_id;
                        return (
                          <View
                            key={`${d.id}-${a.member_row_id}`}
                            style={[
                              styles.allocRow,
                              !isLast && styles.allocRowDivider,
                              isMe && styles.allocRowMe,
                            ]}
                          >
                            <Text
                              style={styles.allocName}
                              numberOfLines={1}
                            >
                              {a.member_name}
                              {isMe ? " · you" : ""}
                            </Text>
                            <Text style={styles.allocAmount}>
                              {sacco.currency_code}{" "}
                              {formatMoney(a.net_payout)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </Clay>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Declare modal ──────────────────────────────────── */}
      <Modal
        visible={declareOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclareOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDeclareOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: ACCENT.green },
                ]}
              />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.modalEyebrow}>DECLARE DIVIDENDS</Text>
                  <Text style={styles.modalTitle}>Year-end distribution</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDeclareOpen(false)}
                  hitSlop={10}
                >
                  <X size={20} color={CLAY.ink} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHelper}>
                Payouts are computed from each member's share capital. This
                creates a permanent record visible to everyone.
              </Text>

              {/* Year */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Year</Text>
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={[
                    styles.inputWell,
                    errors.year && { borderColor: ACCENT.red },
                  ]}
                >
                  <TextInput
                    value={year}
                    onChangeText={(v) => {
                      setYear(v.replace(/[^0-9]/g, ""));
                      setErrors((p) => ({ ...p, year: undefined }));
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="2026"
                    placeholderTextColor={CLAY.inkFaint}
                    maxLength={4}
                  />
                </Clay>
                {errors.year ? (
                  <Text style={styles.fieldError}>{errors.year}</Text>
                ) : null}
              </View>

              {/* Rates row */}
              <View style={styles.fieldRow}>
                <View style={{ flex: 1, gap: SPACING.sm }}>
                  <Text style={styles.fieldLabel}>Rate on shares (%)</Text>
                  <Clay
                    inset
                    radius={RADIUS.md}
                    color={CLAY.sunken}
                    bodyStyle={[
                      styles.inputWell,
                      errors.rateShares && { borderColor: ACCENT.red },
                    ]}
                  >
                    <TextInput
                      value={rateShares}
                      onChangeText={(v) => {
                        setRateShares(v.replace(/[^0-9.]/g, ""));
                        setErrors((p) => ({
                          ...p,
                          rateShares: undefined,
                        }));
                      }}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="15"
                      placeholderTextColor={CLAY.inkFaint}
                    />
                  </Clay>
                  {errors.rateShares ? (
                    <Text style={styles.fieldError}>
                      {errors.rateShares}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flex: 1, gap: SPACING.sm }}>
                  <Text style={styles.fieldLabel}>Rebate (%)</Text>
                  <Clay
                    inset
                    radius={RADIUS.md}
                    color={CLAY.sunken}
                    bodyStyle={[
                      styles.inputWell,
                      errors.rebateDeposits && {
                        borderColor: ACCENT.red,
                      },
                    ]}
                  >
                    <TextInput
                      value={rebateDeposits}
                      onChangeText={(v) => {
                        setRebateDeposits(v.replace(/[^0-9.]/g, ""));
                        setErrors((p) => ({
                          ...p,
                          rebateDeposits: undefined,
                        }));
                      }}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="10"
                      placeholderTextColor={CLAY.inkFaint}
                    />
                  </Clay>
                  {errors.rebateDeposits ? (
                    <Text style={styles.fieldError}>
                      {errors.rebateDeposits}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Tax note */}
              <Clay
                inset
                radius={RADIUS.md}
                color={ACCENT.amberSoft}
                shade="rgba(120, 80, 20, 0.28)"
                bodyStyle={styles.modalNote}
              >
                <Text style={styles.modalNoteText}>
                  {SACCO_DIVIDEND_DEFAULTS.WITHHOLDING_TAX}% withholding tax
                  is deducted automatically.
                </Text>
              </Clay>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleDeclare}
                activeOpacity={0.9}
                style={{ marginTop: SPACING.sm }}
              >
                <Clay
                  color={ACCENT.green}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.30)"
                  shade="rgba(20, 50, 30, 0.40)"
                  bodyStyle={styles.modalPrimary}
                >
                  <Text style={styles.modalPrimaryText}>
                    Declare dividends
                  </Text>
                </Clay>
              </TouchableOpacity>
            </Clay>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  /* Back row */
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

  /* Identity */
  identity: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  groupName: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Hero — my earnings */
  heroWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  hero: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: 6,
  },
  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#FFFFFF",
    opacity: 0.85,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.78,
    fontWeight: "600",
  },

  /* Primary CTA */
  ctaWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Info well */
  infoWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
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

  /* Section header */
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
    height: 15,
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

  /* Declaration list */
  declListWrap: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  declCard: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  declHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  declYearBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: ACCENT.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  declYearText: {
    fontSize: 15,
    fontWeight: "800",
    color: ACCENT.green,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  declTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  declMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  myAllocation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: ACCENT.greenSoft,
  },
  myAllocLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: ACCENT.green,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  myAllocValue: {
    fontSize: 16,
    fontWeight: "800",
    color: ACCENT.green,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  allocList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CLAY.hairline,
  },
  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  allocRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  allocRowMe: {
    backgroundColor: ACCENT.navyTint,
  },
  allocName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.ink,
  },
  allocAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT.green,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },

  /* Empty state */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.greenSoft,
  },
  emptyCardText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
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
    color: ACCENT.green,
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

  /* Fields */
  fieldGroup: { gap: SPACING.sm },
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  fieldLabel: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
  },
  input: {
    fontSize: 15,
    color: CLAY.ink,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
    minHeight: 28,
  },
  fieldError: {
    fontSize: 11.5,
    fontWeight: "700",
    color: ACCENT.red,
    marginTop: -4,
  },

  modalNote: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  modalNoteText: {
    fontSize: 11.5,
    color: ACCENT.amber,
    fontWeight: "700",
    lineHeight: 16,
  },

  modalPrimary: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
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