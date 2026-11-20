import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import {
  BellIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Mail,
  FileText,
  Eye,
  EyeOff,
  Megaphone,
  TrendingUp,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react-native";

import { GroupAvatar } from "@/components/myGroups/GroupAvatar";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useMemberData } from "@/hooks/useMemberData";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useMemberInvites } from "@/hooks/useMemberInvites";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import { useTabBarBottomInset } from "@/lib/layout/tabBar";
import { useWalletRealtime } from "@/hooks/useWalletRealTime";
import { formatDate } from "@/utils/custom_functions";
import { openGroup } from "@/lib/navigation/openGroup";

/* ================================================================== */
/*  DESIGN TOKENS & CONSTANTS                                         */
/* ================================================================== */
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;
const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;

const CLAY = {
  canvas: "#F5F7FA",
  surface: "#FFFFFF",
  sunken: "#EDF1F7",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.14)",
  shade: "rgba(148, 163, 184, 0.25)",
  skeleton: "#E2E8F0",
} as const;

const ACCENT = {
  green: "#3E9B62",
  greenSoft: "#DBEFE1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  purple: "#7A6AC0",
  purpleSoft: "#E6E2F7",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
} as const;

// 1. BULLETPROOF FORMAT MONEY
const formatMoney = (n: number | undefined | null) => {
  if (n === undefined || n === null) return "0";
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
};

const TRUSTLOOP_NEWS = [
  { id: "n1", title: "Chama Growth Report", desc: "Your active groups grew by 15% in contributions this month.", icon: TrendingUp, color: ACCENT.green, bg: ACCENT.greenSoft, grad: ["#2F8A52", "#1B5E38"] as const },
  { id: "n2", title: "M-Pesa System Update", desc: "Faster deposit processing scheduled for this weekend.", icon: Megaphone, color: ACCENT.navy, bg: ACCENT.navySoft, grad: ["#3F639A", "#2A4879"] as const },
  { id: "n3", title: "SACCO Dividends", desc: "New dividend payout calculations are now live. Check your SACCO tab.", icon: ShieldCheck, color: ACCENT.purple, bg: ACCENT.purpleSoft, grad: ["#6D5CB5", "#4C3E8F"] as const },
];

const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 128;

/* ================================================================== */
/*  COMPONENT: MINI STATEMENT MODAL                                   */
/* ================================================================== */
const MiniStatementModal = ({ visible, onClose, userEmail }: { visible: boolean, onClose: () => void, userEmail: string }) => {
  const [step, setStep] = useState<"select" | "loading" | "success" | "error">("select");
  const [range, setRange] = useState<"7d" | "14d" | "30d">("7d");
  const [email, setEmail] = useState(userEmail);

  const handleSend = () => {
    setStep("loading");
    setTimeout(() => {
      setStep("success");
    }, 2000);
  };

  const resetAndClose = () => {
    setStep("select");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Email Mini Statement</Text>
              <TouchableOpacity onPress={resetAndClose}><X size={24} color={CLAY.ink} /></TouchableOpacity>
            </View>

            {step === "select" && (
              <>
                <Text style={styles.modalLabel}>Select Date Range</Text>
                <View style={styles.rangeGrid}>
                  {(["7d", "14d", "30d"] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                      onPress={() => setRange(r)}
                    >
                      <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
                        {r === "7d" ? "Last 7 Days" : r === "14d" ? "Last 14 Days" : "Last 30 Days"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Send to Email</Text>
                <TextInput
                  style={styles.modalInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSend}>
                  <Mail size={20} color="#fff" />
                  <Text style={styles.modalSubmitBtnText}>Send Statement</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "loading" && (
              <View style={styles.modalStateWrap}>
                <ActivityIndicator size="large" color={ACCENT.green} />
                <Text style={styles.modalStateTitle}>Generating Statement...</Text>
                <Text style={styles.modalStateDesc}>We are compiling your records and sending to {email}</Text>
              </View>
            )}

            {step === "success" && (
              <View style={styles.modalStateWrap}>
                <CheckCircle2 size={56} color={ACCENT.green} />
                <Text style={styles.modalStateTitle}>Sent Successfully!</Text>
                <Text style={styles.modalStateDesc}>Your mini statement has been sent to {email}. It may take up to 2 minutes to arrive.</Text>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={resetAndClose}>
                  <Text style={styles.modalSubmitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/* ================================================================== */
/*  COMPONENT: FULL STATEMENT MODAL                                   */
/* ================================================================== */
const FullStatementModal = ({ visible, onClose, userEmail }: { visible: boolean, onClose: () => void, userEmail: string }) => {
  const [step, setStep] = useState<"select" | "loading" | "success">("select");
  const [month, setMonth] = useState<string>("");
  const [email, setEmail] = useState(userEmail);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleRequest = () => {
    setStep("loading");
    setTimeout(() => setStep("success"), 2500);
  };

  const resetAndClose = () => {
    setStep("select");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Full Statement</Text>
              <TouchableOpacity onPress={resetAndClose}><X size={24} color={CLAY.ink} /></TouchableOpacity>
            </View>

            {step === "select" && (
              <>
                <Text style={styles.modalLabel}>Select Month to Audit</Text>
                <View style={styles.rangeGrid}>
                  {months.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.rangeBtn, month === m && styles.rangeBtnActive]}
                      onPress={() => setMonth(m)}
                    >
                      <Text style={[styles.rangeBtnText, month === m && styles.rangeBtnTextActive]}>{m} 2023</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Send to Email</Text>
                <TextInput
                  style={styles.modalInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, !month && styles.modalSubmitBtnDisabled]}
                  onPress={handleRequest}
                  disabled={!month}
                >
                  <FileText size={20} color="#fff" />
                  <Text style={styles.modalSubmitBtnText}>Request Statement</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "loading" && (
              <View style={styles.modalStateWrap}>
                <ActivityIndicator size="large" color={ACCENT.navy} />
                <Text style={styles.modalStateTitle}>Processing Request...</Text>
                <Text style={styles.modalStateDesc}>Generating your full {month} statement. This may take a moment.</Text>
              </View>
            )}

            {step === "success" && (
              <View style={styles.modalStateWrap}>
                <CheckCircle2 size={56} color={ACCENT.navy} />
                <Text style={styles.modalStateTitle}>Request Received</Text>
                <Text style={styles.modalStateDesc}>Your {month} statement is being prepared and will be emailed to {email} shortly.</Text>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={resetAndClose}>
                  <Text style={styles.modalSubmitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/* ================================================================== */
/*  COMPONENT: SKELETON LOADING & ERROR STATES                        */
/* ================================================================== */
const HomeSkeleton = () => (
  <View style={styles.skeletonRoot}>
    <View style={styles.skeletonHeader}>
      <View>
        <View style={styles.skeletonGreeting} />
        <View style={styles.skeletonName} />
      </View>
      <View style={styles.skeletonBell} />
    </View>
    <View style={styles.skeletonBalance}>
      <View style={styles.skeletonLabel} />
      <View style={styles.skeletonAmount} />
    </View>
    <View style={styles.skeletonCard} />
  </View>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.errorRoot}>
    <AlertCircle size={48} color={ACCENT.red} />
    <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
    <TouchableOpacity onPress={onRetry} style={styles.errorBtn}>
      <Text style={styles.errorBtnText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

/* ================================================================== */
/*  MAIN COMPONENT: HOME DASHBOARD                                    */
/* ================================================================== */
export default function HomeScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const tabBarInset = useTabBarBottomInset();
  const { claims } = useAuthContext();

  /* ── UI State ── */
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "in" | "out">("all");
  const [isTxExpanded, setIsTxExpanded] = useState(false);
  const [isDataVisible, setIsDataVisible] = useState(true);

  const [isMiniModalOpen, setIsMiniModalOpen] = useState(false);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);

  /* ── News Carousel Auto-Slide Logic ── */
  const [newsIndex, setNewsIndex] = useState(0);
  const newsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => setNewsIndex((prev) => (prev + 1) % TRUSTLOOP_NEWS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (newsScrollRef.current) {
      newsScrollRef.current.scrollTo({ x: newsIndex * (CARD_WIDTH + SPACING.md), animated: true });
    }
  }, [newsIndex]);

  /* ── REAL DATA HOOKS ── */
  const { data: member, refetch: refetchMember, isLoading: isMemberLoading, isError: isMemberError } = useMemberData();
  const memberId = member?.id;

  const { data: wallet, refetch: refetchWallet, isLoading: isWalletLoading, isError: isWalletError } = useUserWallet(memberId);
  const { data: accounts, refetch: refetchAccounts, isLoading: isAccountsLoading } = useWalletAccounts(wallet?.wallet_id);

  const { groups: myGroups, refetch: refetchGroups } = useGetMemberGroups();
  const { invites: pendingInvites, refetch: refetchInvites } = useMemberInvites(memberId);

  useWalletRealtime(wallet?.wallet_id);

  const {
    data: realTransactions,
    refetch: refetchTransactions,
    isLoading: isTxLoading
  } = useTransactionHistory(memberId);

  const allSaccos = useSaccoStorage((s) => s.saccos);

  // 2. MASTER LOADING STATE (INCLUDES TRANSACTIONS)
  const isInitialLoading = isMemberLoading || isWalletLoading || isAccountsLoading || isTxLoading;
  const hasError = isMemberError || isWalletError;

  /* ── Computed Data ── */
  const firstName = member?.first_name ?? "customer";
  const userEmail = claims?.email ?? "customer@trustloop.com";

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Habari ya asubuhi";
    if (h < 17) return "Habari ya mchana";
    return "Habari ya jioni";
  }, []);

  const walletBalance = useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + (a.available_balance ?? 0), 0),
    [accounts]
  );

  const mySaccos = useMemo(
    () => allSaccos.filter((s) => s.members.some((m) => m.group_member_id === memberId && m.status === "active")),
    [allSaccos, memberId]
  );

  const circles = useMemo(() => {
    const community = (myGroups ?? []).map((g: any) => ({
      id: g.group_id, name: g.group_name, kind: "community" as const, memberCount: g.number_of_members ?? 0,
    }));
    const saccos = mySaccos.map((s) => ({
      id: s.sacco_id, name: s.group_name, kind: "sacco" as const, memberCount: s.members.filter((m) => m.status === "active").length,
    }));
    return [...community, ...saccos];
  }, [myGroups, mySaccos]);

  const actionCenterGroups = useMemo(() => {
    const groupsWithActions: Record<string, { name: string; kind: "community" | "sacco"; actions: any[] }> = {};
    if ((pendingInvites ?? []).length > 0) {
      groupsWithActions["invites"] = {
        name: "Pending Invites", kind: "community",
        actions: pendingInvites.map((i: any) => ({ id: i.id, title: `Invite to join ${i.group_name || "a group"}`, type: "invite" })),
      };
    }
    circles.slice(0, 2).forEach((circle) => {
      if (!circle?.id) return;
      groupsWithActions[circle.id] = {
        name: circle.name, kind: circle.kind as any,
        actions: [{ id: "a1", title: "penalty reminder", type: "penalty" }, { id: "a2", title: "Contribution due", type: "contribution" }],
      };
    });
    return Object.entries(groupsWithActions).map(([id, data]) => ({ id, ...data }));
  }, [circles, pendingInvites]);

  // 3. PROPER SUPABASE DATA MAPPING
  const displayedTransactions = useMemo(() => {
    let filtered = realTransactions ?? [];

    // Map the UI filter ("in" / "out") to the Supabase database ("credit" / "debit")
    if (txFilter === "in") filtered = filtered.filter((t) => t.entry_type === "credit");
    if (txFilter === "out") filtered = filtered.filter((t) => t.entry_type === "debit");

    const limit = (txFilter === "all" && isTxExpanded) ? 10 : 5;

    // Map to UI expected fields
    return filtered.slice(0, limit).map((tx) => ({
      id: tx.id,
      type: tx.entry_type === "credit" ? "in" : "out",
      title: tx.trans_category || "Transaction",
      amount: tx.entry_amount || 0,
      group: tx.account_involved || "Wallet",
      created_at: tx.created_at,
    }));
  }, [txFilter, isTxExpanded, realTransactions]);

  /* ── Handlers ── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMember(), refetchWallet(), refetchAccounts(), refetchGroups(), refetchInvites(), refetchTransactions()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchMember, refetchWallet, refetchAccounts, refetchGroups, refetchInvites, refetchTransactions]);

  const toggleAccordion = (id: string) => setExpandedGroupId((prev) => (prev === id ? null : id));
  const handleFilterPress = (filter: "all" | "in" | "out") => {
    setTxFilter(filter);
    if (filter !== "all") setIsTxExpanded(false);
  };

  const goToWallet = () => router.push("/(tabs)/wallet");
  const goToGroups = () => router.push("/(tabs)/groups");
  const goToGroup = (g: { id: string; kind: "community" | "sacco" }) => openGroup(router, g, memberId);

  if (isInitialLoading) return <HomeSkeleton />;
  if (hasError) return <ErrorState onRetry={handleRefresh} />;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#E8F5E9", "#F5F7FA"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: tabBarInset + 150 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {/* 1. Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} style={styles.bellWrap} accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={8}>
              <BellIcon size={24} color={CLAY.ink} strokeWidth={2} />
              {pendingInvites.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
          </View>

          {/* 2. Balance — open on the canvas, no card */}
          <View style={styles.balanceArea}>
            <View style={styles.balanceHeaderRow}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <TouchableOpacity onPress={() => setIsDataVisible(!isDataVisible)} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel={isDataVisible ? "Hide balance" : "Show balance"} hitSlop={12}>
                {isDataVisible ? <Eye size={20} color={CLAY.inkSoft} /> : <EyeOff size={20} color={CLAY.inkSoft} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              <Text style={styles.balanceCurrency}>KES </Text>
              {isDataVisible ? formatMoney(walletBalance) : "\u2022".repeat(6)}
            </Text>

            <View style={styles.balanceSubRow}>
              <View style={styles.trustScorePill}>
                <ShieldCheck size={20} color={ACCENT.green} />
                <Text style={styles.trustScoreText}>TrustScore: 20</Text>
              </View>
              <TouchableOpacity onPress={goToWallet} style={styles.manageWalletBtn}>
                <Text style={styles.manageWalletText}>Manage Wallet</Text>
                <ChevronRight size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. TrustLoop News — flat tinted tiles */}
          <View style={styles.newsSection}>
            <ScrollView
              ref={newsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + SPACING.md}
              decelerationRate="fast"
              contentContainerStyle={styles.newsScroll}
            >
              {TRUSTLOOP_NEWS.map((news) => {
                const Icon = news.icon;
                return (
                  <LinearGradient
                    key={news.id}
                    colors={news.grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.newsTile}
                  >
                    <Icon size={110} color="rgba(255,255,255,0.14)" style={styles.newsWatermark} />
                    <View style={styles.newsIconChip}>
                      <Icon size={18} color="#fff" />
                    </View>
                    <View style={styles.newsTextWrap}>
                      <Text style={styles.newsTitle}>{news.title}</Text>
                      <Text style={styles.newsDesc} numberOfLines={2}>{news.desc}</Text>
                    </View>
                  </LinearGradient>
                );
              })}
            </ScrollView>
            <View style={styles.paginationDots}>
              {TRUSTLOOP_NEWS.map((_, i) => (
                <View key={i} style={[styles.dot, newsIndex === i && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* 4. My Groups — avatars on the canvas */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Groups</Text>
            <TouchableOpacity onPress={goToGroups}><Text style={styles.linkText}>View All</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupsScroll}>
            {circles.length === 0 ? (
              <Text style={styles.emptyText}>No groups joined yet.</Text>
            ) : (
              circles.map((c) => (
                <TouchableOpacity key={`${c.kind}-${c.id}`} style={styles.groupItem} onPress={() => goToGroup(c)} accessibilityRole="button" accessibilityLabel={`Open ${c.name}`}>
                  <GroupAvatar name={c.name} seed={c.id} size={56} />
                  <Text style={styles.groupName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.groupMeta}>{c.kind === "sacco" ? "SACCO" : "Community"}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* 5. Action Center — one flat list */}
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Action Center</Text></View>
          <View style={styles.listWrap}>
            {actionCenterGroups.length === 0 ? (
              <Text style={styles.emptyText}>Uko sawa! No pending actions.</Text>
            ) : (
              actionCenterGroups.map((group) => {
                const isExpanded = expandedGroupId === group.id;
                return (
                  <View key={group.id} style={styles.accordionContainer}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleAccordion(group.id)} activeOpacity={0.7}>
                      <View style={styles.accordionHeaderMain}>
                        <Text style={styles.accordionTitle}>{group.name}</Text>
                        <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{group.actions.length}</Text></View>
                      </View>
                      {isExpanded ? <ChevronUp size={20} color={CLAY.inkSoft} /> : <ChevronDown size={20} color={CLAY.inkSoft} />}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.accordionBody}>
                        {group.actions.map((action: any) => (
                          <TouchableOpacity
                            key={action.id}
                            style={styles.actionItem}
                            onPress={() => (group.id === "invites" ? goToGroups() : goToGroup({ id: group.id, kind: group.kind }))}
                          >
                            <Text style={styles.actionItemText}>{action.title}</Text>
                            <ChevronRight size={14} color={CLAY.inkFaint} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* 6. Recent Activity — flat ledger */}
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Transactions</Text></View>
          <View style={styles.listWrap}>
            <View style={styles.txFilters}>
              {(["all", "in", "out"] as const).map(f => (
                <TouchableOpacity key={f} onPress={() => handleFilterPress(f)} style={[styles.txFilterTab, txFilter === f && styles.txFilterTabActive]}>
                  <Text style={[styles.txFilterText, txFilter === f && styles.txFilterTextActive]}>{f.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {displayedTransactions.length === 0 ? (
              <View style={styles.emptyState}><Text style={styles.emptyText}>No recent transactions</Text></View>
            ) : (
              displayedTransactions.map((tx: any) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIconWrap, tx.type === "in" ? styles.txIconIn : styles.txIconOut]}>
                    {tx.type === "in" ? <ArrowDownLeft size={16} color={ACCENT.green} /> : <ArrowUpRight size={16} color={ACCENT.red} />}
                  </View>
                  <View style={styles.txBody}>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txDate}>
                      {formatDate(tx.created_at, "medium_date")} • {tx.group}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, tx.type === "in" ? styles.txAmountIn : styles.txAmountOut]}>
                    {isDataVisible ? `${tx.type === "in" ? "+" : "-"} KES ${formatMoney(tx.amount)}` : `KES ••••`}
                  </Text>
                </View>
              ))
            )}

            {txFilter === "all" && (
              <TouchableOpacity style={styles.expandTxBtn} onPress={() => setIsTxExpanded(prev => !prev)}>
                <Text style={styles.expandTxText}>{isTxExpanded ? "View Less" : "View 5 More"}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.statementActions}>
              <TouchableOpacity style={styles.statementBtn} onPress={() => setIsMiniModalOpen(true)}>
                <Mail size={20} color={CLAY.ink} />
                <Text style={styles.statementBtnText}>Mini Statement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statementBtn} onPress={() => setIsFullModalOpen(true)}>
                <FileText size={20} color={CLAY.ink} />
                <Text style={styles.statementBtnText}>Full Statement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <MiniStatementModal
        visible={isMiniModalOpen}
        onClose={() => setIsMiniModalOpen(false)}
        userEmail={userEmail}
      />
      <FullStatementModal
        visible={isFullModalOpen}
        onClose={() => setIsFullModalOpen(false)}
        userEmail={userEmail}
      />
    </View>
  );
}

/* ================================================================== */
/*  STYLESHEET                                                        */
/* ================================================================== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  safe: { flex: 1 },
  scroll: { flex: 1 },

  // Skeleton
  skeletonRoot: { flex: 1, backgroundColor: CLAY.canvas, padding: SPACING.xl },
  skeletonHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.huge },
  skeletonGreeting: { width: 120, height: 16, borderRadius: 8, backgroundColor: CLAY.skeleton, marginBottom: SPACING.sm },
  skeletonName: { width: 100, height: 24, borderRadius: 8, backgroundColor: CLAY.skeleton },
  skeletonBell: { width: 40, height: 40, borderRadius: 20, backgroundColor: CLAY.skeleton },
  skeletonBalance: { marginTop: SPACING.huge },
  skeletonLabel: { width: 100, height: 16, borderRadius: 8, backgroundColor: CLAY.skeleton, marginBottom: SPACING.md },
  skeletonAmount: { width: 240, height: 48, borderRadius: 8, backgroundColor: CLAY.skeleton },
  skeletonCard: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: RADIUS.lg, backgroundColor: CLAY.skeleton, marginTop: SPACING.huge },

  // Error
  errorRoot: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl, backgroundColor: CLAY.canvas },
  errorTitle: { fontSize: 18, fontWeight: "700", color: CLAY.ink, marginTop: SPACING.md },
  errorBtn: { backgroundColor: ACCENT.green, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.xl },
  errorBtnText: { color: "#fff", fontWeight: "700" },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  headerText: { flex: 1 },
  greeting: { fontSize: 14, fontWeight: "500", color: CLAY.inkSoft },
  name: { fontSize: 24, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.5, marginTop: 2 },
  bellWrap: { position: "relative", padding: SPACING.sm },
  bellBadge: { position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT.red, borderWidth: 2, borderColor: "#E8F5E9" },

  // Balance (typography only)
  balanceArea: { paddingHorizontal: SPACING.xl, marginTop: SPACING.huge },
  balanceHeaderRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  balanceLabel: { fontSize: 14, fontWeight: "600", color: CLAY.inkSoft },
  eyeBtn: { padding: SPACING.xs },
  balanceCurrency: { fontSize: 20, fontWeight: "600", color: CLAY.inkSoft, letterSpacing: 0 },
  balanceAmount: { fontSize: 46, fontWeight: "700", color: CLAY.ink, letterSpacing: -1.8, marginTop: SPACING.xs, fontVariant: ["tabular-nums"] },
  balanceSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.lg },
  trustScorePill: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, backgroundColor: ACCENT.greenSoft, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 12 },
  trustScoreText: { fontSize: 11, fontWeight: "700", color: ACCENT.green },
  manageWalletBtn: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  manageWalletText: { fontSize: 13, fontWeight: "700", color: CLAY.ink },

  // News
  newsSection: { marginTop: SPACING.huge },
  newsScroll: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  newsTile: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: RADIUS.lg, padding: SPACING.lg, justifyContent: "space-between", overflow: "hidden" },
  newsWatermark: { position: "absolute", right: -18, bottom: -22 },
  newsIconChip: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  newsTextWrap: { width: "78%" },
  newsTitle: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: -0.2, marginBottom: 2 },
  newsDesc: { fontSize: 12, color: "rgba(255,255,255,0.88)", lineHeight: 16, fontWeight: "500" },
  paginationDots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: SPACING.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CLAY.skeleton },
  dotActive: { width: 18, height: 6, borderRadius: 3, backgroundColor: CLAY.inkSoft },

  // Sections & empty states
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.xl, marginTop: SPACING.huge, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.3 },
  linkText: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft },
  listWrap: { marginHorizontal: SPACING.xl },
  emptyState: { paddingVertical: SPACING.xl, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: CLAY.inkSoft, fontStyle: "italic", paddingVertical: SPACING.md },

  // Groups
  groupsScroll: { paddingHorizontal: SPACING.xl, gap: SPACING.xl, paddingTop: SPACING.sm },
  groupItem: { width: 76, alignItems: "center", gap: SPACING.xs },
  groupName: { fontSize: 13, fontWeight: "700", color: CLAY.ink, textAlign: "center", marginTop: SPACING.xs },
  groupMeta: { fontSize: 10, color: CLAY.inkSoft, textAlign: "center" },

  // Action Center
  accordionContainer: { marginBottom: SPACING.xs },
  accordionHeader: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.lg },
  accordionHeaderMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: CLAY.ink },
  actionBadge: { backgroundColor: ACCENT.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  actionBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  accordionBody: { paddingLeft: SPACING.md, paddingBottom: SPACING.sm, marginBottom: SPACING.md },
  actionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SPACING.md },
  actionItemText: { fontSize: 14, color: CLAY.ink, fontWeight: "500" },

  // Transactions
  txFilters: { flexDirection: "row", alignSelf: "flex-start", backgroundColor: CLAY.sunken, borderRadius: RADIUS.sm, padding: 3, marginTop: SPACING.xs, marginBottom: SPACING.sm },
  txFilterTab: { paddingHorizontal: SPACING.lg, paddingVertical: 6, borderRadius: 8 },
  txFilterTabActive: { backgroundColor: CLAY.surface },
  txFilterText: { fontSize: 12, fontWeight: "700", color: CLAY.inkSoft },
  txFilterTextActive: { color: CLAY.ink },
  txRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  txIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txIconIn: { backgroundColor: ACCENT.greenSoft },
  txIconOut: { backgroundColor: ACCENT.redSoft },
  txBody: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: "700", color: CLAY.ink },
  txDate: { fontSize: 12, color: CLAY.inkSoft, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
  txAmountIn: { color: ACCENT.green },
  txAmountOut: { color: CLAY.ink },
  expandTxBtn: { paddingVertical: SPACING.md, alignItems: "center" },
  expandTxText: { fontSize: 13, fontWeight: "700", color: CLAY.inkSoft },
  statementActions: { flexDirection: "row", alignItems: "center", marginTop: SPACING.sm },
  statementBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.lg },
  statementBtnText: { fontSize: 12, fontWeight: "700", color: CLAY.ink },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: CLAY.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, minHeight: 400 },
  modalGrabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: CLAY.skeleton, marginBottom: SPACING.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: "800", color: CLAY.ink },
  modalLabel: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  rangeGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  rangeBtn: { paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: CLAY.sunken },
  rangeBtnActive: { backgroundColor: ACCENT.green },
  rangeBtnText: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft },
  rangeBtnTextActive: { color: "#fff" },
  modalInput: { backgroundColor: CLAY.sunken, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: 15, color: CLAY.ink },
  modalSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, backgroundColor: ACCENT.green, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.xxl },
  modalSubmitBtnDisabled: { opacity: 0.5 },
  modalSubmitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalStateWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl },
  modalStateTitle: { fontSize: 18, fontWeight: "800", color: CLAY.ink, marginTop: SPACING.lg },
  modalStateDesc: { fontSize: 14, color: CLAY.inkSoft, textAlign: "center", marginTop: SPACING.sm, lineHeight: 20 },
});