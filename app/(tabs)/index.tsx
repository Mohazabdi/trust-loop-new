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

/* ================================================================== */
/*  DESIGN TOKENS & CONSTANTS                                         */
/* ================================================================== */
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;

const CLAY = {
  canvas: "#F5F7FA",
  surface: "#FFFFFF",
  sunken: "#EDF1F7",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.1)",
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
  { id: "n1", title: "Chama Growth Report", desc: "Your active groups grew by 15% in contributions this month.", icon: TrendingUp, color: ACCENT.green, bg: ACCENT.greenSoft },
  { id: "n2", title: "M-Pesa System Update", desc: "Faster deposit processing scheduled for this weekend.", icon: Megaphone, color: ACCENT.navy, bg: ACCENT.navySoft },
  { id: "n3", title: "SACCO Dividends", desc: "New dividend payout calculations are now live. Check your SACCO tab.", icon: ShieldCheck, color: ACCENT.purple, bg: ACCENT.purpleSoft },
];

const CARD_WIDTH = SCREEN_WIDTH * 0.65; 
const CARD_HEIGHT = 150;

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
                  style={[styles.modalSubmitBtn, !month && { opacity: 0.5 }]} 
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
const SkeletonBox = ({ width, height, borderRadius = 8, style = {} }: any) => (
  <View style={[{ width, height, borderRadius, backgroundColor: CLAY.skeleton }, style]} />
);

const HomeSkeleton = () => (
  <View style={[styles.root, { padding: SPACING.xl }]}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 60 }}>
      <View>
        <SkeletonBox width={120} height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width={100} height={24} />
      </View>
      <SkeletonBox width={40} height={40} borderRadius={20} />
    </View>
    <View style={{ marginTop: SPACING.xxl }}>
      <SkeletonBox width={100} height={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width={220} height={42} style={{ marginBottom: 16 }} />
    </View>
    <SkeletonBox width={CARD_WIDTH} height={CARD_HEIGHT} borderRadius={20} style={{ marginTop: SPACING.xxl }} />
  </View>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <View style={[styles.root, { justifyContent: "center", alignItems: "center", padding: SPACING.xl }]}>
    <AlertCircle size={48} color={ACCENT.red} />
    <Text style={{ fontSize: 18, fontWeight: "700", color: CLAY.ink, marginTop: SPACING.md }}>Oops! Something went wrong</Text>
    <TouchableOpacity onPress={onRetry} style={{ backgroundColor: ACCENT.green, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.xl }}>
      <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
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
      id: g.group_id, name: g.group_name, kind: "community", memberCount: g.number_of_members ?? 0,
    }));
    const saccos = mySaccos.map((s) => ({
      id: s.sacco_id, name: s.group_name, kind: "sacco", memberCount: s.members.filter((m) => m.status === "active").length,
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

  if (isInitialLoading) return <HomeSkeleton />;
  if (hasError) return <ErrorState onRetry={handleRefresh} />;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#E8F5E9", "#F5F7FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: tabBarInset + 150 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {/* 1. Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginTop: 50 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} style={styles.bellWrap}>
              <BellIcon size={24} color={CLAY.ink} strokeWidth={2} />
              {pendingInvites.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
          </View>

          {/* 2. Balance Area */}
          <View style={styles.balanceArea}>
            <View style={styles.balanceHeaderRow}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <TouchableOpacity onPress={() => setIsDataVisible(!isDataVisible)} style={{ padding: 4 }}>
                {isDataVisible ? <Eye size={20} color={CLAY.inkSoft} /> : <EyeOff size={20} color={CLAY.inkSoft} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {isDataVisible ? `KES ${formatMoney(walletBalance)}` : `KES ${"\u2022".repeat(6)}`}
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

          {/* 3. TrustLoop Square News Carousel */}
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
                  <View key={news.id} style={[styles.newsCard, { backgroundColor: news.bg, width: CARD_WIDTH }]}>
                    <View style={[styles.newsIconWrap, { backgroundColor: "#fff" }]}>
                      <Icon size={20} color={news.color} />
                    </View>
                    <Text style={[styles.newsTitle, { color: news.color }]}>{news.title}</Text>
                    <Text style={styles.newsDesc} numberOfLines={3}>{news.desc}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.paginationDots}>
              {TRUSTLOOP_NEWS.map((_, i) => (
                <View key={i} style={[styles.dot, newsIndex === i && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* 4. My Groups */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Groups</Text>
            <TouchableOpacity onPress={goToGroups}><Text style={styles.linkText}>View All</Text></TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupsScroll}>
            {circles.length === 0 ? (
              <View style={styles.emptyStateCard}><Text style={styles.emptyText}>No groups joined yet.</Text></View>
            ) : (
              circles.map((c) => (
                <TouchableOpacity key={c.id} style={styles.groupCard} onPress={() => goToGroups()}>
                  <GroupAvatar name={c.name} seed={c.id} size={50} />
                  <Text style={styles.groupName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.groupMeta}>{c.kind === "sacco" ? "SACCO" : "Community"}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* 5. Action Center */}
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Action Center</Text></View>
          <View style={styles.actionCenterWrapper}>
            {actionCenterGroups.length === 0 ? (
              <View style={styles.emptyStateCard}><Text style={styles.emptyText}>Uko sawa! No pending actions.</Text></View>
            ) : (
              actionCenterGroups.map((group) => {
                const isExpanded = expandedGroupId === group.id;
                return (
                  <View key={group.id} style={styles.accordionContainer}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleAccordion(group.id)} activeOpacity={0.7}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.accordionTitle}>{group.name}</Text>
                        <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{group.actions.length}</Text></View>
                      </View>
                      {isExpanded ? <ChevronUp size={20} color={CLAY.inkSoft} /> : <ChevronDown size={20} color={CLAY.inkSoft} />}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.accordionBody}>
                        {group.actions.map((action: any) => (
                          <TouchableOpacity key={action.id} style={styles.actionItem}>
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

          {/* 6. Recent Activity */}
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Transactions</Text></View>
          <View style={styles.txCard}>
            <View style={styles.txFilters}>
              {(["all", "in", "out"] as const).map(f => (
                <TouchableOpacity key={f} onPress={() => handleFilterPress(f)} style={[styles.txFilterPill, txFilter === f && styles.txFilterPillActive]}>
                  <Text style={[styles.txFilterText, txFilter === f && styles.txFilterTextActive]}>{f.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {displayedTransactions.length === 0 ? (
              <View style={styles.emptyState}><Text style={styles.emptyText}>No recent transactions</Text></View>
            ) : (
              displayedTransactions.map((tx: any, index: number) => (
                <View key={tx.id} style={[styles.txRow, index !== displayedTransactions.length - 1 && styles.txDivider]}>
                  <View style={[styles.txIconWrap, { backgroundColor: tx.type === "in" ? ACCENT.greenSoft : ACCENT.redSoft }]}>
                    {tx.type === "in" ? <ArrowDownLeft size={16} color={ACCENT.green} /> : <ArrowUpRight size={16} color={ACCENT.red} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txDate}>
                      {formatDate(tx.created_at, "medium_date")} • {tx.group}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === "in" ? ACCENT.green : CLAY.ink }]}>
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
  scroll: { flex: 1 },
  
  // Header
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  greeting: { fontSize: 14, fontWeight: "500", color: CLAY.inkSoft },
  name: { fontSize: 24, fontWeight: "800", color: CLAY.ink, letterSpacing: -0.5, marginTop: 2 },
  bellWrap: { position: "relative", padding: 8 },
  bellBadge: { position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT.red, borderWidth: 2, borderColor: "#E8F5E9" },

  // Balance
  balanceArea: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  balanceHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceLabel: { fontSize: 14, fontWeight: "600", color: CLAY.inkSoft },
  balanceAmount: { fontSize: 42, fontWeight: "800", color: CLAY.ink, letterSpacing: -1.5, marginTop: 4, fontVariant: ["tabular-nums"] },
  balanceSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.lg },
  trustScorePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: ACCENT.greenSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  trustScoreText: { fontSize: 11, fontWeight: "700", color: ACCENT.green },
  manageWalletBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  manageWalletText: { fontSize: 13, fontWeight: "700", color: CLAY.ink },

  // News Carousel
  newsSection: { marginTop: SPACING.xxl },
  newsScroll: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  newsCard: { height: CARD_HEIGHT, borderRadius: RADIUS.lg, padding: SPACING.lg, justifyContent: "space-between" },
  newsIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm },
  newsTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  newsDesc: { fontSize: 12, color: CLAY.inkSoft, lineHeight: 16, fontWeight: "500" },
  paginationDots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: SPACING.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CLAY.sunken },
  dotActive: { width: 18, height: 6, borderRadius: 3, backgroundColor: CLAY.inkSoft },

  // Section Headers & Empty States
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.xl, marginTop: SPACING.xxl, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: CLAY.ink, letterSpacing: -0.3 },
  linkText: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft },
  emptyState: { padding: SPACING.xl, alignItems: "center", justifyContent: "center" },
  emptyStateCard: { padding: SPACING.xl, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderRadius: RADIUS.lg, width: "100%" },
  emptyText: { fontSize: 13, color: CLAY.inkSoft, fontStyle: "italic" },

  // Groups
  groupsScroll: { paddingHorizontal: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.md },
  groupCard: { width: 130, backgroundColor: CLAY.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: "center", gap: SPACING.sm, shadowColor: CLAY.shade, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  groupName: { fontSize: 13, fontWeight: "700", color: CLAY.ink, textAlign: "center", marginTop: 4 },
  groupMeta: { fontSize: 10, color: CLAY.inkSoft, textAlign: "center", marginTop: 2 },

  // Action Center
  actionCenterWrapper: { marginHorizontal: SPACING.xl, backgroundColor: "#fff", borderRadius: RADIUS.lg, overflow: "hidden", shadowColor: CLAY.shade, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  accordionContainer: { borderBottomWidth: 1, borderBottomColor: CLAY.hairline },
  accordionHeader: { flexDirection: "row", alignItems: "center", padding: SPACING.lg },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: CLAY.ink },
  actionBadge: { backgroundColor: ACCENT.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  actionBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  accordionBody: { backgroundColor: CLAY.canvas, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  actionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: CLAY.hairline },
  actionItemText: { fontSize: 14, color: CLAY.ink, fontWeight: "500" },

  // Transactions
  txCard: { marginHorizontal: SPACING.xl, backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.lg, shadowColor: CLAY.shade, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  txFilters: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  txFilterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: CLAY.sunken },
  txFilterPillActive: { backgroundColor: CLAY.ink },
  txFilterText: { fontSize: 11, fontWeight: "700", color: CLAY.inkSoft },
  txFilterTextActive: { color: "#fff" },
  txRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  txDivider: { borderBottomWidth: 1, borderBottomColor: CLAY.hairline },
  txIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  txTitle: { fontSize: 14, fontWeight: "700", color: CLAY.ink },
  txDate: { fontSize: 12, color: CLAY.inkSoft, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
  expandTxBtn: { paddingVertical: SPACING.md, alignItems: "center" },
  expandTxText: { fontSize: 13, fontWeight: "700", color: CLAY.inkSoft },
  statementActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: CLAY.hairline },
  statementBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, backgroundColor: CLAY.canvas, borderRadius: RADIUS.md },
  statementBtnText: { fontSize: 12, fontWeight: "700", color: CLAY.ink },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, minHeight: 400 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.xl },
  modalTitle: { fontSize: 18, fontWeight: "800", color: CLAY.ink },
  modalLabel: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  rangeGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  rangeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: CLAY.sunken },
  rangeBtnActive: { backgroundColor: ACCENT.green },
  rangeBtnText: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft },
  rangeBtnTextActive: { color: "#fff" },
  modalInput: { borderWidth: 1, borderColor: CLAY.hairline, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: 14, color: CLAY.ink, marginTop: SPACING.xs },
  modalSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: ACCENT.green, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.xxl },
  modalSubmitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalStateWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl },
  modalStateTitle: { fontSize: 18, fontWeight: "800", color: CLAY.ink, marginTop: SPACING.lg },
  modalStateDesc: { fontSize: 14, color: CLAY.inkSoft, textAlign: "center", marginTop: SPACING.sm, lineHeight: 20 },
});