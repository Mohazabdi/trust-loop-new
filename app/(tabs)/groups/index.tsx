import { EmptyState } from "@/components/myGroups/EmptyState";
import { GroupAvatar } from "@/components/myGroups/GroupAvatar";
import { SkeletonCard } from "@/components/myGroups/SkeletonCard";
import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberInvites } from "@/hooks/useMemberInvites";
import { useDiscoverableGroups } from "@/hooks/useDiscoverableGroups";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import { supabase } from "@/lib/mysupabase/supabase";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useMemberJoinRequestMessages } from "@/hooks/useMemberJoinRequestMessages";
import type { SasraLicenseCategory } from "@/lib/types/sacco";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell, BellIcon, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Compass, Eye, Inbox,
  MailOpen, MessageSquare, Plus, Search, Send, Users, X, XCircle,
} from "lucide-react-native";
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Modal,
  Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { useTabBarBottomInset } from "@/lib/layout/tabBar";
import { openGroup as navigateToGroup } from "@/lib/navigation/openGroup";

/* ================================================================== */
/*  DESIGN TOKENS — shared with the Home dashboard                    */
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
  skeleton: "#E2E8F0",
} as const;

const ACCENT = {
  green: "#3E9B62",
  greenSoft: "#DBEFE1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
} as const;

const DISCOVER_CARD_WIDTH = 250;
const DISCOVER_CARD_GAP = 10;
const DISCOVER_INTERVAL = DISCOVER_CARD_WIDTH + DISCOVER_CARD_GAP;
const DISCOVER_SIDE_PADDING = (SCREEN_WIDTH - DISCOVER_CARD_WIDTH) / 2;

type UnifiedGroup = {
  kind: "community" | "sacco";
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  unreadCount: number;
  sasraCategory?: SasraLicenseCategory;
  sasraVerified?: boolean;
};

type JoinState = "ask" | "pending" | "approved";

const plural = (n: number) => `${n} member${n !== 1 ? "s" : ""}`;

function formatRelativeDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ================================================================== */
/*  PRESENTATIONAL COMPONENTS                                         */
/*  Defined at module level so they are NOT re-created on every       */
/*  render (that remounting was what made parts vanish/flicker).      */
/* ================================================================== */
const SectionHeader = ({
  title, count, hint, trailing, accent = ACCENT.navy,
}: { title: string; count?: number; hint?: string; trailing?: ReactNode; accent?: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.sectionCountPill, { backgroundColor: `${accent}22` }]}>
            <Text style={[styles.sectionCountText, { color: accent }]}>{count}</Text>
          </View>
        )}
      </View>
      {trailing}
    </View>
    {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
  </View>
);

const GroupRow = ({ group, onPress }: { group: UnifiedGroup; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.groupRow}>
    <GroupAvatar name={group.name} seed={group.id} size={48} />
    <View style={styles.groupBody}>
      <View style={styles.groupNameRow}>
        <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
        {group.kind === "sacco" && group.sasraCategory ? (
          <SaccoBadge category={group.sasraCategory} verified={group.sasraVerified} size="sm" />
        ) : null}
      </View>
      <View style={styles.groupMetaRow}>
        <Users size={12} color={CLAY.inkSoft} strokeWidth={2.2} />
        <Text style={styles.groupMeta}>{plural(group.memberCount)}</Text>
        {group.unreadCount > 0 && (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadText}>{group.unreadCount} new</Text>
          </View>
        )}
      </View>
    </View>
    <ChevronRight size={18} color={CLAY.inkFaint} strokeWidth={2.2} />
  </TouchableOpacity>
);

const InviteTile = ({
  invite, onAccept, onDecline,
}: { invite: any; onAccept: () => void; onDecline: () => void }) => (
  <View style={styles.inviteTile}>
    <View style={styles.inviteTop}>
      <GroupAvatar name={invite.group_name} seed={invite.group_id ?? invite.invitation_id} size={42} />
      <View style={styles.inviteText}>
        <Text numberOfLines={1} style={styles.inviteName}>{invite.group_name}</Text>
        <Text numberOfLines={1} style={styles.inviteMeta}>
          {invite.inviter_first_name} {invite.inviter_last_name} invited you
        </Text>
      </View>
      <View style={styles.inviteTag}>
        <Text style={styles.inviteTagText}>Invite</Text>
      </View>
    </View>
    <View style={styles.inviteActions}>
      <TouchableOpacity onPress={onDecline} activeOpacity={0.8} style={[styles.inviteBtn, styles.inviteBtnGhost]}>
        <Text style={styles.inviteBtnGhostText}>Decline</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onAccept} activeOpacity={0.8} style={[styles.inviteBtn, styles.inviteBtnPrimary]}>
        <Text style={styles.inviteBtnPrimaryText}>Accept</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const InvitesEmptyState = () => (
  <View style={styles.emptyInline}>
    <View style={styles.emptyInlineIcon}>
      <MailOpen size={18} color={ACCENT.navy} strokeWidth={2.2} />
    </View>
    <View style={styles.emptyInlineText}>
      <Text style={styles.emptyInlineTitle}>No pending invites</Text>
      <Text style={styles.emptyInlineBody}>Group invitations from admins will land here</Text>
    </View>
  </View>
);

const DiscoverEmptyState = ({
  searching, failed, onRetry,
}: { searching: boolean; failed: boolean; onRetry: () => void }) => (
  <View style={styles.sectionBody}>
    <View style={styles.emptyBlock}>
      <View style={styles.emptyIcon}>
        <Compass size={22} color={ACCENT.navy} strokeWidth={2.2} />
      </View>
      <Text style={styles.emptyTitle}>
        {failed ? "Couldn't load groups" : searching ? "No groups match your search" : "No groups to discover yet"}
      </Text>
      <Text style={styles.emptyBody}>
        {failed
          ? "Check your connection and try again"
          : searching
          ? "Try a different name or clear the search"
          : "New groups looking for members will appear here"}
      </Text>
      {failed && (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.85} style={styles.emptyRetry}>
          <Text style={styles.emptyRetryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const DiscoverSwipeHint = ({ total, activeIndex }: { total: number; activeIndex: number }) => {
  if (total <= 1) return null;
  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < total - 1;
  return (
    <View style={styles.swipeHint}>
      <ChevronLeft size={16} color={ACCENT.navy} strokeWidth={2.4} style={canGoLeft ? undefined : styles.chevronOff} />
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
      <ChevronRight size={16} color={ACCENT.navy} strokeWidth={2.4} style={canGoRight ? undefined : styles.chevronOff} />
    </View>
  );
};

const JOIN_BUTTON = {
  ask: { label: "Ask to join", Icon: Send, btn: "joinAsk", text: "joinAskText", color: "#fff" },
  pending: { label: "Request sent", Icon: Clock, btn: "joinPending", text: "joinPendingText", color: ACCENT.amber },
  approved: { label: "Invite pending", Icon: Check, btn: "joinApproved", text: "joinApprovedText", color: ACCENT.green },
} as const;

const DiscoverTile = ({
  group, index, scrollX, state, submitting, onView, onAsk,
}: {
  group: any; index: number; scrollX: SharedValue<number>; state: JoinState;
  submitting: boolean; onView: () => void; onAsk: () => void;
}) => {
  const cfg = JOIN_BUTTON[state];
  const disabled = state !== "ask" || submitting;

  const animatedStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * DISCOVER_INTERVAL, index * DISCOVER_INTERVAL, (index + 1) * DISCOVER_INTERVAL];
    return {
      opacity: interpolate(scrollX.value, input, [0.72, 1, 0.72], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollX.value, input, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[styles.discoverTile, animatedStyle]}>
      <View style={styles.discoverTop}>
        <GroupAvatar name={group.group_name} seed={group.group_id} size={56} />
        <Text numberOfLines={1} style={styles.discoverName}>{group.group_name}</Text>
        <View style={styles.groupMetaRow}>
          <Users size={12} color={CLAY.inkSoft} strokeWidth={2.2} />
          <Text style={styles.groupMeta}>{plural(group.member_count)}</Text>
        </View>
      </View>

      {group.group_description ? (
        <Text numberOfLines={2} style={styles.discoverBody}>{group.group_description}</Text>
      ) : null}

      <View style={styles.discoverActions}>
        <TouchableOpacity onPress={onView} activeOpacity={0.8} style={styles.discoverGhostBtn}>
          <Eye size={14} color={CLAY.ink} strokeWidth={2.2} />
          <Text style={styles.discoverGhostText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAsk}
          disabled={disabled}
          activeOpacity={0.85}
          style={[styles.discoverPrimaryBtn, styles[cfg.btn]]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={cfg.color} />
          ) : (
            <>
              <cfg.Icon size={13} color={cfg.color} strokeWidth={2.4} />
              <Text style={[styles.discoverPrimaryText, styles[cfg.text]]}>{cfg.label}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/* ================================================================== */
/*  SCREEN                                                            */
/* ================================================================== */
export default function GroupIndexPage() {
  const router = useRouter();
  const tabBarInset = useTabBarBottomInset();

  const [messagesModalVisible, setMessagesModalVisible] = useState(false);
  const { data: memberData } = useMemberData();
  const memberId = memberData?.id;

  const { groups: myGroups, loading: myGroupsLoading, error: myGroupsError, refetch: refetchMyGroups } = useGetMemberGroups();
  const { invites: pendingInvites, loading: invitesLoading, error: invitesError, refetch: refetchInvites } = useMemberInvites(memberId);
  const { groups: discoverableGroups, loading: discoverLoading, error: discoverError, refetch: refetchDiscover } = useDiscoverableGroups(memberId);
  const { requestMap, refetch: refetchRequests, submitRequest, submitting } = useJoinRequests(memberId);
  const { messages, loading: messagesLoading, error: messagesError, refetch: refetchMessages } = useMemberJoinRequestMessages(memberId);

  /* ── SACCOs the current member belongs to (local storage) ── */
  const allSaccos = useSaccoStorage((s) => s.saccos);
  const mySaccos = useMemo(
    () => allSaccos.filter((s) => s.members.some((m) => m.group_member_id === memberId && m.status === "active")),
    [allSaccos, memberId]
  );

  const reviewedMessages = useMemo(() => messages.filter((m) => m.request_status !== "pending"), [messages]);
  const { unreadCount: messagesBadgeCount, markAsSeen: markMessagesAsSeen } =
    useNotificationBadge(`badge_join_messages_${memberId ?? "anon"}`, reviewedMessages);

  const openMessages = () => {
    markMessagesAsSeen();
    setMessagesModalVisible(true);
  };

  /* ── Refetch plumbing ── */
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const refetchMyGroupsRef = useRef(refetchMyGroups);
  const refetchInvitesRef = useRef(refetchInvites);
  const refetchDiscoverRef = useRef(refetchDiscover);
  const refetchRequestsRef = useRef(refetchRequests);
  const refetchMessagesRef = useRef(refetchMessages);

  useEffect(() => { refetchMyGroupsRef.current = refetchMyGroups; }, [refetchMyGroups]);
  useEffect(() => { refetchInvitesRef.current = refetchInvites; }, [refetchInvites]);
  useEffect(() => { refetchDiscoverRef.current = refetchDiscover; }, [refetchDiscover]);
  useEffect(() => { refetchRequestsRef.current = refetchRequests; }, [refetchRequests]);
  useEffect(() => { refetchMessagesRef.current = refetchMessages; }, [refetchMessages]);

  const refetchAll = useCallback(
    () =>
      Promise.all([
        refetchMyGroupsRef.current(),
        refetchInvitesRef.current(),
        refetchDiscoverRef.current(),
        refetchRequestsRef.current(),
        refetchMessagesRef.current(),
      ]),
    []
  );

  // Pull-to-refresh has its own state so the spinner never hangs on `loading`
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchAll(); } finally { setRefreshing(false); }
  }, [refetchAll]);

  const hasFetchedOnce = useRef(false);
  const prevRefresh = useRef(refresh);

  useFocusEffect(
    useCallback(() => {
      if (!hasFetchedOnce.current) {
        hasFetchedOnce.current = true;
        refetchAll();
        return;
      }
      if (refresh !== prevRefresh.current) {
        prevRefresh.current = refresh;
        refetchAll();
      }
    }, [refresh, refetchAll])
  );

  /* ── Invite actions ── */
  const acceptInvite = async (invitationId: string) => {
    if (!memberId) return;
    try {
      const { data, error } = await supabase.rpc("accept_group_invitation", {
        p_invitation_id: invitationId,
        p_member_id: memberId,
      });
      if (error) throw new Error(error.message);
      const result = data?.[0];
      if (result?.status === "success" || result?.status === "already_member") {
        Alert.alert("Invite Accepted", result.message);
        refetchInvites();
        refetchMyGroups();
        refetchDiscover();
      } else {
        Alert.alert("Error", result?.message || "Could not accept invite.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const declineInvite = async (invitationId: string) => {
    if (!memberId) return;
    try {
      const { data, error } = await supabase.rpc("decline_group_invitation", {
        p_invitation_id: invitationId,
        p_member_id: memberId,
      });
      if (error) throw new Error(error.message);
      const result = data?.[0];
      if (result?.status === "success" || result?.status === "already_declined") {
        Alert.alert("Invite Declined", result.message);
        refetchInvites();
      } else {
        Alert.alert("Error", result?.message || "Could not decline invite.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  /* ── Search + unified list ── */
  const [searchText, setSearchText] = useState("");

  const unifiedGroups: UnifiedGroup[] = useMemo(() => {
    const community: UnifiedGroup[] = (myGroups ?? []).map((g: any) => ({
      kind: "community",
      id: g.group_id,
      name: g.group_name,
      description: g.group_description,
      memberCount: g.number_of_members ?? 0,
      unreadCount: g.no_of_unread_notifications ?? 0,
    }));
    const saccoList: UnifiedGroup[] = mySaccos.map((s) => ({
      kind: "sacco",
      id: s.sacco_id,
      name: s.group_name,
      description: s.description,
      memberCount: s.members.filter((m) => m.status === "active").length,
      unreadCount: 0,
      sasraCategory: s.sasra_license_category,
      sasraVerified: !!s.sasra_verified_at,
    }));
    return [...community, ...saccoList];
  }, [myGroups, mySaccos]);

  const q = searchText.trim().toLowerCase();

  const filteredMyGroups = useMemo(
    () => (!q ? unifiedGroups : unifiedGroups.filter((g) => g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q))),
    [unifiedGroups, q]
  );
  const filteredInvites = useMemo(
    () => (!q ? pendingInvites : pendingInvites.filter((inv) => inv.group_name.toLowerCase().includes(q))),
    [pendingInvites, q]
  );
  const filteredDiscover = useMemo(
    () => (!q ? discoverableGroups : discoverableGroups.filter((g) => g.group_name.toLowerCase().includes(q) || (g.group_description ?? "").toLowerCase().includes(q))),
    [discoverableGroups, q]
  );

  const [showAllMyGroups, setShowAllMyGroups] = useState(false);
  const displayedMyGroups = showAllMyGroups ? filteredMyGroups : filteredMyGroups.slice(0, 5);

  /* ── Join modal ── */
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinTargetGroup, setJoinTargetGroup] = useState<any>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinMessageError, setJoinMessageError] = useState("");

  const openJoinModal = (group: any) => {
    setJoinTargetGroup(group);
    setJoinMessage("");
    setJoinMessageError("");
    setJoinModalVisible(true);
  };

  const closeJoinModal = () => {
    setJoinModalVisible(false);
    setJoinTargetGroup(null);
    setJoinMessage("");
    setJoinMessageError("");
  };

  const handleSubmitJoinRequest = async () => {
    if (!joinMessage.trim()) {
      setJoinMessageError("Please enter a message for your request.");
      return;
    }
    if (!memberId || !joinTargetGroup) return;
    const success = await submitRequest(joinTargetGroup.group_id, memberId, joinMessage.trim());
    if (success) {
      const name = joinTargetGroup.group_name;
      closeJoinModal();
      refetchDiscover();
      refetchRequests();
      Alert.alert("Request Sent", `Your request to join "${name}" has been sent.`);
    }
  };

  const getJoinState = (groupId: string): JoinState => {
    const status = requestMap[groupId];
    if (status === "pending") return "pending";
    if (status === "approved") return "approved";
    return "ask";
  };

  const handleViewGroup = (group: any) =>
    router.push({
      pathname: "/(tabs)/groups/preview",
      params: { groupId: group.group_id, groupName: group.group_name },
    });

  const openGroup = (group: UnifiedGroup) => navigateToGroup(router, group, memberId);

  /* ── Discover carousel ── */
  const scrollX = useSharedValue(0);
  const [activeDiscoverIndex, setActiveDiscoverIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  useAnimatedReaction(
    () => Math.round(scrollX.value / DISCOVER_INTERVAL),
    (current, previous) => {
      if (current !== previous && current >= 0) runOnJS(setActiveDiscoverIndex)(current);
    }
  );

  /* ── Derived flags ── */
  const loading = myGroupsLoading || invitesLoading || discoverLoading;
  const error = myGroupsError || invitesError || discoverError;
  const hasAnyData = unifiedGroups.length > 0 || pendingInvites.length > 0 || discoverableGroups.length > 0;
  const isFirstTimeEmpty = !loading && !error && !hasAnyData;
  const showSections = !isFirstTimeEmpty && !(error && !hasAnyData);
  const hasNoResults =
    !loading && filteredMyGroups.length === 0 && filteredInvites.length === 0 && filteredDiscover.length === 0;


  return (
    <View style={styles.root}>
      <LinearGradient colors={["#E8F5E9", "#F5F7FA"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: tabBarInset + 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT.green} colors={[ACCENT.green]} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Groups</Text>
            <TouchableOpacity
              onPress={openMessages}
              style={styles.bellWrap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Join request messages"
            >
              <BellIcon size={24} color={CLAY.ink} strokeWidth={2} />
              {messagesBadgeCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{messagesBadgeCount > 9 ? "9+" : messagesBadgeCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Summary — open on the canvas */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{unifiedGroups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, pendingInvites.length > 0 && styles.statValueHighlight]}>{pendingInvites.length}</Text>
              <Text style={styles.statLabel}>Invites</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{discoverableGroups.length}</Text>
              <Text style={styles.statLabel}>Discover</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={18} color={CLAY.inkSoft} strokeWidth={2.2} />
            <TextInput
              placeholder="Find a group or SACCO..."
              placeholderTextColor={CLAY.inkFaint}
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")} hitSlop={10}>
                <X size={18} color={CLAY.inkSoft} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error — only blocks the screen when there is nothing to show */}
          {!loading && error && (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleRefresh} activeOpacity={0.85} style={styles.errorRetry}>
                <Text style={styles.errorRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {isFirstTimeEmpty && (
            <EmptyState
              icon={Inbox}
              title="No groups yet"
              description="Create a community group or SACCO, or discover existing groups to start saving together."
              accentColor={ACCENT.green}
              action={{ label: "Create a group", onPress: () => router.push("/(tabs)/groups/create/picker") }}
            />
          )}

          {showSections && !loading && hasNoResults && q.length > 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Nothing matches "{searchText}"</Text>
            </View>
          )}

          {showSections && (
            <>
              {/* Invites */}
              <View style={styles.section}>
                <SectionHeader title="Invites" count={filteredInvites.length} accent={ACCENT.green} />
                {invitesLoading && pendingInvites.length === 0 ? (
                  <SkeletonCard height={96} />
                ) : (
                  <View style={styles.sectionBody}>
                    {filteredInvites.length > 0 ? (
                      filteredInvites.map((invite: any) => (
                        <InviteTile
                          key={invite.invitation_id}
                          invite={invite}
                          onAccept={() => acceptInvite(invite.invitation_id)}
                          onDecline={() => declineInvite(invite.invitation_id)}
                        />
                      ))
                    ) : (
                      <InvitesEmptyState />
                    )}
                  </View>
                )}
              </View>

              {/* My groups */}
              <View style={styles.section}>
                <SectionHeader
                  title="My groups"
                  count={filteredMyGroups.length}
                  trailing={
                    filteredMyGroups.length > 5 ? (
                      <TouchableOpacity onPress={() => setShowAllMyGroups((v) => !v)} hitSlop={8}>
                        <Text style={styles.sectionLink}>{showAllMyGroups ? "Show less" : "View all"}</Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
                {myGroupsLoading && unifiedGroups.length === 0 ? (
                  <>
                    <SkeletonCard height={78} />
                    <SkeletonCard height={78} />
                    <SkeletonCard height={78} />
                  </>
                ) : filteredMyGroups.length > 0 ? (
                  <View style={styles.sectionBody}>
                    {displayedMyGroups.map((g) => (
                      <GroupRow key={`${g.kind}-${g.id}`} group={g} onPress={() => openGroup(g)} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.sectionBody}>
                    <View style={styles.emptyBlock}>
                      <View style={styles.emptyIcon}>
                        <Users size={22} color={ACCENT.green} strokeWidth={2.2} />
                      </View>
                      <Text style={styles.emptyTitle}>You're not in a group yet</Text>
                      <Text style={styles.emptyBody}>
                        Tap + to create your first group or SACCO, or discover one below
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Discover */}
              {discoverLoading && discoverableGroups.length === 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Discover" hint="Fresh groups you might fit into" />
                  <SkeletonCard height={190} rounded={RADIUS.lg} marginHorizontal={DISCOVER_SIDE_PADDING} />
                </View>
              ) : filteredDiscover.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Discover" count={filteredDiscover.length} accent={ACCENT.navy} hint="Groups near you looking for members" />
                  <Animated.ScrollView
                    horizontal
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    snapToInterval={DISCOVER_INTERVAL}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.discoverScroll}
                  >
                    {filteredDiscover.map((group, index) => (
                      <DiscoverTile
                        key={group.group_id}
                        group={group}
                        index={index}
                        scrollX={scrollX}
                        state={getJoinState(group.group_id)}
                        submitting={submitting === group.group_id}
                        onView={() => handleViewGroup(group)}
                        onAsk={() => openJoinModal(group)}
                      />
                    ))}
                  </Animated.ScrollView>
                  <DiscoverSwipeHint total={filteredDiscover.length} activeIndex={activeDiscoverIndex} />
                </View>
              ) : (
                <View style={styles.section}>
                  <SectionHeader title="Discover" accent={ACCENT.navy} hint="Groups near you looking for members" />
                  <DiscoverEmptyState
                    searching={q.length > 0 && discoverableGroups.length > 0}
                    failed={!!discoverError && discoverableGroups.length === 0}
                    onRetry={handleRefresh}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/groups/create/picker")}
        activeOpacity={0.85}
        style={[styles.fab, { bottom: tabBarInset + SPACING.md }]}
        accessibilityRole="button"
        accessibilityLabel="Create a group"
      >
        <Plus size={26} color="#fff" strokeWidth={2.6} />
      </TouchableOpacity>

      {/* Ask to join */}
      <Modal visible={joinModalVisible} animationType="slide" transparent onRequestClose={closeJoinModal}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeJoinModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Ask to join</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{joinTargetGroup?.group_name}</Text>
              </View>
              <TouchableOpacity onPress={closeJoinModal} hitSlop={8}>
                <X size={24} color={CLAY.ink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBody}>
              Introduce yourself to the group admin. Let them know why you'd like to join.
            </Text>

            <TextInput
              multiline
              numberOfLines={5}
              placeholder="e.g. Hi! I'm interested in joining because..."
              placeholderTextColor={CLAY.inkFaint}
              value={joinMessage}
              onChangeText={(text) => {
                setJoinMessage(text);
                setJoinMessageError("");
              }}
              style={[styles.joinInput, !!joinMessageError && styles.joinInputInvalid]}
              autoFocus
              maxLength={500}
            />

            <View style={styles.joinInputFooter}>
              {joinMessageError ? <Text style={styles.joinErrorText}>{joinMessageError}</Text> : <View />}
              <Text style={styles.joinInputCount}>{joinMessage.length}/500</Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmitJoinRequest}
              disabled={submitting === joinTargetGroup?.group_id}
              activeOpacity={0.85}
              style={[styles.joinSubmit, submitting === joinTargetGroup?.group_id && styles.joinSubmitBusy]}
            >
              {submitting === joinTargetGroup?.group_id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" strokeWidth={2.4} />
              )}
              <Text style={styles.joinSubmitText}>
                {submitting === joinTargetGroup?.group_id ? "Sending..." : "Send request"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Messages */}
      <Modal visible={messagesModalVisible} animationType="slide" transparent onRequestClose={() => setMessagesModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMessagesModalVisible(false)} />
        <View style={[styles.modalSheet, styles.messagesSheet]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Bell size={20} color={ACCENT.green} strokeWidth={2.2} />
              <Text style={styles.modalTitle}>My join requests</Text>
            </View>
            <TouchableOpacity onPress={() => setMessagesModalVisible(false)} hitSlop={8}>
              <X size={24} color={CLAY.ink} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {messagesLoading ? (
            <View style={styles.messageState}>
              <ActivityIndicator size="large" color={ACCENT.green} />
              <Text style={styles.messageStateText}>Loading...</Text>
            </View>
          ) : messagesError ? (
            <View style={styles.messageState}>
              <Text style={[styles.messageStateText, styles.messageStateError]}>{messagesError}</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.messageState}>
              <View style={styles.emptyIcon}>
                <MessageSquare size={26} color={ACCENT.green} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>
                Responses to your join requests will appear here once an admin reviews them.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.messageList} showsVerticalScrollIndicator={false}>
              {messages.map((msg) => {
                const isPending = msg.request_status === "pending";
                const isApproved = msg.request_status === "approved";
                const isRejected = msg.request_status === "rejected";

                const StatusIcon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;
                const statusColor = isApproved ? ACCENT.green : isRejected ? ACCENT.red : ACCENT.amber;
                const statusWrap = isApproved ? styles.statusApproved : isRejected ? styles.statusRejected : styles.statusPending;
                const label = isApproved ? "Request approved" : isRejected ? "Request rejected" : "Request pending";

                return (
                  <View key={msg.request_id} style={styles.messageItem}>
                    <View style={styles.messageTop}>
                      <View style={[styles.statusIcon, statusWrap]}>
                        <StatusIcon size={20} color={statusColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.messageTitleWrap}>
                        <Text style={styles.messageLabel}>{label}</Text>
                        <Text style={styles.messageGroupName}>{msg.group_name}</Text>
                      </View>
                    </View>

                    {msg.admin_message ? (
                      <View style={styles.messageAdminNote}>
                        <Text style={styles.messageAdminLabel}>Message from admin</Text>
                        <Text style={styles.messageAdminBody}>{msg.admin_message}</Text>
                      </View>
                    ) : null}

                    {isPending && (
                      <View style={[styles.messageInlineNote, styles.noteAmber]}>
                        <Clock size={14} color={ACCENT.amber} strokeWidth={2.2} />
                        <Text style={[styles.messageInlineText, styles.noteAmberText]}>Awaiting review by the group admin.</Text>
                      </View>
                    )}
                    {isApproved && (
                      <View style={[styles.messageInlineNote, styles.noteGreen]}>
                        <Bell size={14} color={ACCENT.green} strokeWidth={2.2} />
                        <Text style={[styles.messageInlineText, styles.noteGreenText]}>Check your Invites section to join the group.</Text>
                      </View>
                    )}

                    <Text style={styles.messageTimestamp}>
                      {msg.reviewed_at
                        ? `Reviewed ${formatRelativeDate(msg.reviewed_at)}`
                        : `Submitted ${formatRelativeDate(msg.created_at)}`}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

/* ================================================================== */
/*  STYLES                                                            */
/* ================================================================== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  flex: { flex: 1 },

  /* Header */
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  title: { flex: 1, fontSize: 24, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.5 },
  bellWrap: { position: "relative", padding: SPACING.sm },
  bellBadge: { position: "absolute", top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: ACCENT.red, alignItems: "center", justifyContent: "center" },
  bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 12 },

  /* Summary */
  statsRow: { flexDirection: "row", paddingHorizontal: SPACING.xl, marginTop: SPACING.xxl, gap: SPACING.xxl },
  stat: { gap: 2 },
  statValue: { fontSize: 28, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  statValueHighlight: { color: ACCENT.green },
  statLabel: { fontSize: 13, fontWeight: "500", color: CLAY.inkSoft },

  /* Search */
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: SPACING.xl, marginTop: SPACING.xl, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: CLAY.surface },
  searchInput: { flex: 1, color: CLAY.ink, paddingVertical: 14, fontSize: 15, fontWeight: "500" },

  /* Error / no results */
  errorBlock: { padding: SPACING.huge, alignItems: "center", gap: SPACING.md },
  errorText: { color: ACCENT.red, fontSize: 15, textAlign: "center", fontWeight: "600" },
  errorRetry: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: ACCENT.green },
  errorRetryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  noResults: { padding: SPACING.huge, alignItems: "center" },
  noResultsText: { color: CLAY.inkSoft, fontSize: 15, fontWeight: "500" },

  /* Sections */
  section: { marginTop: SPACING.huge },
  sectionBody: { paddingHorizontal: SPACING.xl },
  sectionHeader: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.3 },
  sectionCountPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  sectionCountText: { fontSize: 12, fontWeight: "700" },
  sectionHint: { fontSize: 13, color: CLAY.inkSoft, marginTop: 2, fontWeight: "500" },
  sectionLink: { fontSize: 13, fontWeight: "600", color: CLAY.inkSoft },

  /* Group row */
  groupRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  groupBody: { flex: 1, gap: 3 },
  groupNameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
  groupName: { fontSize: 15, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.2, flexShrink: 1 },
  groupMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupMeta: { fontSize: 12, color: CLAY.inkSoft, fontWeight: "500" },
  unreadPill: { backgroundColor: ACCENT.greenSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: SPACING.xs },
  unreadText: { fontSize: 11, color: ACCENT.green, fontWeight: "700" },

  /* Invite tile */
  inviteTile: { backgroundColor: ACCENT.greenSoft, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.lg, marginBottom: SPACING.md },
  inviteTop: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  inviteText: { flex: 1, gap: 2 },
  inviteName: { fontSize: 15, fontWeight: "700", color: CLAY.ink },
  inviteMeta: { fontSize: 12, color: CLAY.inkSoft, fontWeight: "500" },
  inviteTag: { backgroundColor: CLAY.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  inviteTagText: { fontSize: 11, fontWeight: "700", color: ACCENT.green },
  inviteActions: { flexDirection: "row", gap: SPACING.sm },
  inviteBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  inviteBtnGhost: { backgroundColor: CLAY.surface },
  inviteBtnPrimary: { backgroundColor: ACCENT.green },
  inviteBtnGhostText: { color: CLAY.ink, fontWeight: "600", fontSize: 13 },
  inviteBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  /* Invites empty */
  emptyInline: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  emptyInlineIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT.navySoft, alignItems: "center", justifyContent: "center" },
  emptyInlineText: { flex: 1 },
  emptyInlineTitle: { fontSize: 14, fontWeight: "700", color: CLAY.ink },
  emptyInlineBody: { fontSize: 12, color: CLAY.inkSoft, marginTop: 2, fontWeight: "500" },

  /* Empty block */
  emptyBlock: { alignItems: "center", paddingVertical: SPACING.xxl, gap: 6 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: SPACING.xs },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: CLAY.ink, textAlign: "center" },
  emptyBody: { fontSize: 13, color: CLAY.inkSoft, textAlign: "center", lineHeight: 19, maxWidth: 260, fontWeight: "500" },

  /* Discover */
  emptyRetry: { marginTop: SPACING.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: ACCENT.green },
  emptyRetryText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  discoverScroll: { paddingHorizontal: DISCOVER_SIDE_PADDING, gap: DISCOVER_CARD_GAP, paddingVertical: SPACING.sm },
  discoverTile: { width: DISCOVER_CARD_WIDTH, backgroundColor: CLAY.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, minHeight: 230 },
  discoverTop: { alignItems: "center", gap: 10 },
  discoverName: { fontSize: 16, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.2, textAlign: "center" },
  discoverBody: { fontSize: 13, color: CLAY.inkSoft, lineHeight: 18, fontWeight: "500", textAlign: "center" },
  discoverActions: { flexDirection: "row", gap: SPACING.sm, marginTop: "auto" },
  discoverGhostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: CLAY.sunken },
  discoverGhostText: { color: CLAY.ink, fontWeight: "600", fontSize: 13 },
  discoverPrimaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: RADIUS.md },
  discoverPrimaryText: { fontWeight: "700", fontSize: 13 },
  joinAsk: { backgroundColor: ACCENT.green },
  joinAskText: { color: "#fff" },
  joinPending: { backgroundColor: ACCENT.amberSoft },
  joinPendingText: { color: ACCENT.amber },
  joinApproved: { backgroundColor: ACCENT.greenSoft },
  joinApprovedText: { color: ACCENT.green },

  swipeHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: SPACING.sm },
  chevronOff: { opacity: 0.35 },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CLAY.skeleton },
  dotActive: { width: 18, backgroundColor: CLAY.inkSoft },

  /* FAB */
  fab: { position: "absolute", right: SPACING.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT.green, alignItems: "center", justifyContent: "center", shadowColor: ACCENT.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { backgroundColor: CLAY.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  messagesSheet: { maxHeight: "80%" },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: CLAY.skeleton, marginBottom: SPACING.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACING.md },
  modalHeaderText: { flex: 1, marginRight: SPACING.md },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  modalTitle: { fontSize: 18, fontWeight: "700", color: CLAY.ink, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: CLAY.inkSoft, marginTop: 2, fontWeight: "500" },
  modalBody: { color: CLAY.inkSoft, fontSize: 14, lineHeight: 20, marginBottom: SPACING.md, fontWeight: "500" },
  joinInput: { borderRadius: RADIUS.md, padding: SPACING.lg, color: CLAY.ink, minHeight: 120, textAlignVertical: "top", fontSize: 15, backgroundColor: CLAY.sunken },
  joinInputInvalid: { borderWidth: 1, borderColor: ACCENT.red },
  joinInputFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: SPACING.lg },
  joinErrorText: { color: ACCENT.red, fontSize: 12, fontWeight: "600" },
  joinInputCount: { color: CLAY.inkFaint, fontSize: 12, fontWeight: "500" },
  joinSubmit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.md + 2, borderRadius: RADIUS.md, backgroundColor: ACCENT.green },
  joinSubmitBusy: { opacity: 0.75 },
  joinSubmitText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  /* Messages */
  messageState: { padding: SPACING.huge, alignItems: "center", gap: SPACING.md },
  messageStateText: { color: CLAY.inkSoft, fontSize: 14, textAlign: "center", fontWeight: "500" },
  messageStateError: { color: ACCENT.red },
  messageList: { paddingTop: SPACING.sm, gap: SPACING.xl },
  messageItem: { gap: SPACING.md },
  messageTop: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  statusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statusApproved: { backgroundColor: ACCENT.greenSoft },
  statusRejected: { backgroundColor: ACCENT.redSoft },
  statusPending: { backgroundColor: ACCENT.amberSoft },
  messageTitleWrap: { flex: 1, gap: 2 },
  messageLabel: { fontSize: 15, fontWeight: "700", color: CLAY.ink },
  messageGroupName: { fontSize: 13, color: CLAY.inkSoft, fontWeight: "500" },
  messageAdminNote: { backgroundColor: CLAY.sunken, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  messageAdminLabel: { fontSize: 12, color: CLAY.inkSoft, fontWeight: "600" },
  messageAdminBody: { fontSize: 14, color: CLAY.ink, lineHeight: 20, fontWeight: "500" },
  messageInlineNote: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md },
  messageInlineText: { fontSize: 13, fontWeight: "600", flex: 1 },
  noteAmber: { backgroundColor: ACCENT.amberSoft },
  noteAmberText: { color: ACCENT.amber },
  noteGreen: { backgroundColor: ACCENT.greenSoft },
  noteGreenText: { color: ACCENT.green },
  messageTimestamp: { fontSize: 12, color: CLAY.inkFaint, fontWeight: "500" },
});