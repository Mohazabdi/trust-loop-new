import { EmptyState } from "@/components/myGroups/EmptyState";
import { GroupAvatar } from "@/components/myGroups/GroupAvatar";
import { SkeletonCard } from "@/components/myGroups/SkeletonCard";
import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberInvites } from "@/hooks/useMemberInvites";
import { useDiscoverableGroups } from "@/hooks/useDiscoverableGroups";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import { supabase } from "@/lib/mysupabase/supabase";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useMemberJoinRequestMessages } from "@/hooks/useMemberJoinRequestMessages";
import type { SasraLicenseCategory } from "@/lib/types/sacco";
import { useRouter } from "expo-router";
import {
  Bell, BellIcon, Check, CheckCircle, ChevronLeft, ChevronRight,
  Clock, Eye, Inbox, MailOpen, MessageSquare, Plus, Search, Send,
  Users, X, XCircle,
} from "lucide-react-native";
import React, {
  useMemo, useState, useCallback, useRef, useEffect,
} from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DISCOVER_CARD_WIDTH = 250;
const DISCOVER_CARD_GAP = 10;
const DISCOVER_INTERVAL = DISCOVER_CARD_WIDTH + DISCOVER_CARD_GAP;

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
  amber: "#96632A",
  amberSoft: "#EBD8B8",
  teal: "#2E7A73",
  tealSoft: "#CBE4E1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Unified group shape — community + SACCO normalised to one list    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Clay primitive — a two-layer moulded surface                      */
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
  /** 0 = flat chip, 1 = standard card, 2 = hero slab */
  depth?: number;
  /** When true, renders a recessed well instead of a raised slab */
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

export default function GroupIndexPage() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { theme } = useGlobalStorage();

  const openMessages = () => {
    markMessagesAsSeen();
    setMessagesModalVisible(true);
  };

  const [messagesModalVisible, setMessagesModalVisible] = useState(false);
  const { data: memberData } = useMemberData();
  const memberId = memberData?.id;

  const {
    groups: myGroups,
    loading: myGroupsLoading,
    error: myGroupsError,
    refetch: refetchMyGroups,
  } = useGetMemberGroups();

  const {
    invites: pendingInvites,
    loading: invitesLoading,
    error: invitesError,
    refetch: refetchInvites,
  } = useMemberInvites(memberId);

  const {
    groups: discoverableGroups,
    loading: discoverLoading,
    error: discoverError,
    refetch: refetchDiscover,
  } = useDiscoverableGroups(memberId);

  const {
    requestMap,
    refetch: refetchRequests,
    submitRequest,
    submitting,
  } = useJoinRequests(memberId);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useMemberJoinRequestMessages(memberId);

  /* ── SACCOs the current member belongs to (local storage) ─── */
  const allSaccos = useSaccoStorage((s) => s.saccos);

  const mySaccos = useMemo(
    () =>
      allSaccos.filter((s) =>
        s.members.some(
          (m) => m.group_member_id === memberId && m.status === "active"
        )
      ),
    [allSaccos, memberId]
  );

  const reviewedMessages = useMemo(
    () => messages.filter((m) => m.request_status !== "pending"),
    [messages]
  );

  const { unreadCount: messagesBadgeCount, markAsSeen: markMessagesAsSeen } =
    useNotificationBadge(
      `badge_join_messages_${memberId ?? "anon"}`,
      reviewedMessages
    );

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

  const refetchAll = useCallback(() => {
    refetchMyGroupsRef.current();
    refetchInvitesRef.current();
    refetchDiscoverRef.current();
    refetchRequestsRef.current();
    refetchMessagesRef.current();
  }, []);

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

  const [searchText, setSearchText] = useState("");

  /* ── Unified list — community groups + SACCOs ─────────────── */
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

  const filteredMyGroups = useMemo(() => {
    if (!searchText.trim()) return unifiedGroups;
    const q = searchText.toLowerCase();
    return unifiedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
    );
  }, [unifiedGroups, searchText]);

  const filteredInvites = useMemo(() => {
    if (!searchText.trim()) return pendingInvites;
    const q = searchText.toLowerCase();
    return pendingInvites.filter((inv) =>
      inv.group_name.toLowerCase().includes(q)
    );
  }, [pendingInvites, searchText]);

  const filteredDiscover = useMemo(() => {
    if (!searchText.trim()) return discoverableGroups;
    const q = searchText.toLowerCase();
    return discoverableGroups.filter(
      (g) =>
        g.group_name.toLowerCase().includes(q) ||
        (g.group_description ?? "").toLowerCase().includes(q)
    );
  }, [discoverableGroups, searchText]);

  const hasNoResults =
    filteredMyGroups.length === 0 &&
    filteredInvites.length === 0 &&
    filteredDiscover.length === 0 &&
    !myGroupsLoading &&
    !invitesLoading &&
    !discoverLoading;

  const [showAllMyGroups, setShowAllMyGroups] = useState(false);
  const displayedMyGroups = showAllMyGroups
    ? filteredMyGroups
    : filteredMyGroups.slice(0, 5);

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
    const success = await submitRequest(
      joinTargetGroup.group_id,
      memberId,
      joinMessage.trim()
    );
    if (success) {
      closeJoinModal();
      refetchDiscover();
      refetchRequests();
      Alert.alert(
        "Request Sent",
        `Your request to join "${joinTargetGroup.group_name}" has been sent.`
      );
    }
  };

  const getJoinButtonState = (groupId: string): "ask" | "pending" | "approved" => {
    const status = requestMap[groupId];
    if (status === "pending") return "pending";
    if (status === "approved") return "approved";
    return "ask";
  };

  const handleViewGroup = (group: any) => {
    router.push({
      pathname: "/(tabs)/groups/preview",
      params: { groupId: group.group_id, groupName: group.group_name },
    });
  };

  const first_name = memberData?.first_name ?? "there";

  /* ── Discover carousel ───────────────────────────────────── */
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
      if (current !== previous && current >= 0) {
        runOnJS(setActiveDiscoverIndex)(current);
      }
    }
  );

  /* ── Discover carousel card ─────────────────────────────── */
  const DiscoverCarouselCard = ({
    group,
    index,
  }: {
    group: any;
    index: number;
  }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * DISCOVER_INTERVAL,
        index * DISCOVER_INTERVAL,
        (index + 1) * DISCOVER_INTERVAL,
      ];
      const scale = interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [0.72, 1, 0.72], Extrapolation.CLAMP);
      const translateY = interpolate(scrollX.value, inputRange, [6, 0, 6], Extrapolation.CLAMP);
      return { transform: [{ scale }, { translateY }], opacity };
    });

    const buttonState = getJoinButtonState(group.group_id);
    const isSubmittingThis = submitting === group.group_id;

    const buttonConfig = {
      ask: {
        label: "Ask to join",
        bg: ACCENT.navy,
        text: "#fff",
        disabled: false,
      },
      pending: {
        label: "Request sent",
        bg: ACCENT.amberSoft,
        text: ACCENT.amber,
        disabled: true,
      },
      approved: {
        label: "Invite pending",
        bg: ACCENT.greenSoft,
        text: ACCENT.green,
        disabled: true,
      },
    }[buttonState];

    return (
      <Animated.View style={[{ width: DISCOVER_CARD_WIDTH }, animatedStyle]}>
        <Clay radius={22} depth={2} bodyStyle={styles.discoverCard}>
          <View style={{ alignItems: "center", gap: 10 }}>
            <GroupAvatar name={group.group_name} seed={group.group_id} size={56} />
            <Text numberOfLines={1} style={styles.discoverName}>
              {group.group_name}
            </Text>
            <View style={styles.discoverMetaRow}>
              <Users size={11} color={CLAY.inkSoft} strokeWidth={2.4} />
              <Text style={styles.discoverMeta}>
                {group.member_count} member{group.member_count !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {group.group_description ? (
            <Text numberOfLines={2} style={styles.discoverBody}>
              {group.group_description}
            </Text>
          ) : null}

          <View style={styles.discoverActions}>
            <TouchableOpacity
              onPress={() => handleViewGroup(group)}
              activeOpacity={0.85}
              style={styles.discoverGhostBtn}
            >
              <Eye size={12} color={CLAY.ink} strokeWidth={2.4} />
              <Text style={styles.discoverGhostText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => !buttonConfig.disabled && openJoinModal(group)}
              disabled={buttonConfig.disabled || isSubmittingThis}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <View
                style={[
                  styles.discoverPrimaryBtn,
                  {
                    backgroundColor: buttonConfig.bg,
                    opacity: buttonConfig.disabled || isSubmittingThis ? 0.85 : 1,
                  },
                ]}
              >
                {isSubmittingThis ? (
                  <ActivityIndicator size="small" color={buttonConfig.text} />
                ) : (
                  <>
                    {buttonState === "ask" && (
                      <Send size={11} color={buttonConfig.text} strokeWidth={2.4} />
                    )}
                    {buttonState === "approved" && (
                      <Check size={11} color={buttonConfig.text} strokeWidth={2.6} />
                    )}
                    {buttonState === "pending" && (
                      <Clock size={11} color={buttonConfig.text} strokeWidth={2.4} />
                    )}
                    <Text
                      style={[
                        styles.discoverPrimaryText,
                        { color: buttonConfig.text },
                      ]}
                    >
                      {buttonConfig.label}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Clay>
      </Animated.View>
    );
  };

  /* ── Section header ─────────────────────────────────────── */
  const SectionHeader = ({
    title,
    count,
    accent = ACCENT.navy,
    trailing,
    hint,
  }: {
    title: string;
    count?: number;
    accent?: string;
    trailing?: ReactNode;
    hint?: string;
  }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>{title}</Text>
          {count !== undefined && count > 0 && (
            <View style={[styles.sectionCount, { backgroundColor: `${accent}22` }]}>
              <Text style={[styles.sectionCountText, { color: accent }]}>{count}</Text>
            </View>
          )}
        </View>
        {trailing}
      </View>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );

  /* ── My Group card — handles both community + SACCO ────── */
  const renderMyGroupCard = (group: UnifiedGroup) => {
    const isSacco = group.kind === "sacco";

    const onPress = () =>
      router.push({
        pathname: isSacco
          ? "/(tabs)/groups/sacco/home"
          : "/(tabs)/groups/group",
        params: isSacco
          ? { sacco_id: group.id, group_member_id: memberId }
          : { group_id: group.id },
      });

    return (
      <TouchableOpacity
        key={`${group.kind}-${group.id}`}
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.listItemWrap}
      >
        <Clay bodyStyle={styles.groupCard}>
          <GroupAvatar name={group.name} seed={group.id} size={48} />

          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.groupNameRow}>
              <Text numberOfLines={1} style={styles.groupName}>
                {group.name}
              </Text>
              {isSacco && group.sasraCategory ? (
                <SaccoBadge
                  category={group.sasraCategory}
                  verified={group.sasraVerified}
                  size="sm"
                />
              ) : null}
            </View>

            <View style={styles.groupMetaRow}>
              <Users size={11} color={CLAY.inkSoft} strokeWidth={2.4} />
              <Text style={styles.groupMeta}>
                {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
              </Text>
              {group.unreadCount > 0 && (
                <>
                  <View style={styles.groupMetaDot} />
                  <View style={styles.groupUnreadRow}>
                    <View style={styles.groupUnreadDot} />
                    <Text style={styles.groupUnreadText}>
                      {group.unreadCount} new
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <ChevronRight size={16} color={CLAY.inkFaint} strokeWidth={2.4} />
        </Clay>
      </TouchableOpacity>
    );
  };

  /* ── Invite card ────────────────────────────────────────── */
  const renderInviteCard = (invite: any) => (
    <View key={invite.invitation_id} style={styles.listItemWrap}>
      <Clay bodyStyle={styles.inviteCard}>
        <View style={styles.inviteTop}>
          <GroupAvatar
            name={invite.group_name}
            seed={invite.group_id ?? invite.invitation_id}
            size={42}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={styles.inviteName}>
              {invite.group_name}
            </Text>
            <Text numberOfLines={1} style={styles.inviteMeta}>
              {invite.inviter_first_name} {invite.inviter_last_name} invited you
            </Text>
          </View>
          <View style={styles.inviteTag}>
            <Text style={styles.inviteTagText}>INVITE</Text>
          </View>
        </View>

        <View style={styles.inviteActions}>
          <TouchableOpacity
            onPress={() => declineInvite(invite.invitation_id)}
            activeOpacity={0.9}
            style={[styles.inviteBtn, styles.inviteBtnGhost]}
          >
            <Text style={styles.inviteBtnGhostText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => acceptInvite(invite.invitation_id)}
            activeOpacity={0.9}
            style={[styles.inviteBtn, { backgroundColor: ACCENT.teal }]}
          >
            <Text style={styles.inviteBtnPrimaryText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Clay>
    </View>
  );

  /* ── Empty states ───────────────────────────────────────── */
  const InvitesEmptyState = () => (
    <View style={styles.listItemWrap}>
      <Clay bodyStyle={styles.emptyInlineCard}>
        <View style={[styles.emptyInlineIcon, { backgroundColor: ACCENT.navySoft }]}>
          <MailOpen size={18} color={ACCENT.navy} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyInlineTitle}>No pending invites</Text>
          <Text style={styles.emptyInlineBody}>
            Group invitations from admins will land here
          </Text>
        </View>
      </Clay>
    </View>
  );

  const GroupsEmptyState = () => (
    <View style={styles.listItemWrap}>
      <Clay bodyStyle={styles.emptyBlockCard}>
        <View style={[styles.emptyBlockIcon, { backgroundColor: ACCENT.navySoft }]}>
          <Users size={20} color={ACCENT.navy} strokeWidth={2.2} />
        </View>
        <Text style={styles.emptyBlockTitle}>You're not in a group yet</Text>
        <Text style={styles.emptyBlockBody}>
          Tap + to create your first group or SACCO, or discover one below
        </Text>
      </Clay>
    </View>
  );

  /* ── Discover swipe hint ────────────────────────────────── */
  const DiscoverSwipeHint = ({
    total,
    activeIndex,
  }: {
    total: number;
    activeIndex: number;
  }) => {
    if (total <= 1) return null;
    const canGoLeft = activeIndex > 0;
    const canGoRight = activeIndex < total - 1;

    return (
      <View style={styles.swipeHint}>
        <ChevronLeft
          size={16}
          color={canGoLeft ? ACCENT.navy : CLAY.inkFaint}
          strokeWidth={2.4}
          style={{ opacity: canGoLeft ? 1 : 0.35 }}
        />
        <View style={styles.dotsRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === activeIndex ? 16 : 6,
                  backgroundColor:
                    i === activeIndex ? ACCENT.navy : CLAY.inkFaint,
                  opacity: i === activeIndex ? 1 : 0.4,
                },
              ]}
            />
          ))}
        </View>
        <ChevronRight
          size={16}
          color={canGoRight ? ACCENT.navy : CLAY.inkFaint}
          strokeWidth={2.4}
          style={{ opacity: canGoRight ? 1 : 0.35 }}
        />
      </View>
    );
  };

  const loading = myGroupsLoading || invitesLoading || discoverLoading;
  const error = myGroupsError || invitesError || discoverError;
  const isFirstTimeEmpty =
    !loading &&
    !error &&
    unifiedGroups.length === 0 &&
    pendingInvites.length === 0 &&
    discoverableGroups.length === 0;

  const discoverSidePadding = (SCREEN_WIDTH - DISCOVER_CARD_WIDTH) / 2;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetchAll}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
      >
        {/* ── Greeting block with notification ───────────── */}
        <View style={styles.greetingBlock}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingEyebrow}>WELCOME BACK</Text>
            <Text style={styles.greetingName}>{first_name}</Text>
          </View>

          <TouchableOpacity
            onPress={openMessages}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Join request messages"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.bellBody}>
              <BellIcon size={20} color={CLAY.ink} strokeWidth={2.4} />
              {messagesBadgeCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {messagesBadgeCount > 9 ? "9+" : messagesBadgeCount}
                  </Text>
                </View>
              ) : null}
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Stats strip ────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { value: unifiedGroups.length, label: "Groups", accent: ACCENT.navy },
            {
              value: pendingInvites.length,
              label: "Invites",
              accent: pendingInvites.length > 0 ? ACCENT.teal : CLAY.inkSoft,
            },
            {
              value: discoverableGroups.length,
              label: "Discover",
              accent: ACCENT.purple,
            },
          ].map((stat) => (
            <Clay
              key={stat.label}
              radius={RADIUS.lg}
              depth={1}
              style={{ flex: 1 }}
              bodyStyle={styles.statCard}
            >
              <Text style={[styles.statValue, { color: stat.accent }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Clay>
          ))}
        </View>

        {/* ── Search ─────────────────────────────────────── */}
        <Clay
          inset
          radius={RADIUS.md}
          color={CLAY.sunken}
          style={styles.searchShell}
          bodyStyle={styles.searchBody}
        >
          <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
          <TextInput
            placeholder="Find a group or SACCO..."
            placeholderTextColor={CLAY.inkFaint}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={8}
              style={styles.searchClear}
            >
              <X size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </Clay>

        {/* ── Error ──────────────────────────────────────── */}
        {!loading && error && (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={refetchAll}
              activeOpacity={0.9}
              style={styles.errorRetry}
            >
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── First-time empty ──────────────────────────── */}
        {isFirstTimeEmpty && (
          <EmptyState
            icon={Inbox}
            title="No groups yet"
            description="Create a community group or SACCO, or discover existing groups to start saving together."
            accentColor={ACCENT.navy}
            action={{
              label: "Create a group",
              onPress: () => router.push("/(tabs)/groups/create/picker"),
            }}
          />
        )}

        {/* ── Search no results ─────────────────────────── */}
        {!loading && !error && !isFirstTimeEmpty && hasNoResults && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              Nothing matches "{searchText}"
            </Text>
          </View>
        )}

        {/* ── Sections ──────────────────────────────────── */}
        {!error && !isFirstTimeEmpty && (
          <>
            {/* Invites */}
            <View style={{ marginTop: SPACING.xl }}>
              <SectionHeader
                title="Invites"
                count={filteredInvites.length}
                accent={ACCENT.teal}
              />
              {invitesLoading && pendingInvites.length === 0 ? (
                <>
                  <SkeletonCard height={96} />
                  <SkeletonCard height={96} />
                </>
              ) : filteredInvites.length > 0 ? (
                filteredInvites.map(renderInviteCard)
              ) : (
                <InvitesEmptyState />
              )}
            </View>

            <View style={styles.divider} />

            {/* My Groups */}
            <View style={{ marginTop: SPACING.lg }}>
              <SectionHeader
                title="My groups"
                count={filteredMyGroups.length}
                trailing={
                  filteredMyGroups.length > 5 ? (
                    <TouchableOpacity
                      onPress={() => setShowAllMyGroups((v) => !v)}
                      hitSlop={8}
                    >
                      <Text style={styles.sectionLink}>
                        {showAllMyGroups ? "Show less" : "View all"}
                      </Text>
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
                displayedMyGroups.map(renderMyGroupCard)
              ) : (
                <GroupsEmptyState />
              )}
            </View>

            <View style={styles.divider} />

            {/* Discover */}
            {discoverLoading && discoverableGroups.length === 0 ? (
              <View style={{ marginTop: SPACING.lg }}>
                <SectionHeader
                  title="Discover"
                  hint="Fresh groups you might fit into"
                />
                <SkeletonCard
                  height={240}
                  rounded={22}
                  marginHorizontal={discoverSidePadding}
                />
              </View>
            ) : filteredDiscover.length > 0 ? (
              <View style={{ marginTop: SPACING.lg, paddingBottom: SPACING.sm }}>
                <SectionHeader
                  title="Discover"
                  count={filteredDiscover.length}
                  accent={ACCENT.purple}
                  hint="Groups near you looking for members"
                />

                <Animated.ScrollView
                  horizontal
                  onScroll={scrollHandler}
                  scrollEventThrottle={16}
                  snapToInterval={DISCOVER_INTERVAL}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: discoverSidePadding,
                    gap: DISCOVER_CARD_GAP,
                    paddingVertical: 10,
                  }}
                >
                  {filteredDiscover.map((group, index) => (
                    <DiscoverCarouselCard
                      key={group.group_id}
                      group={group}
                      index={index}
                    />
                  ))}
                </Animated.ScrollView>

                <DiscoverSwipeHint
                  total={filteredDiscover.length}
                  activeIndex={activeDiscoverIndex}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/groups/create/picker")}
        activeOpacity={0.9}
        style={styles.fab}
      >
        <Clay
          color={ACCENT.navy}
          radius={29}
          depth={2}
          highlight="rgba(255,255,255,0.32)"
          shade="rgba(15, 30, 60, 0.44)"
          bodyStyle={styles.fabBody}
        >
          <Plus size={26} color="#fff" strokeWidth={2.6} />
        </Clay>
      </TouchableOpacity>

      {/* ── Ask to Join Modal ──────────────────────────────── */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeJoinModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeJoinModal}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Ask to join</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {joinTargetGroup?.group_name}
                </Text>
              </View>
              <TouchableOpacity onPress={closeJoinModal} hitSlop={8}>
                <X size={22} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBody}>
              Introduce yourself to the group admin. Let them know why you'd
              like to join.
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
              style={[
                styles.joinInput,
                joinMessageError ? { borderColor: ACCENT.red } : null,
              ]}
              autoFocus
              maxLength={500}
            />

            <View style={styles.joinInputFooter}>
              {joinMessageError ? (
                <Text style={styles.joinInputError}>{joinMessageError}</Text>
              ) : (
                <View />
              )}
              <Text style={styles.joinInputCount}>
                {joinMessage.length}/500
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmitJoinRequest}
              disabled={submitting === joinTargetGroup?.group_id}
              activeOpacity={0.9}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.32)"
                shade="rgba(15, 30, 60, 0.44)"
                bodyStyle={[
                  styles.joinSubmit,
                  submitting === joinTargetGroup?.group_id && { opacity: 0.75 },
                ]}
              >
                {submitting === joinTargetGroup?.group_id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={18} color="#fff" strokeWidth={2.4} />
                )}
                <Text style={styles.joinSubmitText}>
                  {submitting === joinTargetGroup?.group_id
                    ? "Sending..."
                    : "Send request"}
                </Text>
              </Clay>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Messages Modal ─────────────────────────────────── */}
      <Modal
        visible={messagesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMessagesModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMessagesModalVisible(false)}
        />
        <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Bell size={20} color={ACCENT.navy} strokeWidth={2.4} />
              <Text style={styles.modalTitle}>My join requests</Text>
            </View>
            <TouchableOpacity
              onPress={() => setMessagesModalVisible(false)}
              hitSlop={8}
            >
              <X size={22} color={CLAY.ink} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {messagesLoading ? (
            <View style={styles.messageState}>
              <ActivityIndicator size="large" color={ACCENT.navy} />
              <Text style={styles.messageStateText}>Loading...</Text>
            </View>
          ) : messagesError ? (
            <View style={styles.messageState}>
              <Text style={[styles.messageStateText, { color: ACCENT.red }]}>
                {messagesError}
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.messageState}>
              <View style={[styles.messageEmptyIcon, { backgroundColor: ACCENT.navySoft }]}>
                <MessageSquare size={28} color={ACCENT.navy} strokeWidth={2.2} />
              </View>
              <Text style={styles.messageEmptyTitle}>No messages yet</Text>
              <Text style={styles.messageEmptyBody}>
                Responses to your join requests will appear here once an
                admin reviews them.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => {
                const isPending = msg.request_status === "pending";
                const isApproved = msg.request_status === "approved";
                const isRejected = msg.request_status === "rejected";

                const accent = isApproved
                  ? ACCENT.green
                  : isRejected
                  ? ACCENT.red
                  : ACCENT.amber;
                const accentSoft = isApproved
                  ? ACCENT.greenSoft
                  : isRejected
                  ? ACCENT.redSoft
                  : ACCENT.amberSoft;
                const StatusIcon = isApproved
                  ? CheckCircle
                  : isRejected
                  ? XCircle
                  : Clock;
                const label = isApproved
                  ? "Request approved"
                  : isRejected
                  ? "Request rejected"
                  : "Request pending";

                return (
                  <View key={msg.request_id} style={styles.messageCardWrap}>
                    <Clay bodyStyle={styles.messageCard}>
                      <View style={styles.messageTop}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={styles.messageGroupRow}>
                            <Users size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                            <Text style={styles.messageGroupName}>
                              {msg.group_name}
                            </Text>
                          </View>
                          <Text style={styles.messageLabel}>{label}</Text>
                        </View>
                        <View
                          style={[
                            styles.messageStatusIcon,
                            { backgroundColor: accentSoft },
                          ]}
                        >
                          <StatusIcon size={20} color={accent} strokeWidth={2.4} />
                        </View>
                      </View>

                      {msg.admin_message ? (
                        <View
                          style={[
                            styles.messageAdminNote,
                            { borderLeftColor: accent },
                          ]}
                        >
                          <Text style={styles.messageAdminLabel}>
                            MESSAGE FROM ADMIN
                          </Text>
                          <Text style={styles.messageAdminBody}>
                            {msg.admin_message}
                          </Text>
                        </View>
                      ) : null}

                      {isPending && (
                        <View
                          style={[
                            styles.messageInlineNote,
                            { backgroundColor: ACCENT.amberSoft },
                          ]}
                        >
                          <Clock size={14} color={ACCENT.amber} strokeWidth={2.4} />
                          <Text
                            style={[
                              styles.messageInlineText,
                              { color: ACCENT.amber },
                            ]}
                          >
                            Awaiting review by the group admin.
                          </Text>
                        </View>
                      )}
                      {isApproved && (
                        <View
                          style={[
                            styles.messageInlineNote,
                            { backgroundColor: ACCENT.greenSoft },
                          ]}
                        >
                          <Bell size={14} color={ACCENT.green} strokeWidth={2.4} />
                          <Text
                            style={[
                              styles.messageInlineText,
                              { color: ACCENT.green },
                            ]}
                          >
                            Check your Invites section to join the group.
                          </Text>
                        </View>
                      )}

                      <Text style={styles.messageTimestamp}>
                        {msg.reviewed_at
                          ? `Reviewed ${formatRelativeDate(msg.reviewed_at)}`
                          : `Submitted ${formatRelativeDate(msg.created_at)}`}
                      </Text>
                    </Clay>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelativeDate(iso: string): string {
  if (!iso) return "";
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
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scrollContent: { paddingBottom: 120 },

  /* Greeting */
  greetingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl + 8,
  },
  greetingEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.3,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 4,
  },

  /* Notification bell — clay slab */
  bellBody: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: ACCENT.red,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: CLAY.surface,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  statCard: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },

  /* Search — recessed clay well */
  searchShell: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  searchBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },
  searchClear: { padding: 2 },

  /* Errors & no results */
  errorBlock: { padding: 40, alignItems: "center", gap: 12 },
  errorText: {
    color: ACCENT.red,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  errorRetry: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: ACCENT.navy,
  },
  errorRetryText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  noResults: { padding: 40, alignItems: "center" },
  noResultsText: { color: CLAY.inkSoft, fontSize: 15, fontWeight: "600" },

  /* Section headers */
  sectionHeader: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionMarker: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  sectionCount: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: { fontSize: 11, fontWeight: "800" },
  sectionHint: {
    fontSize: 12,
    color: CLAY.inkSoft,
    marginTop: 4,
    fontWeight: "500",
  },
  sectionLink: {
    fontWeight: "800",
    fontSize: 12,
    color: ACCENT.navy,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },

  listItemWrap: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },

  /* Invite card */
  inviteCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  inviteTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  inviteName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  inviteMeta: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  inviteTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: ACCENT.tealSoft,
  },
  inviteTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ACCENT.teal,
  },
  inviteActions: { flexDirection: "row", gap: SPACING.sm },
  inviteBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnGhost: { backgroundColor: CLAY.sunken },
  inviteBtnGhostText: {
    color: CLAY.ink,
    fontWeight: "700",
    fontSize: 12.5,
  },
  inviteBtnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12.5,
  },

  /* Group card */
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  groupName: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  groupMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupMeta: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  groupMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.6,
  },
  groupUnreadRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  groupUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT.green,
  },
  groupUnreadText: {
    fontSize: 11,
    color: ACCENT.green,
    fontWeight: "800",
  },

  /* Empty inline (invites) */
  emptyInlineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  emptyInlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyInlineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
  },
  emptyInlineBody: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    marginTop: 2,
    fontWeight: "500",
  },

  /* Empty block (my groups) */
  emptyBlockCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 6,
  },
  emptyBlockIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyBlockTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
  },
  emptyBlockBody: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 240,
    fontWeight: "500",
  },

  /* Discover card */
  discoverCard: {
    padding: SPACING.lg,
    borderRadius: 22,
    gap: SPACING.md,
    minHeight: 240,
  },
  discoverName: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  discoverMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  discoverMeta: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  discoverBody: {
    fontSize: 12,
    color: CLAY.inkSoft,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "500",
  },
  discoverActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: "auto",
  },
  discoverGhostBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
    flexDirection: "row",
    gap: 5,
  },
  discoverGhostText: {
    color: CLAY.ink,
    fontWeight: "800",
    fontSize: 12,
  },
  discoverPrimaryBtn: {
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  discoverPrimaryText: {
    fontWeight: "800",
    fontSize: 12,
  },

  /* Swipe hint */
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: SPACING.sm,
  },
  dotsRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { height: 6, borderRadius: 3 },

  /* FAB */
  fab: {
    position: "absolute",
    right: SPACING.xl,
    bottom: 24,
    borderRadius: 29,
  },
  fabBody: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)" },
  modalSheet: {
    backgroundColor: CLAY.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: CLAY.sunken,
    marginBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    marginTop: 2,
    fontWeight: "500",
  },
  modalBody: {
    color: CLAY.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
    fontWeight: "500",
  },
  joinInput: {
    borderWidth: 1,
    borderColor: CLAY.hairline,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    color: CLAY.ink,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 14,
    backgroundColor: CLAY.sunken,
  },
  joinInputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  joinInputError: { color: ACCENT.red, fontSize: 12, fontWeight: "600" },
  joinInputCount: {
    color: CLAY.inkFaint,
    fontSize: 12,
    fontWeight: "600",
  },
  joinSubmit: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  joinSubmitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: -0.2,
  },

  /* Message modal states */
  messageState: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  messageStateText: {
    color: CLAY.inkSoft,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  messageEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  messageEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    textAlign: "center",
  },
  messageEmptyBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },

  /* Message card */
  messageCardWrap: { marginBottom: SPACING.md },
  messageCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  messageTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  messageGroupName: {
    fontSize: 13,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  messageStatusIcon: {
    borderRadius: 20,
    padding: 8,
  },
  messageAdminNote: {
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
  },
  messageAdminLabel: {
    fontSize: 10.5,
    color: CLAY.inkSoft,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  messageAdminBody: {
    fontSize: 14,
    color: CLAY.ink,
    lineHeight: 21,
    fontWeight: "500",
  },
  messageInlineNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  messageInlineText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  messageTimestamp: {
    fontSize: 11,
    color: CLAY.inkFaint,
    fontWeight: "600",
  },
});