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
  ArrowRight,
  ArrowUpCircle,
  CheckCircle,
  ChevronRight,
  Coins,
  HandCoins,
  Settings2,
  TrendingUp,
  Users,
} from "lucide-react-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useMemberData } from "@/hooks/useMemberData";
import {
  useSaccoStorage,
  netShareCapitalForMember,
  totalSharesForMember,
} from "@/store/useSaccoStorage";

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

/* ------------------------------------------------------------------ */
/*  Activity normaliser                                               */
/* ------------------------------------------------------------------ */

type ActivityKind =
  | "share_purchase"
  | "loan_application"
  | "loan_repayment"
  | "dividend_declaration";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  color: string;
  soft: string;
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}

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

export default function SaccoHomeScreen() {
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

  /* ── Derived data ───────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isAdmin = useMemo(() => {
    const role = myMemberRow?.role;
    return role === "admin" || sacco?.created_by_id === currentMemberId;
  }, [myMemberRow?.role, sacco?.created_by_id, currentMemberId]);

  const myShares = useMemo(
    () =>
      sacco && myMemberRow ? totalSharesForMember(sacco, myMemberRow.id) : 0,
    [sacco, myMemberRow]
  );

  const myShareCapital = useMemo(
    () =>
      sacco && myMemberRow
        ? netShareCapitalForMember(sacco, myMemberRow.id)
        : 0,
    [sacco, myMemberRow]
  );

  const myLoans = useMemo(
    () =>
      (sacco?.loans ?? []).filter(
        (l) => myMemberRow && l.member_row_id === myMemberRow.id
      ),
    [sacco?.loans, myMemberRow]
  );

  const myActiveLoan = useMemo(
    () => myLoans.find((l) => l.status === "active") ?? null,
    [myLoans]
  );

  const myOutstanding = useMemo(() => {
    if (!myActiveLoan) return 0;
    const repaid = myActiveLoan.repayments.reduce(
      (sum, r) => sum + r.amount,
      0
    );
    return Math.max(myActiveLoan.amount - repaid, 0);
  }, [myActiveLoan]);

  const pendingLoansToApprove = useMemo(
    () =>
      (sacco?.loans ?? []).filter(
        (l) =>
          l.status === "pending" &&
          myMemberRow &&
          l.member_row_id !== myMemberRow.id &&
          !l.approvals.some((a) => a.member_row_id === myMemberRow.id)
      ),
    [sacco?.loans, myMemberRow]
  );

  const totalShareCapital = useMemo(
    () =>
      (sacco?.share_purchases ?? []).reduce((s, p) => s + p.total_value, 0),
    [sacco?.share_purchases]
  );

  const activeMembers = useMemo(
    () => (sacco?.members ?? []).filter((m) => m.status === "active").length,
    [sacco?.members]
  );

  const invitePending = useMemo(
    () => (sacco?.members ?? []).filter((m) => m.status === "invited").length,
    [sacco?.members]
  );

  /* ── Activity stream ────────────────────────────────────── */

  const recentActivity: ActivityItem[] = useMemo(() => {
    if (!sacco) return [];

    const items: ActivityItem[] = [];

    /* Share purchases */
    sacco.share_purchases.forEach((p) => {
      items.push({
        id: `sp-${p.id}`,
        kind: "share_purchase",
        at: p.purchased_at,
        title: `${p.member_name} bought shares`,
        subtitle: `${p.quantity} share${p.quantity === 1 ? "" : "s"}`,
        amountLabel: `+${sacco.currency_code} ${formatMoney(p.total_value)}`,
        color: ACCENT.navy,
        soft: ACCENT.navySoft,
        icon: TrendingUp,
      });
    });

    /* Loans — applications and repayments */
    sacco.loans.forEach((l) => {
      items.push({
        id: `l-${l.id}`,
        kind: "loan_application",
        at: l.applied_at,
        title: `${l.member_name} applied for a loan`,
        subtitle: l.purpose,
        amountLabel: `${sacco.currency_code} ${formatMoney(l.amount)}`,
        color: ACCENT.purple,
        soft: ACCENT.purpleSoft,
        icon: HandCoins,
      });
      l.repayments.forEach((r) => {
        items.push({
          id: `lr-${r.id}`,
          kind: "loan_repayment",
          at: r.paid_at,
          title: `${l.member_name} made a repayment`,
          subtitle: "Repayment",
          amountLabel: `+${sacco.currency_code} ${formatMoney(r.amount)}`,
          color: ACCENT.green,
          soft: ACCENT.greenSoft,
          icon: CheckCircle,
        });
      });
    });

    /* Dividends */
    sacco.dividend_declarations.forEach((d) => {
      items.push({
        id: `d-${d.id}`,
        kind: "dividend_declaration",
        at: d.declared_at,
        title: `Dividends declared for ${d.year}`,
        subtitle: `${d.rate_on_shares}% on shares`,
        amountLabel: `${d.allocations.length} member${
          d.allocations.length === 1 ? "" : "s"
        }`,
        color: ACCENT.green,
        soft: ACCENT.greenSoft,
        icon: Coins,
      });
    });

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [sacco]);

  /* ── Guards ────────────────────────────────────────────── */

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

  /* ── Navigation ────────────────────────────────────────── */

  const goTo = useCallback(
    (pathname: string, extra: Record<string, string | undefined> = {}) => {
      router.push({
        pathname: pathname as never,
        params: {
          sacco_id: sacco.sacco_id,
          group_member_id: currentMemberId,
          ...extra,
        },
      });
    },
    [router, sacco.sacco_id, currentMemberId]
  );

  /* ── Render ────────────────────────────────────────────── */

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
        {/* ── Identity ─────────────────────────────────────── */}
        <View style={styles.identity}>
          <View style={styles.identityTop}>
            <SaccoBadge
              category={sacco.sasra_license_category}
              verified={!!sacco.sasra_verified_at}
            />
            {isAdmin ? (
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>ADMIN</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.groupName} numberOfLines={2}>
            {sacco.group_name}
          </Text>

          <View style={styles.metaRow}>
            <Users size={12} color={CLAY.inkSoft} strokeWidth={2.4} />
            <Text style={styles.metaText}>
              {activeMembers} {activeMembers === 1 ? "member" : "members"}
            </Text>
            {sacco.county ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{sacco.county}</Text>
              </>
            ) : null}
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>
              {sacco.currency_code} {formatMoney(sacco.share_value)} / share
            </Text>
          </View>
        </View>

        {/* ── Pending approvals banner ─────────────────────── */}
        {pendingLoansToApprove.length > 0 ? (
          <TouchableOpacity
            onPress={() => goTo("/(tabs)/groups/sacco/loans")}
            activeOpacity={0.9}
            style={styles.bannerWrap}
          >
            <Clay bodyStyle={styles.pendingBanner}>
              <View style={styles.pendingIcon}>
                <HandCoins
                  size={15}
                  color={ACCENT.amber}
                  strokeWidth={2.6}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pendingTitle}>Your approval is needed</Text>
                <Text style={styles.pendingMeta} numberOfLines={1}>
                  {pendingLoansToApprove.length} loan request
                  {pendingLoansToApprove.length === 1 ? "" : "s"} awaiting
                  your review
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

        {/* ── Quick actions row ────────────────────────────── */}
        <View style={styles.quickRow}>
          <QuickAction
            icon={TrendingUp}
            label="Buy shares"
            color={ACCENT.navy}
            soft={ACCENT.navySoft}
            onPress={() => goTo("/(tabs)/groups/sacco/shares")}
          />
          <QuickAction
            icon={HandCoins}
            label="Apply loan"
            color={ACCENT.purple}
            soft={ACCENT.purpleSoft}
            onPress={() => goTo("/(tabs)/groups/sacco/loans/apply")}
          />
          <QuickAction
            icon={ArrowUpCircle}
            label={myActiveLoan ? "Repay" : "Loans"}
            color={myActiveLoan ? ACCENT.green : ACCENT.purple}
            soft={myActiveLoan ? ACCENT.greenSoft : ACCENT.purpleSoft}
            onPress={() =>
              myActiveLoan
                ? goTo("/(tabs)/groups/sacco/loans/[loanId]", {
                    loanId: myActiveLoan.id,
                  })
                : goTo("/(tabs)/groups/sacco/loans")
            }
          />
          <QuickAction
            icon={Users}
            label="Members"
            color={ACCENT.navy}
            soft={ACCENT.navyTint}
            onPress={() => goTo("/(tabs)/groups/sacco/members")}
          />
        </View>

        {/* ── Primary cards: Shares + Loans ────────────────── */}
        <View style={styles.cardsGrid}>
          <TouchableOpacity
            onPress={() => goTo("/(tabs)/groups/sacco/shares")}
            activeOpacity={0.9}
            style={{ flex: 1 }}
          >
            <Clay bodyStyle={styles.primaryCard}>
              <View
                style={[
                  styles.primaryCardIcon,
                  { backgroundColor: ACCENT.navySoft },
                ]}
              >
                <TrendingUp
                  size={18}
                  color={ACCENT.navy}
                  strokeWidth={2.4}
                />
              </View>
              <Text style={styles.primaryCardLabel}>Shares</Text>
              <Text style={styles.primaryCardValue} numberOfLines={1}>
                {sacco.currency_code} {formatMoney(myShareCapital)}
              </Text>
              <Text style={styles.primaryCardMeta}>
                {myShares} {myShares === 1 ? "share" : "shares"}
              </Text>
              <View style={styles.primaryCardArrow}>
                <ArrowRight
                  size={14}
                  color={ACCENT.navy}
                  strokeWidth={2.6}
                />
              </View>
            </Clay>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goTo("/(tabs)/groups/sacco/loans")}
            activeOpacity={0.9}
            style={{ flex: 1 }}
          >
            <Clay bodyStyle={styles.primaryCard}>
              <View
                style={[
                  styles.primaryCardIcon,
                  { backgroundColor: ACCENT.purpleSoft },
                ]}
              >
                <HandCoins
                  size={18}
                  color={ACCENT.purple}
                  strokeWidth={2.4}
                />
              </View>
              <Text style={styles.primaryCardLabel}>Loans</Text>
              <Text style={styles.primaryCardValue} numberOfLines={1}>
                {sacco.currency_code} {formatMoney(myOutstanding)}
              </Text>
              <Text style={styles.primaryCardMeta}>
                {myActiveLoan
                  ? "Active loan"
                  : myLoans.length > 0
                  ? `${myLoans.length} past`
                  : "No loans yet"}
              </Text>
              <View style={styles.primaryCardArrow}>
                <ArrowRight
                  size={14}
                  color={ACCENT.purple}
                  strokeWidth={2.6}
                />
              </View>
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Secondary cards: Dividends + Members ─────────── */}
        <View style={styles.cardsGrid}>
          <TouchableOpacity
            onPress={() => goTo("/(tabs)/groups/sacco/dividends")}
            activeOpacity={0.9}
            style={{ flex: 1 }}
          >
            <Clay bodyStyle={styles.secondaryCard}>
              <View
                style={[
                  styles.secondaryIcon,
                  { backgroundColor: ACCENT.greenSoft },
                ]}
              >
                <Coins size={16} color={ACCENT.green} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.secondaryLabel}>Dividends</Text>
                <Text style={styles.secondaryMeta}>
                  {sacco.dividend_declarations.length > 0
                    ? `${sacco.dividend_declarations.length} declaration${
                        sacco.dividend_declarations.length === 1 ? "" : "s"
                      }`
                    : "Not declared yet"}
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
            onPress={() => goTo("/(tabs)/groups/sacco/members")}
            activeOpacity={0.9}
            style={{ flex: 1 }}
          >
            <Clay bodyStyle={styles.secondaryCard}>
              <View
                style={[
                  styles.secondaryIcon,
                  { backgroundColor: ACCENT.navyTint },
                ]}
              >
                <Users size={16} color={ACCENT.navy} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.secondaryLabel}>Members</Text>
                <Text style={styles.secondaryMeta}>
                  {activeMembers} active
                  {invitePending > 0 ? ` · ${invitePending} pending` : ""}
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

        {/* ── Admin overview ───────────────────────────────── */}
        {isAdmin ? (
          <Clay style={styles.adminWrap} bodyStyle={styles.adminCard}>
            <View style={styles.adminHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.adminTitle}>Fund overview</Text>
              </View>
              <TouchableOpacity
                onPress={() => goTo("/(tabs)/groups/sacco/settings")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="SACCO settings"
              >
                <View style={styles.adminSettingsBtn}>
                  <Settings2
                    size={14}
                    color={CLAY.ink}
                    strokeWidth={2.4}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.adminRow}>
              <View style={styles.adminStat}>
                <Text style={styles.adminStatLabel}>Total shares</Text>
                <Text style={styles.adminStatValue}>
                  {sacco.currency_code} {formatMoney(totalShareCapital)}
                </Text>
              </View>
              <View style={styles.adminStat}>
                <Text style={styles.adminStatLabel}>Loan portfolio</Text>
                <Text style={styles.adminStatValue}>
                  {sacco.currency_code}{" "}
                  {formatMoney(
                    sacco.loans
                      .filter((l) => l.status === "active")
                      .reduce((s, l) => s + l.amount, 0)
                  )}
                </Text>
              </View>
            </View>
          </Clay>
        ) : null}

        {/* ── Recent activity ──────────────────────────────── */}
        {recentActivity.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionTitle}>Recent activity</Text>
              </View>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>
                  {recentActivity.length}
                </Text>
              </View>
            </View>

            <Clay style={styles.activityWrap} bodyStyle={styles.activityList}>
              {recentActivity.map((item, i) => {
                const isLast = i === recentActivity.length - 1;
                const Icon = item.icon;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.activityRow,
                      !isLast && styles.activityDivider,
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: item.soft },
                      ]}
                    >
                      <Icon
                        size={14}
                        color={item.color}
                        strokeWidth={2.4}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={styles.activityTitle}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={styles.activityMeta}
                        numberOfLines={1}
                      >
                        {item.subtitle} · {formatRelative(item.at)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.activityAmount,
                        { color: item.color },
                      ]}
                    >
                      {item.amountLabel}
                    </Text>
                  </View>
                );
              })}
            </Clay>
          </>
        ) : null}

        {/* ── Governance note ──────────────────────────────── */}
        <View style={styles.quorumWrap}>
          <Clay
            inset
            radius={RADIUS.md}
            color={CLAY.sunken}
            bodyStyle={styles.quorumNote}
          >
            <Text style={styles.quorumNoteText}>
              Loans and withdrawals require {quorum} member approval
              {quorum === 1 ? "" : "s"} before funds are released
            </Text>
          </Clay>
        </View>

        {/* ── Non-member notice ────────────────────────────── */}
        {!isMember ? (
          <View style={styles.nonMemberWrap}>
            <Clay bodyStyle={styles.nonMemberNote}>
              <Text style={styles.nonMemberText}>
                You are not currently a member of this SACCO. Contact an admin
                to request access.
              </Text>
            </Clay>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  QuickAction                                                       */
/* ------------------------------------------------------------------ */

function QuickAction({
  icon: Icon,
  label,
  color,
  soft,
  onPress,
}: {
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  color: string;
  soft: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ flex: 1 }}
    >
      <Clay bodyStyle={styles.quickTile}>
        <View style={[styles.quickIcon, { backgroundColor: soft }]}>
          <Icon size={16} color={color} strokeWidth={2.4} />
        </View>
        <Text style={styles.quickLabel} numberOfLines={1}>
          {label}
        </Text>
      </Clay>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  /* Identity */
  identity: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl + 8,
    paddingBottom: SPACING.md,
  },
  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  adminTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: ACCENT.navySoft,
  },
  adminTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: 0.9,
  },
  groupName: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + 2,
    marginTop: SPACING.sm,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: TYPE.label,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.8,
    marginHorizontal: 2,
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

  /* Quick actions */
  quickRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  quickTile: {
    alignItems: "center",
    gap: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.1,
  },

  /* Cards */
  cardsGrid: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  primaryCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: 4,
  },
  primaryCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  primaryCardLabel: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  primaryCardValue: {
    fontSize: 19,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  primaryCardMeta: {
    fontSize: TYPE.label,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 2,
  },
  primaryCardArrow: {
    position: "absolute",
    right: SPACING.md,
    top: SPACING.md,
    opacity: 0.7,
  },

  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  secondaryMeta: {
    fontSize: TYPE.caption,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },

  /* Admin overview */
  adminWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
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
  adminSettingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
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
  adminStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  adminStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
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
    backgroundColor: ACCENT.navySoft,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: ACCENT.navy,
    fontVariant: ["tabular-nums"],
  },

  /* Activity */
  activityWrap: {
    marginHorizontal: SPACING.xl,
  },
  activityList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  activityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  activityMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  activityAmount: {
    fontSize: 12.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },

  /* Notes */
  quorumWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  quorumNote: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  quorumNoteText: {
    fontSize: TYPE.label,
    fontWeight: "700",
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 17,
  },

  nonMemberWrap: {
    marginHorizontal: SPACING.xl,
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