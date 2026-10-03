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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandCoins,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useMemberData } from "@/hooks/useMemberData";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import type { LoanStatus, SaccoLoan } from "@/lib/types/sacco";

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
  neutral: "#4A566B",
  neutralSoft: "#CDD4E0",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const formatMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

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
  pending: { label: "Pending", color: ACCENT.amber, soft: ACCENT.amberSoft },
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

export default function SaccoLoansIndexScreen() {
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

  const [refreshing, setRefreshing] = useState(false);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  /* ── Derived ────────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isAdmin = useMemo(() => {
    const role = myMemberRow?.role;
    return role === "admin" || sacco?.created_by_id === currentMemberId;
  }, [myMemberRow?.role, sacco?.created_by_id, currentMemberId]);

  const allLoans = sacco?.loans ?? [];

  const myLoans = useMemo(
    () => allLoans.filter((l) => l.member_row_id === myMemberRow?.id),
    [allLoans, myMemberRow?.id]
  );

  const myActive = useMemo(
    () => myLoans.filter((l) => l.status === "active"),
    [myLoans]
  );

  const myOutstanding = useMemo(
    () =>
      myActive.reduce((sum, l) => {
        const repaid = l.repayments.reduce((s, r) => s + r.amount, 0);
        return sum + Math.max(l.amount - repaid, 0);
      }, 0),
    [myActive]
  );

  const myTotalBorrowed = useMemo(
    () => myLoans.reduce((sum, l) => sum + l.amount, 0),
    [myLoans]
  );

  /* Pending loans I can act on */
  const pendingToApprove = useMemo(
    () =>
      allLoans.filter(
        (l) =>
          l.status === "pending" &&
          myMemberRow &&
          l.member_row_id !== myMemberRow.id &&
          !l.approvals.some((a) => a.member_row_id === myMemberRow.id)
      ),
    [allLoans, myMemberRow]
  );

  /* Admin totals */
  const portfolio = useMemo(() => {
    const active = allLoans.filter((l) => l.status === "active");
    const repaidTotal = active.reduce(
      (sum, l) => sum + l.repayments.reduce((s, r) => s + r.amount, 0),
      0
    );
    const outstanding = active.reduce(
      (sum, l) =>
        sum +
        Math.max(
          l.amount - l.repayments.reduce((s, r) => s + r.amount, 0),
          0
        ),
      0
    );
    return {
      activeCount: active.length,
      outstanding,
      repaidTotal,
    };
  }, [allLoans]);

  /* Recent loans for the "All activity" section */
  const recentLoans = useMemo(
    () =>
      [...allLoans]
        .sort(
          (a, b) =>
            new Date(b.applied_at).getTime() -
            new Date(a.applied_at).getTime()
        )
        .slice(0, 15),
    [allLoans]
  );

  /* ── Guards ────────────────────────────────────────────────── */

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

  const isMember = !!myMemberRow;
  const quorum = sacco.loan_approval_quorum;

  /* ── Navigate helpers ────────────────────────────────────── */

  const goToApply = () =>
    router.push({
      pathname: "/(tabs)/groups/sacco/loans/apply",
      params: {
        sacco_id: sacco.sacco_id,
        group_member_id: currentMemberId,
      },
    });

  const goToLoan = (loan: SaccoLoan) =>
    router.push({
      pathname: "/(tabs)/groups/sacco/loans/[loanId]",
      params: {
        loanId: loan.id,
        sacco_id: sacco.sacco_id,
        group_member_id: currentMemberId,
      },
    });

  /* ── Render ────────────────────────────────────────────────── */

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
            Loans need {quorum} member approval
            {quorum === 1 ? "" : "s"} before disbursement
          </Text>
        </View>

        {/* ── Pending approvals banner ─────────────────── */}
        {pendingToApprove.length > 0 ? (
          <TouchableOpacity
            onPress={() => goToLoan(pendingToApprove[0])}
            activeOpacity={0.9}
            style={styles.bannerWrap}
          >
            <Clay bodyStyle={styles.pendingBanner}>
              <View style={styles.pendingIcon}>
                <Clock size={15} color={ACCENT.amber} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pendingTitle}>
                  Your approval is needed
                </Text>
                <Text style={styles.pendingMeta} numberOfLines={1}>
                  {pendingToApprove.length} loan request
                  {pendingToApprove.length === 1 ? "" : "s"} awaiting your
                  review
                </Text>
              </View>
              <ChevronRight
                size={15}
                color={ACCENT.amber}
                strokeWidth={2.6}
              />
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── My loans hero ───────────────────────────── */}
        {isMember ? (
          <Clay
            color={ACCENT.purple}
            radius={RADIUS.xl}
            depth={2}
            highlight="rgba(255,255,255,0.32)"
            shade="rgba(35, 20, 70, 0.44)"
            style={styles.heroWrap}
            bodyStyle={styles.hero}
          >
            <Text style={styles.heroEyebrow}>MY OUTSTANDING</Text>
            <Text style={styles.heroAmount} numberOfLines={1}>
              {sacco.currency_code} {formatMoney(myOutstanding)}
            </Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>
                {myActive.length} active loan
                {myActive.length === 1 ? "" : "s"}
              </Text>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMeta}>
                {sacco.currency_code} {formatMoney(myTotalBorrowed)} borrowed
                lifetime
              </Text>
            </View>
          </Clay>
        ) : null}

        {/* ── CTA / non-member note ────────────────────── */}
        {isMember ? (
          <TouchableOpacity
            onPress={goToApply}
            activeOpacity={0.9}
            style={styles.ctaWrap}
          >
            <Clay
              color={ACCENT.purple}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(40, 25, 80, 0.42)"
              bodyStyle={styles.primaryBtn}
            >
              <Plus size={17} color="#fff" strokeWidth={2.6} />
              <Text style={styles.primaryBtnText}>Apply for a loan</Text>
            </Clay>
          </TouchableOpacity>
        ) : (
          <View style={styles.nonMemberWrap}>
            <Clay bodyStyle={styles.nonMemberNote}>
              <Text style={styles.nonMemberText}>
                You are not a member of this SACCO. Contact an admin to
                request access before applying for a loan.
              </Text>
            </Clay>
          </View>
        )}

        {/* ── Admin portfolio ──────────────────────────── */}
        {isAdmin && allLoans.length > 0 ? (
          <Clay style={styles.adminWrap} bodyStyle={styles.adminCard}>
            <View style={styles.adminHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.adminTitle}>Loan portfolio</Text>
              </View>
            </View>
            <View style={styles.adminRow}>
              <View style={styles.adminStat}>
                <View
                  style={[
                    styles.adminStatIcon,
                    { backgroundColor: ACCENT.purpleSoft },
                  ]}
                >
                  <TrendingUp
                    size={14}
                    color={ACCENT.purple}
                    strokeWidth={2.6}
                  />
                </View>
                <Text style={styles.adminStatLabel}>Active loans</Text>
                <Text style={styles.adminStatValue}>
                  {portfolio.activeCount}
                </Text>
              </View>
              <View style={styles.adminStat}>
                <View
                  style={[
                    styles.adminStatIcon,
                    { backgroundColor: ACCENT.amberSoft },
                  ]}
                >
                  <TrendingDown
                    size={14}
                    color={ACCENT.amber}
                    strokeWidth={2.6}
                  />
                </View>
                <Text style={styles.adminStatLabel}>Outstanding</Text>
                <Text style={styles.adminStatValue}>
                  {formatMoney(portfolio.outstanding)}
                </Text>
              </View>
            </View>
          </Clay>
        ) : null}

        {/* ── My loans ─────────────────────────────────── */}
        {isMember && myLoans.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionTitle}>My loans</Text>
              </View>
              <View
                style={[
                  styles.sectionCountPill,
                  { backgroundColor: ACCENT.purpleSoft },
                ]}
              >
                <Text
                  style={[styles.sectionCountText, { color: ACCENT.purple }]}
                >
                  {myLoans.length}
                </Text>
              </View>
            </View>

            <Clay style={styles.listWrap} bodyStyle={styles.list}>
              {myLoans.map((loan, i) => {
                const isLast = i === myLoans.length - 1;
                const meta = STATUS_META[loan.status];
                return (
                  <TouchableOpacity
                    key={loan.id}
                    onPress={() => goToLoan(loan)}
                    activeOpacity={0.9}
                    style={[styles.loanRow, !isLast && styles.rowDivider]}
                  >
                    <View
                      style={[
                        styles.loanIcon,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <HandCoins
                        size={15}
                        color={meta.color}
                        strokeWidth={2.6}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.loanTitle} numberOfLines={1}>
                        {sacco.currency_code} {formatMoney(loan.amount)}
                      </Text>
                      <Text style={styles.loanMeta} numberOfLines={1}>
                        {loan.purpose} · {formatRelative(loan.applied_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Clay>
          </>
        ) : null}

        {/* ── Recent / All activity ────────────────────── */}
        {recentLoans.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionTitle}>
                  {isAdmin ? "All activity" : "Recent activity"}
                </Text>
              </View>
              <View
                style={[
                  styles.sectionCountPill,
                  { backgroundColor: ACCENT.navySoft },
                ]}
              >
                <Text
                  style={[styles.sectionCountText, { color: ACCENT.navy }]}
                >
                  {recentLoans.length}
                </Text>
              </View>
            </View>

            <Clay style={styles.listWrap} bodyStyle={styles.list}>
              {recentLoans.map((loan, i) => {
                const isLast = i === recentLoans.length - 1;
                const meta = STATUS_META[loan.status];
                const isMine = loan.member_row_id === myMemberRow?.id;
                return (
                  <TouchableOpacity
                    key={loan.id}
                    onPress={() => goToLoan(loan)}
                    activeOpacity={0.9}
                    style={[
                      styles.loanRow,
                      !isLast && styles.rowDivider,
                      isMine && styles.rowMine,
                    ]}
                  >
                    <View
                      style={[
                        styles.loanIcon,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <HandCoins
                        size={15}
                        color={meta.color}
                        strokeWidth={2.6}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.loanTitle} numberOfLines={1}>
                        {loan.member_name}
                        {isMine ? " · you" : ""}
                      </Text>
                      <Text style={styles.loanMeta} numberOfLines={1}>
                        {sacco.currency_code} {formatMoney(loan.amount)} ·{" "}
                        {formatRelative(loan.applied_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Clay>
          </>
        ) : null}

        {/* ── Empty state ──────────────────────────────── */}
        {allLoans.length === 0 && isMember ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <HandCoins
                  size={22}
                  color={ACCENT.purple}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={styles.emptyTitle}>No loans yet</Text>
              <Text style={styles.emptyBody}>
                Apply for a loan and it will be reviewed by {quorum} members
                of the SACCO before funds are disbursed.
              </Text>
            </Clay>
          </View>
        ) : null}
      </ScrollView>
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
  pendingIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT.amberSoft,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT.amber,
    letterSpacing: -0.1,
  },
  pendingMeta: {
    fontSize: 11.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },

  /* Hero — my outstanding */
  heroWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  hero: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
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
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 11.5,
    color: "#FFFFFF",
    opacity: 0.82,
    fontWeight: "600",
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.5,
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
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Non-member note */
  nonMemberWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  nonMemberNote: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: ACCENT.redSoft,
  },
  nonMemberText: {
    fontSize: 12.5,
    color: ACCENT.red,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  /* Admin portfolio */
  adminWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  adminCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adminTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  adminRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  adminStat: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    gap: 3,
  },
  adminStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  adminStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  adminStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },

  /* Section headers */
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

  /* Loan list */
  listWrap: {
    marginHorizontal: SPACING.xl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  loanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  rowMine: {
    backgroundColor: ACCENT.purpleSoft,
    borderRadius: RADIUS.sm,
  },
  loanIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loanTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  loanMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Empty state */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
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
    backgroundColor: ACCENT.purpleSoft,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
    fontWeight: "500",
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