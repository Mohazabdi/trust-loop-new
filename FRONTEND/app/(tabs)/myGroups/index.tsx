import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberInvites } from "@/hooks/useMemberInvites";
import { useDiscoverableGroups } from "@/hooks/useDiscoverableGroups";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupIndexStyles } from "@/styles/group_style/group_index.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { supabase } from "@/lib/mysupabase/supabase";
import { NotificationBadge } from "@/components/myGroups/NotificationBadge";   
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useRouter } from "expo-router";
import {
    BellIcon,
    Check,
    ChevronLeft,
    Plus,
    Search,
    SquareArrowOutUpRight,
    Users,
    Users2,
    X,
    Send,
    Eye,
    Bell,
    Clock,
    CheckCircle,
    XCircle,
    MessageSquare,
} from "lucide-react-native";

import { useMemberJoinRequestMessages } from "@/hooks/useMemberJoinRequestMessages";
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function GroupIndexPage() {
    const router = useRouter();
    const { theme, setIsNotificationOpen } = useGlobalStorage();
    const styles = useMemo(() => GroupIndexStyles(theme), [theme]);
  const MiniIconButton = ({
  color,
  onPress,
  children,
}: {
  color: string;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <TouchableOpacity
    style={{
      backgroundColor: color,
      borderRadius: 8,
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    }}
    onPress={onPress}
  >
    {children}
  </TouchableOpacity>
);

    const rightAction = () => {
        markMessagesAsSeen();
        setMessagesModalVisible(true);
    };
    const leftAction = () => router.back();

    // ── My Messages modal state ───────────────────────────────────
    const [messagesModalVisible, setMessagesModalVisible] = useState(false);

    // ── Member identity ────────────────────────────────────────
    const { data: memberData } = useMemberData();
    const memberId = memberData?.id;

    // ── Data hooks ────────────────────────────────────────────
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

    // ── Join requests hook (tracks sent request statuses) ─────
    // Returns a map: { [groupId]: 'pending' | 'approved' | 'rejected' | null }
    const {
        requestMap,
        loading: requestsLoading,
        refetch: refetchRequests,
        submitRequest,
        submitting,
    } = useJoinRequests(memberId);

    /// ── Join request messages (for bell icon) ─────────────────
    const {
        messages,
        loading: messagesLoading,
        error: messagesError,
        refetch: refetchMessages,
    } = useMemberJoinRequestMessages(memberId);

    // Only count messages that have been reviewed by the admin (i.e. not pending)
    const reviewedMessages = useMemo(
        () => messages.filter((m) => m.request_status !== "pending"),
        [messages]
    );

    const { unreadCount: messagesBadgeCount, markAsSeen: markMessagesAsSeen } =
        useNotificationBadge(
            `badge_join_messages_${memberId ?? "anon"}`,
            reviewedMessages   // only reviewed ones count as notifications
        );

    // ── Refresh param (from navigation) ───────────────────────
    const { refresh } = useLocalSearchParams<{ refresh?: string }>();

    // ── FEATURE 1: Auto-refresh on focus ──────────────────────
    // Refetches ALL sections every time the screen gains focus.
    // Also re-runs when the `refresh` navigation param changes
    // so that actions from child screens (e.g. leaving a group,
    // accepting an invite) are reflected immediately on return.
    const refetchMyGroupsRef = useRef(refetchMyGroups);
    const refetchInvitesRef = useRef(refetchInvites);
    const refetchDiscoverRef = useRef(refetchDiscover);
    const refetchRequestsRef = useRef(refetchRequests);

    useEffect(() => { refetchMyGroupsRef.current = refetchMyGroups; }, [refetchMyGroups]);
    useEffect(() => { refetchInvitesRef.current = refetchInvites; }, [refetchInvites]);
    useEffect(() => { refetchDiscoverRef.current = refetchDiscover; }, [refetchDiscover]);
    useEffect(() => { refetchRequestsRef.current = refetchRequests; }, [refetchRequests]);
    // ── Add refetchMessages to refetchAll: ───────────────────────
    const refetchMessagesRef = useRef(refetchMessages);
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
            // First visit: always fetch
            if (!hasFetchedOnce.current) {
                hasFetchedOnce.current = true;
                refetchAll();
                return;
            }

            // Subsequent focus: only refetch if `refresh` param changed
            // (i.e. a child screen explicitly triggered a refresh)
            if (refresh !== prevRefresh.current) {
                prevRefresh.current = refresh;
                refetchAll();
            }
            // Otherwise do nothing — data is already loaded
        }, [refresh, refetchAll])
    );

    // ── Invite accept / decline ───────────────────────────────
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
                refetchDiscover(); // refresh discover so approved group disappears
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

    // ── Search & filter ───────────────────────────────────────
    const [searchText, setSearchText] = useState("");

    const filteredMyGroups = useMemo(() => {
        if (!searchText.trim()) return myGroups;
        const q = searchText.toLowerCase();
        return myGroups.filter(
            (g) =>
                g.group_name.toLowerCase().includes(q) ||
                (g.group_description ?? "").toLowerCase().includes(q)
        );
    }, [myGroups, searchText]);

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
        : filteredMyGroups.slice(0, 3);

    // ── FEATURE 2: Ask to Join modal state ────────────────────
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
            // Refresh discover so button state updates immediately
            refetchDiscover();
            refetchRequests();
            Alert.alert(
                "Request Sent",
                `Your request to join "${joinTargetGroup.group_name}" has been sent. You'll be notified when the admin reviews it.`
            );
        }
    };

    // ── Derive button label for each discoverable group ───────
    const getJoinButtonState = (groupId: string): "ask" | "pending" | "approved" => {
        const status = requestMap[groupId];
        if (status === "pending") return "pending";
        if (status === "approved") return "approved";
        return "ask";
    };

    // ── Navigate to Group Preview ─────────────────────────────
    const handleViewGroup = (group: any) => {
        router.push({
            pathname: "/(tabs)/myGroups/groupPreview",
            params: {
                groupId: group.group_id,
                groupName: group.group_name,
            },
        });
    };

    // ── Render helpers ────────────────────────────────────────
   

const renderMyGroupCard = (group: any) => (
    <View key={group.group_id} style={styles.mygroupscontainer}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(tabs)/myGroups/group",
            params: { group_id: group.group_id },
          })
        }
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#285e1d", theme.secondary]}   // Green → dark
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.groupCardGradient}
        >
          <View style={styles.groupicon}>
            <Users size={22} color="#fff" />
          </View>
          <View style={styles.groupinfo}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 }}>
              {group.group_name}
            </Text>
            <TruncatedText
              text={group.group_description ?? "No description provided."}
              maxLines={2}
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 }}
            />
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              {group.number_of_members} Member{group.number_of_members !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={{ position: "relative" }}>
            <SquareArrowOutUpRight color="rgba(255,255,255,0.5)" size={18} />
            {group.no_of_unread_notifications > 0 && (
              <View style={styles.chatsBadge}>
                <Text style={styles.chatsBadgeText}>
                  {group.no_of_unread_notifications > 99
                    ? "99+"
                    : group.no_of_unread_notifications}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Invites (teal gradient) ───────────────────────
  const renderInviteCard = (invite: any) => (
    <LinearGradient
      key={invite.invitation_id}
      colors={["#1d5c5e", theme.secondary]}   // Teal → dark
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.inviteCardGradient}
    >
      <View style={styles.inviteIcon}>
        <Users2 size={32} color="#fff" />
      </View>
      <View style={styles.inviteinfo}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 }}>
          {invite.group_name}
        </Text>
        <TruncatedText
          text={invite.group_description || "No description"}
          maxLines={2}
          style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 }}
        />
        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Invited by {invite.inviter_first_name} {invite.inviter_last_name}
        </Text>
      </View>
      <View style={styles.inviteactions}>
        <MiniIconButton color="#ef4444" onPress={() => declineInvite(invite.invitation_id)}>
          <X color="#fff" size={16} />
        </MiniIconButton>
        <MiniIconButton color="#10b981" onPress={() => acceptInvite(invite.invitation_id)}>
          <Check color="#fff" size={16} />
        </MiniIconButton>
      </View>
    </LinearGradient>
  );

  // ── Render: Discover (warm red gradient) ─────────────────
  const renderDiscoverCard = (group: any) => {
    const buttonState = getJoinButtonState(group.group_id);
    const isSubmittingThis = submitting === group.group_id;

    const buttonConfig = {
      ask: {
        label: "Ask to Join",
        bg: theme.primary,
        icon: <Send size={12} color="#fff" />,
        disabled: false,
      },
      pending: {
        label: "Request Sent",
        bg: "#f59e0b",
        icon: null,
        disabled: true,
      },
      approved: {
        label: "Invite Pending",
        bg: "#10b981",
        icon: <Check size={12} color="#fff" />,
        disabled: true,
      },
    }[buttonState];

    return (
      <LinearGradient
        key={group.group_id}
        colors={["#5e1d1d", theme.secondary]}   // Red → dark
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.discoverCardGradient}
      >
        <View style={styles.inviteIcon}>
          <Users2 size={32} color="#fff" />
        </View>
        <View style={styles.inviteinfo}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 }}>
            {group.group_name}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 }}>
            {group.group_description || "No description"}
          </Text>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {group.member_count} member{group.member_count !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.discoveractions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: buttonConfig.bg,
                opacity: buttonConfig.disabled || isSubmittingThis ? 0.85 : 1,
              },
            ]}
            onPress={() => !buttonConfig.disabled && openJoinModal(group)}
            disabled={buttonConfig.disabled || isSubmittingThis}
          >
            {isSubmittingThis ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                {buttonConfig.icon}
                <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                  {buttonConfig.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewButton} onPress={() => handleViewGroup(group)}>
            <Eye size={13} color="#fff" />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  // ── Add Group button (gradient) ──────────────────────────
  const RenderAddGroup = () => (
    <View style={{
        flex:1
    }}>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/myGroups/createGroup")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addButtonGradient}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Create / Add a group</Text>
          <Plus color="#fff" size={18} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );


    // ── Loading / error states ────────────────────────────────
    const loading = myGroupsLoading || invitesLoading || discoverLoading;
    const error = myGroupsError || invitesError || discoverError;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <CustomWalletHeader
                  subTitle="Groups"
                    leftAction={{ icon: ChevronLeft, action: leftAction }}
                    rightAction={{
                        icon: BellIcon,
                        action: rightAction,
                        badgeCount: messagesBadgeCount,   
                    }}
                />

            <View style={styles.container}>
                {/* Search bar */}
                <View style={styles.searchbar}>
                    <TextInput
                        placeholder="Search ..."
                        placeholderTextColor={theme.textSecondary}
                        style={styles.searchinput}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    <TouchableOpacity style={styles.searchicon}>
                        <Search size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refetchAll}
                            tintColor={theme.primary}
                        />
                    }
                >
                    {/* Initial full-screen loading */}
                    {loading &&
                        myGroups.length === 0 &&
                        pendingInvites.length === 0 &&
                        discoverableGroups.length === 0 &&
                        !hasFetchedOnce.current && (   // ← add this condition
                            <View style={{ padding: 40, alignItems: "center" }}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
                                    Loading...
                                </Text>
                            </View>
                        )}

                    {/* Error state */}
                    {!loading && error && (
                        <View
                            style={{ padding: 40, alignItems: "center", gap: 12 }}
                        >
                            <Text
                                style={{
                                    color: "#ef4444",
                                    fontSize: 15,
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </Text>
                            <TouchableOpacity
                                onPress={refetchAll}
                                style={{
                                    backgroundColor: theme.primary,
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    Retry
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* No results */}
                    {!loading && !error && hasNoResults && (
                        <View style={{ padding: 40, alignItems: "center" }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
                                No groups match your search.
                            </Text>
                        </View>
                    )}

                    {!error && (
                        <>
                            {/* My Groups */}
                            {filteredMyGroups.length > 0 && (
                                <View>
                                    <View style={styles.groupheader}>
                                        <Text style={styles.header}>My Groups</Text>
                                        {filteredMyGroups.length > 3 && (
                                            <TouchableOpacity
                                                onPress={() => setShowAllMyGroups(!showAllMyGroups)}
                                            >
                                                <Text
                                                    style={{
                                                        color: theme.text,
                                                        fontWeight: "600",
                                                        fontStyle: "italic",
                                                        textDecorationLine: "underline",
                                                        textDecorationColor: "#3b82f6",
                                                    }}
                                                >
                                                    {showAllMyGroups ? "Show less" : "View all"}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {displayedMyGroups.map(renderMyGroupCard)}
                                </View>
                            )}

                            {/* Create / Add group */}
                            {/* <View style={styles.addgroup}>
                                <TouchableOpacity
                                    style={styles.addgroup}
                                    onPress={() => router.push("/(tabs)/myGroups/createGroup")}
                                >
                                    <Text style={{ color: theme.text }}>Create/Add a group</Text>
                                    <Plus color={theme.text} />
                                </TouchableOpacity>
                            </View> */}
                            
                             <RenderAddGroup/>
                            

                            {/* Invites */}
                            {filteredInvites.length > 0 && (
                                <View style={styles.invitesection}>
                                    <Text style={styles.header}>Invites</Text>
                                    <ScrollView
                                        horizontal
                                        contentContainerStyle={{ paddingHorizontal: 10, gap: 20 }}
                                        showsHorizontalScrollIndicator={true}
                                    >
                                        {filteredInvites.map(renderInviteCard)}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Discover */}
                            {filteredDiscover.length > 0 && (
                                <View>
                                    <View style={styles.groupheader}>
                                        <Text style={styles.header}>Discover</Text>
                                        {discoverLoading && (
                                            <ActivityIndicator
                                                size="small"
                                                color={theme.primary}
                                            />
                                        )}
                                    </View>
                                    <ScrollView
                                        horizontal
                                        contentContainerStyle={{ paddingHorizontal: 10, gap: 20 }}
                                        showsHorizontalScrollIndicator={true}
                                    >
                                        {filteredDiscover.map(renderDiscoverCard)}
                                    </ScrollView>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>

            {/* ── FEATURE 2: Ask to Join Modal ────────────────────── */}
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
                    {/* Dimmed backdrop — tap to dismiss */}
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                        activeOpacity={1}
                        onPress={closeJoinModal}
                    />

                    {/* Sheet */}
                    <View
                        style={{
                            backgroundColor: theme.background,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: Platform.OS === "ios" ? 40 : 24,
                        }}
                    >
                        {/* Header */}
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 6,
                            }}
                        >
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: "700",
                                        color: theme.text,
                                        marginBottom: 2,
                                    }}
                                >
                                    Ask to Join
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: theme.textSecondary,
                                    }}
                                    numberOfLines={1}
                                >
                                    {joinTargetGroup?.group_name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={closeJoinModal}>
                                <X size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text
                            style={{
                                color: theme.textSecondary,
                                fontSize: 13,
                                marginBottom: 16,
                                marginTop: 8,
                                lineHeight: 19,
                            }}
                        >
                            Introduce yourself to the group admin. Let them know why you'd
                            like to join and what you'll bring to the group.
                        </Text>

                        {/* Message input */}
                        <TextInput
                            multiline
                            numberOfLines={5}
                            placeholder="e.g. Hi! I'm interested in joining because..."
                            placeholderTextColor={theme.textSecondary}
                            value={joinMessage}
                            onChangeText={(text) => {
                                setJoinMessage(text);
                                setJoinMessageError("");
                            }}
                            style={{
                                borderWidth: 1,
                                borderColor: joinMessageError ? "#ef4444" : "#d1d5db",
                                borderRadius: 12,
                                padding: 14,
                                color: theme.text,
                                minHeight: 120,
                                textAlignVertical: "top",
                                marginBottom: 6,
                                fontSize: 14,
                                backgroundColor:
                                    theme.background === "#fff"
                                        ? "#f9fafb"
                                        : "rgba(255,255,255,0.05)",
                            }}
                            autoFocus
                            maxLength={500}
                        />

                        {/* Character count + error */}
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginBottom: 18,
                            }}
                        >
                            {joinMessageError ? (
                                <Text style={{ color: "#ef4444", fontSize: 12 }}>
                                    {joinMessageError}
                                </Text>
                            ) : (
                                <View />
                            )}
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                {joinMessage.length}/500
                            </Text>
                        </View>

                        {/* Submit button */}
                        <TouchableOpacity
                            onPress={handleSubmitJoinRequest}
                            disabled={submitting === joinTargetGroup?.group_id}
                            style={{
                                backgroundColor: theme.primary,
                                paddingVertical: 15,
                                borderRadius: 12,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 8,
                                opacity:
                                    submitting === joinTargetGroup?.group_id ? 0.7 : 1,
                            }}
                        >
                            {submitting === joinTargetGroup?.group_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Send size={18} color="#fff" />
                            )}
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                                {submitting === joinTargetGroup?.group_id
                                    ? "Sending..."
                                    : "Send Request"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {/* ── My Messages Modal (bell icon) ──────────────────────── */}
            <Modal
                visible={messagesModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setMessagesModalVisible(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                    activeOpacity={1}
                    onPress={() => setMessagesModalVisible(false)}
                />
                <View
                    style={{
                        backgroundColor: theme.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: "80%",
                        paddingBottom: Platform.OS === "ios" ? 40 : 24,
                    }}
                >
                    {/* Sheet header */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 20,
                            paddingTop: 20,
                            paddingBottom: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: "rgba(0,0,0,0.06)",
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Bell size={20} color={theme.primary} />
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: theme.text,
                                }}
                            >
                                My Join Requests
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setMessagesModalVisible(false)}>
                            <X size={22} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {messagesLoading ? (
                        <View
                            style={{
                                padding: 40,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text
                                style={{
                                    color: theme.textSecondary,
                                    marginTop: 12,
                                    fontSize: 14,
                                }}
                            >
                                Loading...
                            </Text>
                        </View>
                    ) : messagesError ? (
                        <View style={{ padding: 32, alignItems: "center", gap: 12 }}>
                            <Text
                                style={{
                                    color: "#ef4444",
                                    textAlign: "center",
                                    fontSize: 14,
                                }}
                            >
                                {messagesError}
                            </Text>
                        </View>
                    ) : messages.length === 0 ? (
                        <View
                            style={{
                                padding: 40,
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: theme.primary + "15",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <MessageSquare size={28} color={theme.primary} />
                            </View>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: theme.text,
                                    textAlign: "center",
                                }}
                            >
                                No Messages Yet
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: theme.textSecondary,
                                    textAlign: "center",
                                    lineHeight: 20,
                                }}
                            >
                                Responses to your group join requests will appear here once an
                                admin reviews them.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={{ padding: 16, gap: 12 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {messages.map((msg) => {
                                const isPending  = msg.request_status === "pending";
                                const isApproved = msg.request_status === "approved";
                                const isRejected = msg.request_status === "rejected";
                                const accent   = isApproved ? "#10b981" : isRejected ? "#ef4444" : "#f59e0b";
                                const accentBg = isApproved ? "#d1fae5" : isRejected ? "#fee2e2" : "#fef3c7";
                                const StatusIcon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;
                                const label = isApproved
                                    ? "Request Approved"
                                    : isRejected
                                    ? "Request Rejected"
                                    : "Request Pending";

                                return (
                                    <View
                                        key={msg.request_id}
                                        style={{
                                            backgroundColor: theme.surface ?? theme.background,
                                            borderRadius: 16,
                                            overflow: "hidden",
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.06,
                                            shadowRadius: 8,
                                            elevation: 3,
                                        }}
                                    >
                                        <View
                                            style={{ height: 4, backgroundColor: accent }}
                                        />
                                        <View style={{ padding: 16 }}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            gap: 6,
                                                            marginBottom: 3,
                                                        }}
                                                    >
                                                        <Users size={14} color={theme.textSecondary} />
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                color: theme.textSecondary,
                                                                fontWeight: "500",
                                                            }}
                                                        >
                                                            {msg.group_name}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={{
                                                            fontSize: 16,
                                                            fontWeight: "700",
                                                            color: theme.text,
                                                        }}
                                                    >
                                                        {label}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        backgroundColor: accentBg,
                                                        borderRadius: 20,
                                                        padding: 6,
                                                    }}
                                                >
                                                    <StatusIcon size={20} color={accent} />
                                                </View>
                                            </View>

                                            {msg.admin_message ? (
                                                <View
                                                    style={{
                                                        backgroundColor:
                                                            theme.background === "#fff"
                                                                ? "#f8fafc"
                                                                : "rgba(255,255,255,0.06)",
                                                        borderRadius: 10,
                                                        padding: 12,
                                                        marginBottom: 10,
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: accent,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            color: theme.textSecondary,
                                                            fontWeight: "600",
                                                            textTransform: "uppercase",
                                                            letterSpacing: 0.5,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        Message from Admin
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 14,
                                                            color: theme.text,
                                                            lineHeight: 21,
                                                        }}
                                                    >
                                                        {msg.admin_message}
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {isPending && (
                                                <View
                                                    style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        backgroundColor: "#fef3c722",
                                                        borderRadius: 10,
                                                        padding: 10,
                                                    }}
                                                >
                                                    <Clock size={14} color="#f59e0b" />
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            color: "#f59e0b",
                                                            fontWeight: "500",
                                                            flex: 1,
                                                        }}
                                                    >
                                                        Awaiting review by the group admin.
                                                    </Text>
                                                </View>
                                            )}
                                            {isApproved && (
                                                <View
                                                    style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        backgroundColor: "#d1fae522",
                                                        borderRadius: 10,
                                                        padding: 10,
                                                    }}
                                                >
                                                    <Bell size={14} color="#10b981" />
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            color: "#10b981",
                                                            fontWeight: "500",
                                                            flex: 1,
                                                        }}
                                                    >
                                                        Check your Invites section to join the group.
                                                    </Text>
                                                </View>
                                            )}

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.textSecondary,
                                                    marginTop: 10,
                                                }}
                                            >
                                                {msg.reviewed_at
                                                    ? `Reviewed ${formatRelativeDate(msg.reviewed_at)}`
                                                    : `Submitted ${formatRelativeDate(msg.created_at)}`}
                                            </Text>
                                        </View>
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