import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Award,
  BellIcon,
  BookOpen,
  ChevronRight,
  Compass,
  Gauge,
  HandCoins,
  PiggyBank,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";

import { GroupAvatar } from "@/components/myGroups/GroupAvatar";
import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import CircularProgress from "@/components/myGroups/PieProgress";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useMemberData } from "@/hooks/useMemberData";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useMemberInvites } from "@/hooks/useMemberInvites";
import {
  useSaccoStorage,
  netShareCapitalForMember,
} from "@/store/useSaccoStorage";
import { useSavingsStorage } from "@/store/useSavingsStorage";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                     */
/* ------------------------------------------------------------------ */

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

/**
 * Claymorphism surface system.
 * Every raised element is a two-layer shell: an outer shell casting the soft
 * dark drop shadow (bottom-right) and an inner shell casting the white
 * highlight (top-left). Together they read as a moulded clay slab.
 */
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

/** Muted, matte accents — no neon, no gradients. */
const ACCENT = {
  green: "#3E9B62",
  greenSoft: "#DBEFE1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
  purple: "#7A6AC0",
  purpleSoft: "#E6E2F7",
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
} as const;

const formatMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatCompactMoney = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const formatMonth = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short" });

const formatShortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type TimeRange = "30d" | "6m" | "1y";

interface HealthScore {
  total: number;
  savings: number;
  debt: number;
  contribution: number;
  diversification: number;
  engagement: number;
  consistency: number;
  tier: "Building" | "Steady" | "Strong" | "Excellent";
  tierColor: string;
}

interface Insight {
  id: string;
  tone: "positive" | "neutral" | "warning";
  title: string;
  body: string;
}

interface LiteracyCard {
  id: string;
  title: string;
  body: string;
}

interface Circle {
  kind: "community" | "sacco";
  id: string;
  name: string;
  memberCount: number;
  sasraCategory?: import("@/lib/types/sacco").SasraLicenseCategory;
  sasraVerified?: boolean;
}

interface MonthBucket {
  key: string;
  label: string;
  contributed: number;
  withdrawn: number;
  loans: number;
  isCurrent: boolean;
}

interface GoalProjection {
  id: string;
  name: string;
  contributed: number;
  target: number;
  pct: number;
  monthlyRate: number;
  etaLabel: string | null;
  status: "on-track" | "slow" | "done";
}

interface Benchmark {
  id: string;
  circleName: string;
  circleKind: "community" | "sacco";
  myValue: number;
  avgValue: number;
  unit: "contribution" | "shares";
  ratio: number;
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                      */
/* ------------------------------------------------------------------ */

function getRangeStart(range: TimeRange): Date {
  const d = new Date();
  if (range === "30d") d.setDate(d.getDate() - 30);
  else if (range === "6m") d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

function getBucketCount(range: TimeRange): number {
  return range === "30d" ? 6 : range === "6m" ? 6 : 12;
}

/**
 * Build buckets from a list of events.
 * 30d  -> 6 windows of 5 days
 * 6m/1y -> calendar months
 */
function bucketize(
  events: { at: string; contributed: number; withdrawn: number; loans: number }[],
  range: TimeRange
): MonthBucket[] {
  const now = new Date();
  const count = getBucketCount(range);
  const buckets: MonthBucket[] = [];

  if (range === "30d") {
    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 5);
      const start = new Date(end);
      start.setDate(start.getDate() - 5);

      let contributed = 0;
      let withdrawn = 0;
      let loans = 0;

      events.forEach((e) => {
        const t = new Date(e.at).getTime();
        if (t >= start.getTime() && t < end.getTime()) {
          contributed += e.contributed;
          withdrawn += e.withdrawn;
          loans += e.loans;
        }
      });

      buckets.push({
        key: `${start.toISOString()}-${end.toISOString()}`,
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        contributed,
        withdrawn,
        loans,
        isCurrent: i === 0,
      });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: formatMonth(d),
        contributed: 0,
        withdrawn: 0,
        loans: 0,
        isCurrent: i === 0,
      });
    }
    events.forEach((e) => {
      const t = new Date(e.at);
      const key = `${t.getFullYear()}-${t.getMonth()}`;
      const b = buckets.find((x) => x.key === key);
      if (b) {
        b.contributed += e.contributed;
        b.withdrawn += e.withdrawn;
        b.loans += e.loans;
      }
    });
  }

  return buckets;
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
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  /** 0 = flat chip, 1 = standard card, 2 = hero slab */
  depth?: number;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
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

export default function HomeScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>("6m");

  /* ── Data ─────────────────────────────────────────────── */
  const { data: member, refetch: refetchMember } = useMemberData();
  const memberId = member?.id;

  const { data: wallet, refetch: refetchWallet } = useUserWallet(memberId);
  const { data: accounts, refetch: refetchAccounts } = useWalletAccounts(
    wallet?.wallet_id
  );

  const { groups: myGroups, refetch: refetchGroups } = useGetMemberGroups();
  const { invites: pendingInvites, refetch: refetchInvites } =
    useMemberInvites(memberId);

  const allSaccos = useSaccoStorage((s) => s.saccos);
  const allSavingsPlans = useSavingsStorage((s) => s.plans);

  /* ── Greeting ─────────────────────────────────────────── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = member?.first_name ?? "there";

  /* ── Wallet ───────────────────────────────────────────── */
  const walletBalance = useMemo(
    () =>
      (accounts ?? []).reduce(
        (sum, a) => sum + (a.available_balance ?? 0),
        0
      ),
    [accounts]
  );

  const currencyCode = accounts?.[0]?.currency_code ?? "KES";

  /* ── My circles ───────────────────────────────────────── */
  const mySaccos = useMemo(
    () =>
      allSaccos.filter((s) =>
        s.members.some(
          (m) => m.group_member_id === memberId && m.status === "active"
        )
      ),
    [allSaccos, memberId]
  );

  const mySavingsPlans = useMemo(
    () =>
      allSavingsPlans.filter((p) =>
        p.members.some(
          (m) => m.group_member_id === memberId && m.status === "active"
        )
      ),
    [allSavingsPlans, memberId]
  );

  /* ── Ledger (all-time aggregate) ──────────────────────── */
  const ledger = useMemo(() => {
    let shareCapital = 0;
    let loansOutstanding = 0;
    let loansRepaid = 0;
    let dividendsEarned = 0;

    mySaccos.forEach((s) => {
      const myRow = s.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      shareCapital += netShareCapitalForMember(s, myRow.id);
      s.loans.forEach((l) => {
        if (l.member_row_id !== myRow.id) return;
        const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
        loansRepaid += repaid;
        loansOutstanding += Math.max(l.amount - repaid, 0);
      });
      s.dividend_declarations.forEach((d) => {
        const alloc = d.allocations.find((a) => a.member_row_id === myRow.id);
        dividendsEarned += alloc?.net_payout ?? 0;
      });
    });

    let savingsContributed = 0;
    let savingsTarget = 0;
    let savingsWithdrawn = 0;

    mySavingsPlans.forEach((p) => {
      savingsTarget += p.target_amount;
      p.contributions.forEach((c) => {
        if (c.amount > 0) savingsContributed += c.amount;
        else savingsWithdrawn += Math.abs(c.amount);
      });
    });

    const netWorth =
      walletBalance + shareCapital + (savingsContributed - savingsWithdrawn);

    return {
      shareCapital,
      loansOutstanding,
      loansRepaid,
      dividendsEarned,
      savingsContributed,
      savingsTarget,
      savingsWithdrawn,
      netWorth,
    };
  }, [mySaccos, mySavingsPlans, walletBalance, memberId]);

  /* ── Unified event stream for time-bucketed charts ─────── */
  const eventStream = useMemo(() => {
    const events: {
      at: string;
      contributed: number;
      withdrawn: number;
      loans: number;
    }[] = [];

    mySavingsPlans.forEach((p) => {
      p.contributions.forEach((c) => {
        events.push({
          at: c.contributed_at,
          contributed: c.amount > 0 ? c.amount : 0,
          withdrawn: c.amount < 0 ? Math.abs(c.amount) : 0,
          loans: 0,
        });
      });
    });

    mySaccos.forEach((s) => {
      const myRow = s.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      s.loans.forEach((l) => {
        if (l.member_row_id !== myRow.id) return;
        l.repayments.forEach((r) => {
          events.push({
            at: r.paid_at,
            contributed: 0,
            withdrawn: 0,
            loans: r.amount,
          });
        });
      });
    });

    return events;
  }, [mySavingsPlans, mySaccos, memberId]);

  /* ── Buckets for the chart ────────────────────────────── */
  const buckets = useMemo(
    () => bucketize(eventStream, range),
    [eventStream, range]
  );

  const rangeTotalIn = useMemo(
    () => buckets.reduce((s, b) => s + b.contributed, 0),
    [buckets]
  );

  const rangeTotalOut = useMemo(
    () => buckets.reduce((s, b) => s + b.withdrawn + b.loans, 0),
    [buckets]
  );

  const rangeNet = rangeTotalIn - rangeTotalOut;

  /* ── Period-over-period change ────────────────────────── */
  const momChange = useMemo(() => {
    if (buckets.length < 2) return 0;
    const current = buckets[buckets.length - 1].contributed;
    const previous = buckets[buckets.length - 2].contributed;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [buckets]);

  /**
   * Ratios.
   *
   * NOTE ON DEBT: the platform currently records only liabilities (loans and
   * their repayments). Assets are not yet tracked, so a debt-to-assets ratio
   * would be misleading. We therefore report a *debt load* — the share of
   * everything ever borrowed that is still outstanding. 0% means fully repaid.
   */
  const ratios = useMemo(() => {
    const denom = rangeTotalIn + walletBalance;
    const savingsRate = denom > 0 ? (rangeTotalIn / denom) * 100 : 0;

    const totalBorrowed = ledger.loansOutstanding + ledger.loansRepaid;
    const debtLoad =
      totalBorrowed > 0 ? (ledger.loansOutstanding / totalBorrowed) * 100 : 0;

    const monthlyOutflow =
      range === "30d"
        ? rangeTotalOut
        : rangeTotalOut / (range === "6m" ? 6 : 12);
    const liquidityMonths =
      monthlyOutflow > 0
        ? walletBalance / monthlyOutflow
        : walletBalance > 0
        ? 12
        : 0;

    return {
      savingsRate: Math.min(savingsRate, 100),
      debtLoad,
      totalBorrowed,
      liquidityMonths: Math.min(liquidityMonths, 24),
    };
  }, [rangeTotalIn, rangeTotalOut, walletBalance, ledger, range]);

  /* ── Health score (6 signals, 100 pts) ────────────────── */
  const health: HealthScore = useMemo(() => {
    /* Savings progress (0-25) */
    const planProgress =
      mySavingsPlans.length > 0
        ? mySavingsPlans.reduce((sum, p) => {
            const contributed = p.contributions.reduce(
              (s, c) => s + c.amount,
              0
            );
            const pct =
              p.target_amount > 0
                ? Math.min((contributed / p.target_amount) * 100, 100)
                : 0;
            return sum + pct;
          }, 0) / mySavingsPlans.length
        : 0;
    const savingsScore = (planProgress / 100) * 25;

    /* Debt load (0-20) — based on repayment progress only */
    const totalBorrowed = ledger.loansOutstanding + ledger.loansRepaid;
    const repaidRatio =
      totalBorrowed > 0 ? ledger.loansRepaid / totalBorrowed : 1;
    const debtScore = 20 * (0.5 + 0.5 * repaidRatio);

    /* Contribution activity (0-20) */
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    let recentContributions = 0;
    let allContributions = 0;
    mySavingsPlans.forEach((p) => {
      p.contributions.forEach((c) => {
        if (c.amount <= 0) return;
        allContributions += 1;
        if (new Date(c.contributed_at).getTime() > thirtyDaysAgo) {
          recentContributions += 1;
        }
      });
    });
    const contributionScore = Math.min(
      20,
      recentContributions * 2.5 + Math.min(allContributions * 0.4, 8)
    );

    /* Diversification (0-15) */
    const circleCount = (myGroups?.length ?? 0) + mySaccos.length;
    let divScore = 0;
    if (circleCount >= 1) divScore += 5;
    if (circleCount >= 2) divScore += 4;
    if (circleCount >= 3) divScore += 3;
    if (mySavingsPlans.length > 0) divScore += 3;
    const diversificationScore = Math.min(divScore, 15);

    /* Engagement (0-10) */
    const activeCircles = mySaccos.filter((s) => {
      const myRow = s.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return false;
      const hasShares = s.share_purchases.some(
        (p) => p.member_row_id === myRow.id
      );
      const hasLoans = s.loans.some((l) => l.member_row_id === myRow.id);
      return hasShares || hasLoans;
    }).length;
    const engagementScore = Math.min(activeCircles * 3 + 2, 10);

    /* Consistency (0-10) */
    const bucketsWithContribs = buckets.filter((b) => b.contributed > 0).length;
    const consistencyScore =
      buckets.length > 0 ? (bucketsWithContribs / buckets.length) * 10 : 0;

    const total = Math.round(
      savingsScore +
        debtScore +
        contributionScore +
        diversificationScore +
        engagementScore +
        consistencyScore
    );

    let tier: HealthScore["tier"] = "Building";
    let tierColor: string = ACCENT.amber;
    if (total >= 80) {
      tier = "Excellent";
      tierColor = ACCENT.green;
    } else if (total >= 60) {
      tier = "Strong";
      tierColor = ACCENT.teal;
    } else if (total >= 40) {
      tier = "Steady";
      tierColor = ACCENT.navy;
    }

    return {
      total,
      savings: Math.round(savingsScore),
      debt: Math.round(debtScore),
      contribution: Math.round(contributionScore),
      diversification: Math.round(diversificationScore),
      engagement: Math.round(engagementScore),
      consistency: Math.round(consistencyScore),
      tier,
      tierColor,
    };
  }, [
    mySavingsPlans,
    mySaccos,
    myGroups,
    walletBalance,
    ledger,
    buckets,
    memberId,
  ]);

  /* ── Insights ─────────────────────────────────────────── */
  const insights: Insight[] = useMemo(() => {
    const out: Insight[] = [];
    const circleCount = (myGroups?.length ?? 0) + mySaccos.length;

    if (mySavingsPlans.length > 0) {
      const withProgress = mySavingsPlans.map((p) => {
        const contributed = p.contributions.reduce((s, c) => s + c.amount, 0);
        const pct =
          p.target_amount > 0
            ? Math.min(Math.round((contributed / p.target_amount) * 100), 100)
            : 0;
        return { name: p.savings_name, pct };
      });
      const slowest = [...withProgress].sort((a, b) => a.pct - b.pct)[0];
      if (slowest && slowest.pct < 30) {
        out.push({
          id: "slow-progress",
          tone: "warning",
          title: `${slowest.name} needs attention`,
          body: `You're at ${slowest.pct}% of target. A small top-up this week can push you past the next milestone.`,
        });
      } else if (slowest && slowest.pct >= 75) {
        out.push({
          id: "near-complete",
          tone: "positive",
          title: `${slowest.name} is close to done`,
          body: `${slowest.pct}% of the way there. One or two more contributions finishes it.`,
        });
      }
    } else if (circleCount > 0) {
      out.push({
        id: "no-savings",
        tone: "neutral",
        title: "Start a savings plan",
        body: "You're part of a circle but haven't started saving yet. A small monthly target is the easiest first step.",
      });
    }

    if (ledger.loansOutstanding > 0) {
      const totalBorrowed = ledger.loansOutstanding + ledger.loansRepaid;
      const repaidPct =
        totalBorrowed > 0
          ? Math.round((ledger.loansRepaid / totalBorrowed) * 100)
          : 0;

      if (repaidPct < 35) {
        out.push({
          id: "loan-progress",
          tone: "warning",
          title: "Loan repayment needs attention",
          body: `You've cleared ${repaidPct}% of everything you've borrowed. ${currencyCode} ${formatMoney(
            ledger.loansOutstanding
          )} is still outstanding — paying ahead of schedule reduces the interest you owe.`,
        });
      } else {
        out.push({
          id: "loan-progress",
          tone: "positive",
          title: "Loan repayment is on track",
          body: `You've cleared ${repaidPct}% of your total borrowing. ${currencyCode} ${formatMoney(
            ledger.loansOutstanding
          )} remains outstanding.`,
        });
      }
    }

    if (circleCount === 0) {
      out.push({
        id: "no-circles",
        tone: "neutral",
        title: "Join a circle",
        body: "Community groups and SACCOs help members save together and access credit as a group.",
      });
    } else if (circleCount >= 3 && mySavingsPlans.length === 0) {
      out.push({
        id: "add-savings",
        tone: "neutral",
        title: "Add a savings plan",
        body: "You're in several circles. A savings plan gives your cash a specific goal to work toward.",
      });
    }

    if (ledger.dividendsEarned > 0) {
      out.push({
        id: "dividend-earned",
        tone: "positive",
        title: `You've earned ${currencyCode} ${formatMoney(
          ledger.dividendsEarned
        )} in dividends`,
        body: "Share dividends compound over time. Buying more shares increases your future payouts.",
      });
    }

    return out.slice(0, 3);
  }, [
    mySavingsPlans,
    myGroups,
    mySaccos,
    ledger,
    walletBalance,
    currencyCode,
  ]);

  /* ── Financial literacy cards (context-aware) ─────────── */
  const literacy: LiteracyCard[] = useMemo(() => {
    const cards: LiteracyCard[] = [];

    if (ratios.debtLoad >= 50) {
      cards.push({
        id: "lit-debt",
        title: "Why reducing debt early saves money",
        body: "Interest is charged on the outstanding balance. Paying extra in the first months of a loan cuts total interest far more than paying the same extra later.",
      });
    }

    if (ratios.liquidityMonths < 3 && walletBalance > 0) {
      cards.push({
        id: "lit-emergency",
        title: "Emergency funds matter",
        body: "Financial planners recommend holding 3–6 months of expenses in cash. It stops you from borrowing when something unexpected happens.",
      });
    }

    if (ratios.savingsRate < 20 && rangeTotalIn > 0) {
      cards.push({
        id: "lit-savings-rate",
        title: "Aim for a 20% savings rate",
        body: "For every KES 100 that comes in, try to keep KES 20. Small consistent savings beat large one-off contributions.",
      });
    }

    if (
      (myGroups?.length ?? 0) + mySaccos.length >= 2 &&
      mySavingsPlans.length === 0
    ) {
      cards.push({
        id: "lit-compound",
        title: "Small amounts, big compounding",
        body: "A KES 1,000 monthly savings plan earning 8% becomes roughly KES 180,000 in 10 years. Time does most of the work.",
      });
    }

    if (ledger.dividendsEarned > 0) {
      cards.push({
        id: "lit-dividends",
        title: "How SACCO dividends work",
        body: "Dividends are paid on share capital, not on deposits. Buying more shares increases your share of the annual payout.",
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: "lit-baseline",
        title: "Build the habit first",
        body: "The best savings plan is one you can keep. Start with an amount that feels almost too small and increase it every quarter.",
      });
    }

    return cards.slice(0, 3);
  }, [
    ratios,
    walletBalance,
    rangeTotalIn,
    myGroups,
    mySaccos,
    mySavingsPlans,
    ledger.dividendsEarned,
  ]);

  /* ── Goal projections ─────────────────────────────────── */
  const goals: GoalProjection[] = useMemo(() => {
    return mySavingsPlans.map((p) => {
      const contributed = p.contributions.reduce((s, c) => s + c.amount, 0);
      const pct =
        p.target_amount > 0
          ? Math.min(Math.round((contributed / p.target_amount) * 100), 100)
          : 0;

      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const recentContribs = p.contributions.filter(
        (c) => c.amount > 0 && new Date(c.contributed_at).getTime() > cutoff
      );
      const recentTotal = recentContribs.reduce((s, c) => s + c.amount, 0);
      const monthlyRate = recentTotal / 3;

      let etaLabel: string | null = null;
      if (pct < 100 && monthlyRate > 0) {
        const remaining = p.target_amount - contributed;
        const months = Math.ceil(remaining / monthlyRate);
        const eta = new Date();
        eta.setMonth(eta.getMonth() + months);
        etaLabel = formatShortDate(eta);
      }

      let status: GoalProjection["status"] = "on-track";
      if (pct >= 100) status = "done";
      else if (monthlyRate === 0) status = "slow";

      return {
        id: p.savings_plan_id,
        name: p.savings_name,
        contributed,
        target: p.target_amount,
        pct,
        monthlyRate,
        etaLabel,
        status,
      };
    });
  }, [mySavingsPlans]);

  /* ── Peer benchmarks ──────────────────────────────────── */
  const benchmarks: Benchmark[] = useMemo(() => {
    const out: Benchmark[] = [];

    mySaccos.forEach((s) => {
      const myRow = s.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      const myValue = netShareCapitalForMember(s, myRow.id);
      const others = s.members.filter(
        (m) => m.status === "active" && m.id !== myRow.id
      );
      if (others.length === 0) return;
      const avg =
        others.reduce(
          (sum, m) => sum + netShareCapitalForMember(s, m.id),
          0
        ) / others.length;
      out.push({
        id: `bench-sacco-${s.sacco_id}`,
        circleName: s.group_name,
        circleKind: "sacco",
        myValue,
        avgValue: avg,
        unit: "shares",
        ratio: avg > 0 ? myValue / avg : 0,
      });
    });

    mySavingsPlans.forEach((p) => {
      const myRow = p.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      const myValue = p.contributions
        .filter((c) => c.group_member_id === memberId)
        .reduce((s, c) => s + c.amount, 0);
      const others = p.members.filter(
        (m) => m.status === "active" && m.group_member_id !== memberId
      );
      if (others.length === 0) return;
      const avg =
        others.reduce((sum, m) => {
          const contributed = p.contributions
            .filter((c) => c.group_member_id === m.group_member_id)
            .reduce((s, c) => s + c.amount, 0);
          return sum + contributed;
        }, 0) / others.length;
      out.push({
        id: `bench-plan-${p.savings_plan_id}`,
        circleName: p.savings_name,
        circleKind: "community",
        myValue,
        avgValue: avg,
        unit: "contribution",
        ratio: avg > 0 ? myValue / avg : 0,
      });
    });

    return out.slice(0, 2);
  }, [mySaccos, mySavingsPlans, memberId]);

  /* ── Pending approvals ────────────────────────────────── */
  const pendingLoanApprovals = useMemo(() => {
    let count = 0;
    mySaccos.forEach((s) => {
      const myRow = s.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      s.loans.forEach((l) => {
        if (
          l.status === "pending" &&
          l.member_row_id !== myRow.id &&
          !l.approvals.some((a) => a.member_row_id === myRow.id)
        ) {
          count += 1;
        }
      });
    });
    return count;
  }, [mySaccos, memberId]);

  const pendingWithdrawalApprovals = useMemo(() => {
    let count = 0;
    mySavingsPlans.forEach((p) => {
      const myRow = p.members.find((m) => m.group_member_id === memberId);
      if (!myRow) return;
      (p.withdrawal_requests ?? []).forEach((w) => {
        if (
          w.status === "pending" &&
          w.requested_by_id !== memberId &&
          !w.approvals.some((a) => a.group_member_id === memberId)
        ) {
          count += 1;
        }
      });
    });
    return count;
  }, [mySavingsPlans, memberId]);

  const totalPendingApprovals =
    pendingLoanApprovals + pendingWithdrawalApprovals;

  /* ── Circles ──────────────────────────────────────────── */
  const circles: Circle[] = useMemo(() => {
    const community: Circle[] = (myGroups ?? []).map((g: any) => ({
      kind: "community",
      id: g.group_id,
      name: g.group_name,
      memberCount: g.number_of_members ?? 0,
    }));

    const saccoList: Circle[] = mySaccos.map((s) => ({
      kind: "sacco",
      id: s.sacco_id,
      name: s.group_name,
      memberCount: s.members.filter((m) => m.status === "active").length,
      sasraCategory: s.sasra_license_category,
      sasraVerified: !!s.sasra_verified_at,
    }));

    return [...community, ...saccoList];
  }, [myGroups, mySaccos]);

  const visibleCircles = circles.slice(0, 3);
  const remainingCircles = Math.max(circles.length - visibleCircles.length, 0);

  const invitesBadge = pendingInvites.length;

  /* ── Handlers ─────────────────────────────────────────── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMember(),
        refetchWallet(),
        refetchAccounts(),
        refetchGroups(),
        refetchInvites(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchMember,
    refetchWallet,
    refetchAccounts,
    refetchGroups,
    refetchInvites,
  ]);

  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const goToGroups = useCallback(() => router.push("/(tabs)/groups"), [router]);
  const goToWallet = useCallback(() => router.push("/(tabs)/wallet"), [router]);

  const goToCircle = useCallback(
    (circle: Circle) => {
      if (circle.kind === "sacco") {
        router.push({
          pathname: "/(tabs)/groups/sacco/home",
          params: { sacco_id: circle.id, group_member_id: memberId },
        });
      } else {
        router.push({
          pathname: "/(tabs)/groups/group",
          params: { group_id: circle.id },
        });
      }
    },
    [router, memberId]
  );

  const hasAttention = pendingInvites.length > 0 || totalPendingApprovals > 0;

  /* ── Chart normalisation ──────────────────────────────── */
  const chartMax = useMemo(() => {
    let m = 0;
    buckets.forEach((b) => {
      m = Math.max(m, b.contributed, b.withdrawn + b.loans);
    });
    return m || 1;
  }, [buckets]);

  /* ── Render ───────────────────────────────────────────── */
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
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNotifications}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bellWrap}
          >
            <Clay
              radius={16}
              depth={0}
              bodyStyle={styles.bellBody}
              style={styles.bellShell}
            >
              <BellIcon size={19} color={CLAY.ink} strokeWidth={2.2} />
            </Clay>
            {invitesBadge > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {invitesBadge > 9 ? "9+" : invitesBadge}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* ── Net worth slab ─────────────────────────────── */}
        <Clay
          color={theme.primary}
          radius={RADIUS.xl}
          depth={2}
          highlight="rgba(255,255,255,0.34)"
          shade="rgba(12, 45, 22, 0.42)"
          style={styles.heroShell}
          bodyStyle={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroGlowA} />
          <View pointerEvents="none" style={styles.heroGlowB} />

          <View style={styles.heroTop}>
            <View style={styles.heroEyebrowRow}>
              <Wallet size={12} color="#fff" strokeWidth={2.6} />
              <Text style={styles.heroEyebrow}>NET WORTH</Text>
            </View>
            <TouchableOpacity
              onPress={goToWallet}
              hitSlop={10}
              style={styles.heroLink}
            >
              <Text style={styles.heroLinkText}>Open wallet</Text>
              <ChevronRight size={13} color="#fff" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroAmount} numberOfLines={1}>
            {currencyCode} {formatMoney(ledger.netWorth)}
          </Text>

          <View style={styles.heroChangeRow}>
            {momChange !== 0 ? (
              <>
                {momChange > 0 ? (
                  <TrendingUp size={12} color="#D6F5DF" strokeWidth={2.6} />
                ) : (
                  <TrendingDown size={12} color="#FBDCDC" strokeWidth={2.6} />
                )}
                <Text style={styles.heroChangeText}>
                  {momChange > 0 ? "+" : ""}
                  {momChange}% vs last period
                </Text>
              </>
            ) : (
              <Text style={styles.heroChangeText}>
                No change since last period
              </Text>
            )}
          </View>

          <View style={styles.heroBreakdown}>
            <Breakdown
              label="Wallet"
              value={formatCompactMoney(walletBalance)}
              styles={styles}
            />
            <Breakdown
              label="Share capital"
              value={formatCompactMoney(ledger.shareCapital)}
              styles={styles}
            />
            <Breakdown
              label="Savings"
              value={formatCompactMoney(
                Math.max(ledger.savingsContributed - ledger.savingsWithdrawn, 0)
              )}
              styles={styles}
            />
          </View>
        </Clay>

        {/* ── Range selector ─────────────────────────────── */}
        <View style={styles.segmentWrap}>
          {(["30d", "6m", "1y"] as TimeRange[]).map((r) => {
            const selected = range === r;
            const label =
              r === "30d" ? "30 days" : r === "6m" ? "6 months" : "1 year";
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                activeOpacity={0.9}
                style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Cash flow ──────────────────────────────────── */}
        <Clay style={styles.block} bodyStyle={styles.cardBody}>
          <View style={styles.chartHeader}>
            <View style={{ gap: 2 }}>
              <Text style={styles.chartTitle}>Cash flow</Text>
              <Text style={styles.chartSubtitle}>
                In versus out over the selected range
              </Text>
            </View>
            <View style={styles.chartNetWrap}>
              <Text style={styles.chartNetLabel}>Net</Text>
              <Text
                style={[
                  styles.chartNetValue,
                  { color: rangeNet >= 0 ? ACCENT.green : ACCENT.red },
                ]}
              >
                {rangeNet >= 0 ? "+" : "−"}
                {formatCompactMoney(Math.abs(rangeNet))}
              </Text>
            </View>
          </View>

          <View style={styles.barsRow}>
            {buckets.map((b) => {
              const inH = (b.contributed / chartMax) * 100;
              const outH = ((b.withdrawn + b.loans) / chartMax) * 100;
              return (
                <View key={b.key} style={styles.barGroup}>
                  <View style={styles.barStack}>
                    <View
                      style={[styles.barIn, { height: `${Math.max(inH, 3)}%` }]}
                    />
                    <View
                      style={[styles.barOut, { height: `${Math.max(outH, 3)}%` }]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barLabel,
                      b.isCurrent && styles.barLabelActive,
                    ]}
                  >
                    {b.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: ACCENT.green }]}
              />
              <Text style={styles.legendText}>In</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: ACCENT.red }]}
              />
              <Text style={styles.legendText}>Out</Text>
            </View>
          </View>
        </Clay>

        {/* ── Financial health ───────────────────────────── */}
        <Clay
          style={[styles.block, { marginTop: SPACING.lg }]}
          bodyStyle={styles.healthCard}
        >
          <View style={styles.healthRow}>
            <View style={styles.healthRingWrap}>
              <CircularProgress
                percentage={health.total}
                size={90}
                strokeWidth={7}
                color={health.tierColor}
                backgroundColor={CLAY.sunken}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.healthTierRow}>
                <ShieldCheck
                  size={13}
                  color={health.tierColor}
                  strokeWidth={2.6}
                />
                <Text style={[styles.healthTier, { color: health.tierColor }]}>
                  {health.tier}
                </Text>
              </View>
              <Text style={styles.healthTitle}>Financial health</Text>
              <Text style={styles.healthBody}>
                Six signals: savings, debt, activity, breadth, engagement and
                consistency.
              </Text>
            </View>
          </View>

          <View style={styles.healthBars}>
            <HealthBar
              label="Savings"
              value={health.savings}
              max={25}
              color={ACCENT.teal}
              styles={styles}
            />
            <HealthBar
              label="Debt"
              value={health.debt}
              max={20}
              color={ACCENT.green}
              styles={styles}
            />
            <HealthBar
              label="Activity"
              value={health.contribution}
              max={20}
              color={ACCENT.purple}
              styles={styles}
            />
            <HealthBar
              label="Breadth"
              value={health.diversification}
              max={15}
              color={ACCENT.navy}
              styles={styles}
            />
            <HealthBar
              label="Engagement"
              value={health.engagement}
              max={10}
              color={ACCENT.amber}
              styles={styles}
            />
            <HealthBar
              label="Consistency"
              value={health.consistency}
              max={10}
              color={CLAY.inkSoft}
              styles={styles}
            />
          </View>
        </Clay>

        {/* ── Key ratios ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Gauge size={14} color={theme.primary} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Key ratios</Text>
          </View>
        </View>

        <View style={styles.ratioRow}>
          <RatioCard
            label="Savings rate"
            value={`${Math.round(ratios.savingsRate)}%`}
            helper="of inflow this range"
            status={
              ratios.savingsRate >= 20
                ? "good"
                : ratios.savingsRate >= 10
                ? "fair"
                : "low"
            }
            styles={styles}
          />
          <RatioCard
            label="Debt load"
            value={
              ratios.totalBorrowed > 0
                ? `${Math.round(ratios.debtLoad)}%`
                : "0%"
            }
            helper={
              ratios.totalBorrowed > 0
                ? "of borrowed still owed"
                : "no active loans"
            }
            status={
              ratios.debtLoad === 0
                ? "good"
                : ratios.debtLoad <= 40
                ? "good"
                : ratios.debtLoad <= 70
                ? "fair"
                : "low"
            }
            styles={styles}
          />
          <RatioCard
            label="Liquidity"
            value={`${ratios.liquidityMonths.toFixed(1)}m`}
            helper="of outflow cover"
            status={
              ratios.liquidityMonths >= 3
                ? "good"
                : ratios.liquidityMonths >= 1
                ? "fair"
                : "low"
            }
            styles={styles}
          />
        </View>

        {/* ── Savings goals ──────────────────────────────── */}
        {goals.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <PiggyBank size={14} color={ACCENT.teal} strokeWidth={2.4} />
                <Text style={styles.sectionTitle}>Savings goals</Text>
              </View>
              <TouchableOpacity
                onPress={goToGroups}
                hitSlop={8}
                style={styles.sectionLink}
              >
                <Text style={styles.sectionLinkText}>Details</Text>
                <ChevronRight
                  size={13}
                  color={theme.primary}
                  strokeWidth={2.8}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.listWrap}>
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  currencyCode={currencyCode}
                  styles={styles}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Peer benchmarks ────────────────────────────── */}
        {benchmarks.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Award size={14} color={ACCENT.amber} strokeWidth={2.4} />
                <Text style={styles.sectionTitle}>How you compare</Text>
              </View>
            </View>

            <View style={styles.listWrap}>
              {benchmarks.map((b) => (
                <BenchmarkRow
                  key={b.id}
                  bench={b}
                  currencyCode={currencyCode}
                  styles={styles}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Insights ───────────────────────────────────── */}
        {insights.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insights for you</Text>
            </View>

            <View style={styles.listWrap}>
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  styles={styles}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Financial literacy ─────────────────────────── */}
        {literacy.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <BookOpen size={14} color={ACCENT.navy} strokeWidth={2.4} />
                <Text style={styles.sectionTitle}>
                  Grow your financial skills
                </Text>
              </View>
            </View>

            <View style={styles.listWrap}>
              {literacy.map((card) => (
                <LiteracyCard key={card.id} card={card} styles={styles} />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Money movement ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Compass size={14} color={ACCENT.purple} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Where your money went</Text>
          </View>
        </View>

        <Clay style={styles.block} bodyStyle={styles.categoryCard}>
          <CategoryRow
            icon={ArrowUpCircle}
            label="Savings contributions"
            value={ledger.savingsContributed}
            total={Math.max(
              ledger.savingsContributed +
                ledger.savingsWithdrawn +
                ledger.loansRepaid,
              1
            )}
            color={ACCENT.green}
            soft={ACCENT.greenSoft}
            styles={styles}
          />
          <CategoryRow
            icon={ArrowDownCircle}
            label="Withdrawals"
            value={ledger.savingsWithdrawn}
            total={Math.max(
              ledger.savingsContributed +
                ledger.savingsWithdrawn +
                ledger.loansRepaid,
              1
            )}
            color={ACCENT.red}
            soft={ACCENT.redSoft}
            styles={styles}
          />
          <CategoryRow
            icon={HandCoins}
            label="Loan repayments"
            value={ledger.loansRepaid}
            total={Math.max(
              ledger.savingsContributed +
                ledger.savingsWithdrawn +
                ledger.loansRepaid,
              1
            )}
            color={ACCENT.purple}
            soft={ACCENT.purpleSoft}
            styles={styles}
            last
          />
        </Clay>

        {/* ── Needs attention ────────────────────────────── */}
        {hasAttention ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs your attention</Text>
            </View>

            <View style={styles.listWrap}>
              {pendingInvites.length > 0 ? (
                <AttentionItem
                  icon={Users}
                  color={ACCENT.navy}
                  soft={ACCENT.navySoft}
                  title={`${pendingInvites.length} pending invite${
                    pendingInvites.length === 1 ? "" : "s"
                  }`}
                  subtitle="Review and accept from Groups"
                  onPress={goToGroups}
                  styles={styles}
                />
              ) : null}
              {pendingLoanApprovals > 0 ? (
                <AttentionItem
                  icon={HandCoins}
                  color={ACCENT.purple}
                  soft={ACCENT.purpleSoft}
                  title={`${pendingLoanApprovals} loan approval${
                    pendingLoanApprovals === 1 ? "" : "s"
                  }`}
                  subtitle="SACCO members are waiting for your vote"
                  onPress={goToGroups}
                  styles={styles}
                />
              ) : null}
              {pendingWithdrawalApprovals > 0 ? (
                <AttentionItem
                  icon={ArrowDownCircle}
                  color={ACCENT.red}
                  soft={ACCENT.redSoft}
                  title={`${pendingWithdrawalApprovals} withdrawal approval${
                    pendingWithdrawalApprovals === 1 ? "" : "s"
                  }`}
                  subtitle="Savings plans awaiting your review"
                  onPress={goToGroups}
                  styles={styles}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── Circles ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My circles</Text>
          {circles.length > 0 ? (
            <TouchableOpacity
              onPress={goToGroups}
              hitSlop={8}
              style={styles.sectionLink}
            >
              <Text style={styles.sectionLinkText}>
                {remainingCircles > 0
                  ? `View all · +${remainingCircles}`
                  : "View all"}
              </Text>
              <ChevronRight
                size={13}
                color={theme.primary}
                strokeWidth={2.8}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {circles.length === 0 ? (
          <Clay style={styles.block} bodyStyle={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: ACCENT.navySoft }]}>
              <Users size={22} color={ACCENT.navy} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No circles yet</Text>
            <Text style={styles.emptyBody}>
              Join a community group or SACCO to see them here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/groups/create/picker")}
              activeOpacity={0.9}
              style={[styles.emptyCta, { backgroundColor: theme.primary }]}
            >
              <Plus size={15} color="#fff" strokeWidth={2.6} />
              <Text style={styles.emptyCtaText}>Create one</Text>
            </TouchableOpacity>
          </Clay>
        ) : (
          <Clay style={styles.block} bodyStyle={styles.circlesList}>
            {visibleCircles.map((c, i) => {
              const isLast = i === visibleCircles.length - 1;
              const isSacco = c.kind === "sacco";
              return (
                <TouchableOpacity
                  key={`${c.kind}-${c.id}`}
                  onPress={() => goToCircle(c)}
                  activeOpacity={0.85}
                  style={[styles.circleRow, !isLast && styles.circleDivider]}
                >
                  <GroupAvatar name={c.name} seed={c.id} size={40} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.circleNameRow}>
                      <Text style={styles.circleName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      {isSacco && c.sasraCategory ? (
                        <SaccoBadge
                          category={c.sasraCategory}
                          verified={c.sasraVerified}
                          size="sm"
                        />
                      ) : null}
                    </View>
                    <Text style={styles.circleMeta}>
                      {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <ChevronRight
                    size={14}
                    color={CLAY.inkFaint}
                    strokeWidth={2.4}
                  />
                </TouchableOpacity>
              );
            })}
          </Clay>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Breakdown({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.breakdownItem}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function HealthBar({
  label,
  value,
  max,
  color,
  styles,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  styles: any;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.healthBarItem}>
      <View style={styles.healthBarHeader}>
        <Text style={styles.healthBarLabel}>{label}</Text>
        <Text style={styles.healthBarValue}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.healthBarTrack}>
        <View
          style={[
            styles.healthBarFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function RatioCard({
  label,
  value,
  helper,
  status,
  styles,
}: {
  label: string;
  value: string;
  helper: string;
  status: "good" | "fair" | "low";
  styles: any;
}) {
  const color =
    status === "good"
      ? ACCENT.green
      : status === "fair"
      ? ACCENT.amber
      : ACCENT.red;

  return (
    <Clay radius={RADIUS.lg} depth={0} style={styles.ratioShell} bodyStyle={styles.ratioCard}>
      <Text style={styles.ratioLabel}>{label}</Text>
      <Text style={[styles.ratioValue, { color }]}>{value}</Text>
      <Text style={styles.ratioHelper}>{helper}</Text>
    </Clay>
  );
}

function GoalCard({
  goal,
  currencyCode,
  styles,
}: {
  goal: GoalProjection;
  currencyCode: string;
  styles: any;
}) {
  const color =
    goal.status === "done"
      ? ACCENT.green
      : goal.status === "slow"
      ? ACCENT.amber
      : ACCENT.teal;

  return (
    <Clay bodyStyle={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalName} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={[styles.goalPct, { color }]}>{goal.pct}%</Text>
      </View>

      <View style={styles.goalTrack}>
        <View
          style={[
            styles.goalFill,
            { width: `${goal.pct}%`, backgroundColor: color },
          ]}
        />
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalFooterText}>
          {currencyCode} {formatMoney(goal.contributed)} of {currencyCode}{" "}
          {formatMoney(goal.target)}
        </Text>
        {goal.etaLabel ? (
          <Text style={styles.goalFooterText}>ETA {goal.etaLabel}</Text>
        ) : goal.status === "slow" ? (
          <Text style={[styles.goalFooterText, { color: ACCENT.amber }]}>
            No recent contributions
          </Text>
        ) : null}
      </View>
    </Clay>
  );
}

function BenchmarkRow({
  bench,
  currencyCode,
  styles,
}: {
  bench: Benchmark;
  currencyCode: string;
  styles: any;
}) {
  const better = bench.ratio >= 1;
  const pct = bench.avgValue > 0 ? Math.min(bench.ratio, 2) : 0;
  const color = better ? ACCENT.green : ACCENT.amber;
  const label = bench.unit === "shares" ? "share capital" : "contributed";

  return (
    <Clay bodyStyle={styles.benchCard}>
      <View style={styles.benchHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.benchName} numberOfLines={1}>
            {bench.circleName}
          </Text>
          <Text style={styles.benchMeta}>
            Your {label} versus the circle average
          </Text>
        </View>
        <View
          style={[
            styles.benchBadge,
            { backgroundColor: better ? ACCENT.greenSoft : ACCENT.amberSoft },
          ]}
        >
          <Text style={[styles.benchBadgeText, { color }]}>
            {better ? "Above avg" : "Below avg"}
          </Text>
        </View>
      </View>

      <View style={styles.benchBarWrap}>
        <View style={styles.benchBarTrack}>
          <View
            style={[
              styles.benchBarFill,
              {
                width: `${Math.min(pct * 50, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
          <View style={[styles.benchMarker, { left: "50%" }]} />
        </View>
      </View>

      <View style={styles.benchFooter}>
        <Text style={styles.benchFooterText}>
          You: {currencyCode} {formatCompactMoney(bench.myValue)}
        </Text>
        <Text style={styles.benchFooterText}>
          Avg: {currencyCode} {formatCompactMoney(bench.avgValue)}
        </Text>
      </View>
    </Clay>
  );
}

/**
 * Insight card.
 * No iconography — a toned rule, an uppercase category label, a headline and
 * a body sentence. Reads like a written note, not a generated tip.
 */
function InsightCard({
  insight,
  styles,
}: {
  insight: Insight;
  styles: any;
}) {
  const accent =
    insight.tone === "positive"
      ? ACCENT.green
      : insight.tone === "warning"
      ? ACCENT.amber
      : ACCENT.navy;

  const label =
    insight.tone === "positive"
      ? "Positive"
      : insight.tone === "warning"
      ? "Attention"
      : "Note";

  return (
    <Clay bodyStyle={styles.insightCard}>
      <View style={[styles.insightRule, { backgroundColor: accent }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.insightLabel, { color: accent }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightBody}>{insight.body}</Text>
      </View>
    </Clay>
  );
}

function LiteracyCard({
  card,
  styles,
}: {
  card: LiteracyCard;
  styles: any;
}) {
  return (
    <Clay bodyStyle={styles.literacyCard}>
      <View style={[styles.literacyRule, { backgroundColor: ACCENT.navy }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.literacyLabel, { color: ACCENT.navy }]}>
          LESSON
        </Text>
        <Text style={styles.literacyTitle}>{card.title}</Text>
        <Text style={styles.literacyBody}>{card.body}</Text>
      </View>
    </Clay>
  );
}

function CategoryRow({
  icon: Icon,
  label,
  value,
  total,
  color,
  soft,
  styles,
  last,
}: {
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  value: number;
  total: number;
  color: string;
  soft: string;
  styles: any;
  last?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <View style={[styles.categoryRow, !last && styles.categoryDivider]}>
      <View style={[styles.categoryIcon, { backgroundColor: soft }]}>
        <Icon size={14} color={color} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryLabel}>{label}</Text>
          <Text style={styles.categoryPct}>{pct}%</Text>
        </View>
        <View style={styles.categoryTrack}>
          <View
            style={[
              styles.categoryFill,
              { width: `${pct}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
      <Text style={styles.categoryValue}>{formatCompactMoney(value)}</Text>
    </View>
  );
}

function AttentionItem({
  icon: Icon,
  color,
  soft,
  title,
  subtitle,
  onPress,
  styles,
}: {
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  soft: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Clay bodyStyle={styles.attentionRow}>
        <View style={[styles.attentionIcon, { backgroundColor: soft }]}>
          <Icon size={15} color={color} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.attentionTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.attentionMeta} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <ChevronRight size={14} color={color} strokeWidth={2.6} />
      </Clay>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: CLAY.canvas },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: SPACING.xxl },

    /* Header */
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    greeting: {
      fontSize: 12.5,
      fontWeight: "600",
      color: CLAY.inkSoft,
      letterSpacing: 0.3,
    },
    name: {
      fontSize: 26,
      fontWeight: "800",
      color: CLAY.ink,
      letterSpacing: -0.8,
    },
    bellWrap: { position: "relative" },
    bellShell: { borderRadius: 16 },
    bellBody: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: ACCENT.red,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: CLAY.canvas,
    },
    bellBadgeText: {
      color: "#fff",
      fontSize: 9.5,
      fontWeight: "800",
      lineHeight: 12,
    },

    /* Hero */
    heroShell: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.sm,
    },
    hero: {
      padding: SPACING.lg + 2,
      gap: SPACING.sm,
      overflow: "hidden",
    },
    heroGlowA: {
      position: "absolute",
      top: -70,
      right: -50,
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    heroGlowB: {
      position: "absolute",
      bottom: -60,
      left: -40,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: "#fff",
      opacity: 0.85,
    },
    heroLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 3,
    },
    heroLinkText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
      opacity: 0.9,
    },
    heroAmount: {
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1.2,
      color: "#fff",
      fontVariant: ["tabular-nums"],
      marginTop: 4,
    },
    heroChangeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    heroChangeText: {
      fontSize: 11.5,
      color: "#fff",
      opacity: 0.85,
      fontWeight: "600",
    },
    heroBreakdown: {
      flexDirection: "row",
      gap: SPACING.md,
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.22)",
    },
    breakdownItem: { flex: 1, gap: 3 },
    breakdownLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: "#fff",
      opacity: 0.65,
      textTransform: "uppercase",
    },
    breakdownValue: {
      fontSize: 13,
      fontWeight: "800",
      color: "#fff",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.3,
    },

    /* Segmented control (recessed clay) */
    segmentWrap: {
      flexDirection: "row",
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.xl,
      padding: 5,
      borderRadius: RADIUS.md,
      backgroundColor: CLAY.sunken,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: RADIUS.sm,
      alignItems: "center",
    },
    segmentBtnActive: {
      backgroundColor: CLAY.surfaceRaised,
      shadowColor: CLAY.shade,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 7,
      elevation: 3,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "700",
      color: CLAY.inkSoft,
    },
    segmentTextActive: { color: theme.primary },

    /* Shared layout */
    block: { marginHorizontal: SPACING.xl, marginTop: SPACING.lg },
    listWrap: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
    cardBody: { padding: SPACING.lg, gap: SPACING.md },

    /* Chart */
    chartHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: CLAY.ink,
      letterSpacing: -0.2,
    },
    chartSubtitle: {
      fontSize: 11.5,
      color: CLAY.inkSoft,
      fontWeight: "500",
    },
    chartNetWrap: { alignItems: "flex-end", gap: 2 },
    chartNetLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: CLAY.inkFaint,
      textTransform: "uppercase",
    },
    chartNetValue: {
      fontSize: 16,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.3,
    },
    barsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: 120,
      gap: 6,
    },
    barGroup: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      height: "100%",
      gap: 6,
    },
    barStack: {
      flex: 1,
      width: "100%",
      flexDirection: "row",
      gap: 3,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    barIn: {
      flex: 1,
      backgroundColor: ACCENT.green,
      borderRadius: 6,
      opacity: 0.92,
      minHeight: 3,
    },
    barOut: {
      flex: 1,
      backgroundColor: ACCENT.red,
      borderRadius: 6,
      opacity: 0.92,
      minHeight: 3,
    },
    barLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: CLAY.inkFaint,
      fontVariant: ["tabular-nums"],
    },
    barLabelActive: { color: CLAY.ink, fontWeight: "800" },
    chartLegend: {
      flexDirection: "row",
      gap: SPACING.md,
      paddingTop: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CLAY.hairline,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: {
      fontSize: 11,
      color: CLAY.inkSoft,
      fontWeight: "600",
    },

    /* Health */
    healthCard: { padding: SPACING.lg, gap: SPACING.md },
    healthRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
    healthRingWrap: {
      width: 90,
      height: 90,
      alignItems: "center",
      justifyContent: "center",
    },
    healthTierRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    healthTier: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    healthTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: CLAY.ink,
      letterSpacing: -0.3,
    },
    healthBody: {
      fontSize: 11.5,
      color: CLAY.inkSoft,
      lineHeight: 16,
      fontWeight: "500",
    },
    healthBars: {
      gap: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CLAY.hairline,
    },
    healthBarItem: { gap: 4 },
    healthBarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    healthBarLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: CLAY.inkSoft,
      letterSpacing: 0.3,
    },
    healthBarValue: {
      fontSize: 11,
      fontWeight: "800",
      color: CLAY.ink,
      fontVariant: ["tabular-nums"],
    },
    healthBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: CLAY.sunken,
      overflow: "hidden",
    },
    healthBarFill: { height: "100%", borderRadius: 3 },

    /* Section headers */
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.xxl,
      marginBottom: SPACING.md,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionTitle: {
      fontSize: TYPE.h3,
      fontWeight: "800",
      color: CLAY.ink,
      letterSpacing: -0.3,
    },
    sectionLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    sectionLinkText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
      letterSpacing: 0.2,
    },

    /* Ratios */
    ratioRow: {
      flexDirection: "row",
      gap: SPACING.md,
      paddingHorizontal: SPACING.xl,
    },
    ratioShell: { flex: 1, borderRadius: RADIUS.lg },
    ratioCard: {
      paddingVertical: SPACING.md + 2,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      gap: 3,
    },
    ratioLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: CLAY.inkFaint,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      textAlign: "center",
    },
    ratioValue: {
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },
    ratioHelper: {
      fontSize: 10,
      color: CLAY.inkSoft,
      textAlign: "center",
      fontWeight: "500",
      lineHeight: 13,
    },

    /* Goals */
    goalCard: {
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      gap: SPACING.sm,
    },
    goalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
    },
    goalName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.2,
    },
    goalPct: {
      fontSize: 16,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    goalTrack: {
      height: 7,
      borderRadius: 4,
      backgroundColor: CLAY.sunken,
      overflow: "hidden",
    },
    goalFill: { height: "100%", borderRadius: 4 },
    goalFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    goalFooterText: {
      fontSize: 11,
      color: CLAY.inkSoft,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },

    /* Benchmarks */
    benchCard: {
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      gap: SPACING.md,
    },
    benchHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
    benchName: {
      fontSize: 13.5,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.1,
    },
    benchMeta: {
      fontSize: 11,
      color: CLAY.inkSoft,
      fontWeight: "500",
    },
    benchBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 9,
    },
    benchBadgeText: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    benchBarWrap: { paddingVertical: 4 },
    benchBarTrack: {
      height: 7,
      borderRadius: 4,
      backgroundColor: CLAY.sunken,
      overflow: "hidden",
      position: "relative",
    },
    benchBarFill: { height: "100%", borderRadius: 4 },
    benchMarker: {
      position: "absolute",
      top: -2,
      width: 2,
      height: 11,
      backgroundColor: CLAY.inkFaint,
      opacity: 0.7,
      borderRadius: 1,
    },
    benchFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    benchFooterText: {
      fontSize: 11,
      color: CLAY.inkSoft,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },

    /* Insight (no icon) */
    insightCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.md,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
    },
    insightRule: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2,
    },
    insightLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 1,
    },
    insightTitle: {
      fontSize: 13.5,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.1,
    },
    insightBody: {
      fontSize: 12,
      color: CLAY.inkSoft,
      lineHeight: 17,
      fontWeight: "500",
    },

    /* Literacy (no icon) */
    literacyCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.md,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
    },
    literacyRule: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2,
      opacity: 0.85,
    },
    literacyLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 1,
    },
    literacyTitle: {
      fontSize: 13.5,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.1,
    },
    literacyBody: {
      fontSize: 12,
      color: CLAY.inkSoft,
      lineHeight: 17,
      fontWeight: "500",
    },

    /* Category breakdown */
    categoryCard: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.lg,
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingVertical: SPACING.md,
    },
    categoryDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLAY.hairline,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    categoryLabel: {
      fontSize: 12.5,
      fontWeight: "700",
      color: CLAY.ink,
    },
    categoryPct: {
      fontSize: 11,
      fontWeight: "800",
      color: CLAY.inkSoft,
      fontVariant: ["tabular-nums"],
    },
    categoryTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: CLAY.sunken,
      overflow: "hidden",
    },
    categoryFill: { height: "100%", borderRadius: 3 },
    categoryValue: {
      fontSize: 12.5,
      fontWeight: "800",
      color: CLAY.ink,
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.2,
      minWidth: 58,
      textAlign: "right",
    },

    /* Attention */
    attentionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
    },
    attentionIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    attentionTitle: {
      fontSize: 13.5,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.1,
    },
    attentionMeta: {
      fontSize: 11,
      color: CLAY.inkSoft,
      fontWeight: "500",
    },

    /* Circles */
    circlesList: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.lg,
    },
    circleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingVertical: SPACING.md,
    },
    circleDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLAY.hairline,
    },
    circleNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    circleName: {
      fontSize: 14,
      fontWeight: "700",
      color: CLAY.ink,
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    circleMeta: {
      fontSize: 11.5,
      color: CLAY.inkSoft,
      fontWeight: "500",
    },

    /* Empty state */
    emptyCard: {
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      gap: SPACING.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm,
    },
    emptyTitle: {
      fontSize: 15,
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
    },
    emptyCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    emptyCtaText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  });
}