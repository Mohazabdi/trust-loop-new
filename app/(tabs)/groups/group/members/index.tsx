import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BellIcon,
  Check,
  ChevronLeft,
  LogOut,
  Search,
  UserPlus,
  X,
} from "lucide-react-native";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useGroupJoinRequests } from "@/hooks/useGroupJoinRequests";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useMemberData } from "@/hooks/useMemberData";
import { useAvailableMembersForInvitation } from "@/hooks/useAvailableMembersForInvitation";
import { useInviteMembersToGroup } from "@/hooks/useInviteMembersToGroup";
import { useLeaveGroupMutation } from "@/hooks/useLeaveGroup";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ------------------------------------------------------------------ */
/*  Design tokens — claymorphism system                               */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#E8EDF5",
  surface: "#F3F6FB",
  surfaceRaised: "#F7FAFE",
  sunken: "#DFE6F0",
  highlight: "#FFFFFF",
  shade: "rgba(148, 163, 184, 0.55)",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

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

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const initials = (first?: string, last?: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase() || "?"}`;

const formatJoined = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
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

export default function GroupMembersPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();

  const { group_id: groupId, groupName: groupNameParam } = useLocalSearchParams<{
    group_id: string;
    groupName: string;
  }>();

  const isValidUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      groupId ?? ""
    );

  if (!groupId || !isValidUUID) {
    return (
      <SafeAreaView style={styles.invalidRoot}>
        <Clay radius={RADIUS.lg} depth={1} bodyStyle={styles.invalidCard}>
          <Text style={styles.invalidTitle}>Invalid group ID</Text>
          <Text style={styles.invalidBody}>
            Please go back and open the group again.
          </Text>
        </Clay>
      </SafeAreaView>
    );
  }

  const {
    members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useGroupMembers(groupId);

  const { data: memberData } = useMemberData();
  const currentMemberId = memberData?.id;

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveReasonError, setLeaveReasonError] = useState("");
  const leaveGroupMutation = useLeaveGroupMutation();

  const isAdmin = useMemo(() => {
    if (!currentMemberId || !members.length) return false;
    const current = members.find((m) => m.member_id === currentMemberId);
    return current?.member_role === "admin";
  }, [currentMemberId, members]);

  const { requests } = useGroupJoinRequests(groupId, isAdmin, currentMemberId);
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.request_status === "pending"),
    [requests]
  );

  const { unreadCount: requestsBadgeCount, markAsSeen: markRequestsAsSeen } =
    useNotificationBadge(`badge_join_requests_${groupId}`, pendingRequests);

  const [searchInput, setSearchInput] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  const {
    members: availableMembers,
    loading: availableLoading,
    loadMore,
    search: searchAvailable,
    reset: resetAvailable,
  } = useAvailableMembersForInvitation(groupId!);

  const {
    inviteMembers,
    loading: inviteLoading,
    error: inviteError,
  } = useInviteMembersToGroup();

  const rightAction = useCallback(() => {
    markRequestsAsSeen();
    router.push({
      pathname: "/(tabs)/groups/group/notifications",
      params: { group: groupId, groupName: groupNameParam },
    });
  }, [router, groupId, groupNameParam, markRequestsAsSeen]);

  const leftAction = () => router.back();

  const filteredMembers = useMemo(() => {
    if (!searchInput.trim()) return members;
    const q = searchInput.toLowerCase();
    return members.filter((m) => {
      const full = `${m.first_name} ${m.last_name}`.toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return full.includes(q) || email.includes(q);
    });
  }, [members, searchInput]);

  const handleSearch = (text: string) => {
    setSearchInput(text);
    if (modalVisible) searchAvailable(text);
  };

  const openInviteModal = () => {
    setSelectedMembers(new Set());
    resetAvailable();
    setModalVisible(true);
  };

  const toggleSelectMember = (memberId: string) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(memberId)) newSet.delete(memberId);
    else newSet.add(memberId);
    setSelectedMembers(newSet);
  };

  const handleSendInvites = async () => {
    if (selectedMembers.size === 0) {
      Alert.alert("No selection", "Please select at least one member to invite.");
      return;
    }
    if (!groupId || !currentMemberId) {
      Alert.alert("Error", "Missing group or member information.");
      return;
    }
    const inviteeIds = Array.from(selectedMembers);
    const result = await inviteMembers(groupId, currentMemberId, inviteeIds);
    if (result && (result.status === "success" || result.status === "partial")) {
      Alert.alert(
        "Invitation Sent",
        `${result.invited_count} invitation(s) sent.\n${result.skipped_count} skipped.`
      );
      setModalVisible(false);
      refetchMembers();
    } else if (inviteError) {
      Alert.alert("Error", inviteError);
    } else {
      Alert.alert("Error", "Failed to send invitations. Please try again.");
    }
  };

  const handleLeavePress = () => {
    setLeaveReason("");
    setLeaveReasonError("");
    setLeaveModalVisible(true);
  };

  const handleLeaveReasonContinue = () => {
    if (!leaveReason.trim()) {
      setLeaveReasonError("Please provide a reason before continuing.");
      return;
    }
    setLeaveModalVisible(false);
    setConfirmLeaveVisible(true);
  };

  const handleConfirmLeave = async () => {
    if (!groupId || !currentMemberId) {
      Alert.alert("Error", "Missing group or member information.");
      return;
    }
    try {
      await leaveGroupMutation.mutateAsync({
        group_id: groupId,
        member_id: currentMemberId,
        reason: leaveReason.trim(),
      });
      setConfirmLeaveVisible(false);
      Alert.alert("Left Group", "You have successfully left the group.", [
        { text: "OK", onPress: () => router.replace("/groups") },
      ]);
    } catch (err: any) {
      setConfirmLeaveVisible(false);
      Alert.alert(
        "Error",
        err?.message ?? "Failed to leave group. Please try again."
      );
    }
  };

  /* ── Member row ──────────────────────────────────────── */
  const MemberRow = ({
    member,
    isLast,
  }: {
    member: any;
    isLast: boolean;
  }) => {
    const isMemberAdmin = member.member_role === "admin";

    return (
      <View style={[styles.memberRow, !isLast && styles.memberRowDivider]}>
        <View
          style={[
            styles.memberAvatar,
            {
              backgroundColor: isMemberAdmin
                ? ACCENT.navySoft
                : CLAY.sunken,
            },
          ]}
        >
          <Text
            style={[
              styles.memberAvatarText,
              { color: isMemberAdmin ? ACCENT.navy : CLAY.inkSoft },
            ]}
          >
            {initials(member.first_name, member.last_name)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.first_name} {member.last_name}
          </Text>
          {member.email ? (
            <Text style={styles.memberEmail} numberOfLines={1}>
              {member.email}
            </Text>
          ) : null}
          <View style={styles.memberMeta}>
            <View
              style={[
                styles.rolePill,
                {
                  backgroundColor: isMemberAdmin
                    ? ACCENT.navySoft
                    : CLAY.sunken,
                },
              ]}
            >
              <Text
                style={[
                  styles.rolePillText,
                  { color: isMemberAdmin ? ACCENT.navy : CLAY.inkSoft },
                ]}
              >
                {member.member_role}
              </Text>
            </View>
            <Text style={styles.memberMetaText}>
              Joined {formatJoined(member.joined_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName={
          groupNameParam ? `${groupNameParam} · Members` : "Group Members"
        }
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
          badgeCount: isAdmin ? requestsBadgeCount : 0,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Intro ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>MEMBERS</Text>
            <Text style={styles.headerTitle}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
            <Text style={styles.headerHint}>
              Everyone in this group, sorted by join date.
            </Text>
          </View>
        </View>

        {/* ── Admin invite action ──────────────────────── */}
        {isAdmin ? (
          <TouchableOpacity
            onPress={openInviteModal}
            activeOpacity={0.9}
            style={styles.inviteWrap}
          >
            <Clay
              radius={RADIUS.lg}
              depth={0}
              bodyStyle={styles.inviteBtn}
            >
              <UserPlus size={15} color={ACCENT.navy} strokeWidth={2.4} />
              <Text style={styles.inviteBtnText}>Invite members</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── Search ────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
          <TextInput
            inputMode="text"
            value={searchInput}
            onChangeText={handleSearch}
            placeholder="Search by name or email"
            placeholderTextColor={CLAY.inkFaint}
            style={styles.searchInput}
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchInput("")} hitSlop={8}>
              <X size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Section label ─────────────────────────────── */}
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionLabel}>
            {searchInput
              ? `${filteredMembers.length} result${
                  filteredMembers.length === 1 ? "" : "s"
                }`
              : "All members"}
          </Text>
        </View>

        {/* ── Members card ──────────────────────────────── */}
        {membersLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading members…</Text>
          </View>
        ) : membersError ? (
          <View style={styles.listBlock}>
            <Clay bodyStyle={styles.errorCard}>
              <Text style={styles.errorText}>{membersError}</Text>
            </Clay>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={styles.listBlock}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {searchInput ? "No matches" : "No members yet"}
              </Text>
              <Text style={styles.emptyBody}>
                {searchInput
                  ? `Nothing matches "${searchInput}".`
                  : "Members will appear here once they join."}
              </Text>
            </Clay>
          </View>
        ) : (
          <View style={styles.listBlock}>
            <Clay bodyStyle={styles.membersCard}>
              {filteredMembers.map((m, i) => (
                <MemberRow
                  key={m.member_id}
                  member={m}
                  isLast={i === filteredMembers.length - 1}
                />
              ))}
            </Clay>
          </View>
        )}

        {/* ── Leave ribbon ──────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLeavePress}
          activeOpacity={0.9}
          style={styles.leaveWrap}
        >
          <Clay
            radius={RADIUS.lg}
            depth={0}
            bodyStyle={styles.leaveRibbon}
          >
            <LogOut size={16} color={ACCENT.red} strokeWidth={2.4} />
            <Text style={styles.leaveRibbonText}>Leave group</Text>
          </Clay>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You cannot leave while you are in an active rotation.
        </Text>
      </ScrollView>

      {/* ── Invite modal ──────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.root}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.modalEyebrow}>INVITE</Text>
              <Text style={styles.modalTitle}>
                {selectedMembers.size > 0
                  ? `${selectedMembers.size} selected`
                  : "Add to group"}
              </Text>
              <Text style={styles.modalHint}>
                People you can bring into this group.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              hitSlop={10}
            >
              <X size={22} color={CLAY.ink} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchWrap}>
            <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
            <TextInput
              placeholder="Search by name, email or phone"
              placeholderTextColor={CLAY.inkFaint}
              onChangeText={searchAvailable}
              style={styles.modalSearchInput}
            />
          </View>

          <FlatList
            data={availableMembers}
            keyExtractor={(item) => item.member_id}
            contentContainerStyle={styles.inviteListContent}
            renderItem={({ item }) => {
              const isSelected = selectedMembers.has(item.member_id);
              return (
                <TouchableOpacity
                  onPress={() => toggleSelectMember(item.member_id)}
                  activeOpacity={0.9}
                  style={styles.inviteRowWrap}
                >
                  <Clay
                    bodyStyle={[
                      styles.inviteRow,
                      isSelected && styles.inviteRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: CLAY.sunken },
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberAvatarText,
                          { color: CLAY.inkSoft },
                        ]}
                      >
                        {initials(item.first_name, item.last_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {item.email || item.primary_phone}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.selectCircle,
                        isSelected && styles.selectCircleActive,
                      ]}
                    >
                      {isSelected ? (
                        <Check size={12} color="#fff" strokeWidth={3} />
                      ) : null}
                    </View>
                  </Clay>
                </TouchableOpacity>
              );
            }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              availableLoading ? (
                <ActivityIndicator
                  size="small"
                  style={{ marginVertical: 12 }}
                />
              ) : null
            }
            ListEmptyComponent={
              !availableLoading && availableMembers.length === 0 ? (
                <View style={styles.inviteListContent}>
                  <Clay bodyStyle={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No one to invite</Text>
                    <Text style={styles.emptyBody}>
                      There are no eligible members available right now.
                    </Text>
                  </Clay>
                </View>
              ) : null
            }
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleSendInvites}
              disabled={inviteLoading || selectedMembers.size === 0}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <Clay
                color={theme.primary}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.34)"
                shade="rgba(12, 45, 22, 0.42)"
                bodyStyle={[
                  styles.primaryBtn,
                  (inviteLoading || selectedMembers.size === 0) && {
                    opacity: 0.6,
                  },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {inviteLoading
                    ? "Sending…"
                    : selectedMembers.size > 0
                    ? `Send ${selectedMembers.size} invite${
                        selectedMembers.size === 1 ? "" : "s"
                      }`
                    : "Send invites"}
                </Text>
              </Clay>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Leave — reason ───────────────────────────────── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setLeaveModalVisible(false)}
          />
          <View style={styles.sheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Why are you leaving?</Text>
                <TouchableOpacity
                  onPress={() => setLeaveModalVisible(false)}
                  hitSlop={10}
                >
                  <X size={20} color={CLAY.ink} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetNote}>
                This helps the group admin understand your decision. It is
                recorded with your account.
              </Text>

              <TextInput
                multiline
                numberOfLines={4}
                placeholder="e.g. I'm no longer participating in rotations…"
                placeholderTextColor={CLAY.inkFaint}
                value={leaveReason}
                onChangeText={(text) => {
                  setLeaveReason(text);
                  setLeaveReasonError("");
                }}
                style={[
                  styles.textArea,
                  leaveReasonError && { borderColor: ACCENT.red },
                ]}
                autoFocus
              />
              {!!leaveReasonError && (
                <Text style={styles.fieldError}>{leaveReasonError}</Text>
              )}

              <TouchableOpacity
                onPress={handleLeaveReasonContinue}
                activeOpacity={0.9}
                style={{ marginTop: SPACING.md }}
              >
                <Clay
                  color={ACCENT.red}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(120, 40, 40, 0.35)"
                  bodyStyle={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </Clay>
              </TouchableOpacity>
            </Clay>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Leave — confirm ──────────────────────────────── */}
      <Modal
        visible={confirmLeaveVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmLeaveVisible(false)}
      >
        <View style={styles.confirmBackdrop}>
          <Clay
            radius={RADIUS.xl}
            depth={2}
            style={styles.confirmShell}
            bodyStyle={styles.confirmCard}
          >
            <Text style={styles.confirmTitle}>Leave group?</Text>
            <Text style={styles.confirmBody}>
              This action cannot be undone. You will lose access to all group
              activities and rotation plans.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => {
                  setConfirmLeaveVisible(false);
                  setLeaveModalVisible(true);
                }}
                activeOpacity={0.9}
                style={styles.confirmBtnGhost}
              >
                <Text style={styles.confirmBtnGhostText}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLeave}
                disabled={leaveGroupMutation.isPending}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  color={ACCENT.red}
                  radius={RADIUS.md}
                  depth={0}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(120, 40, 40, 0.32)"
                  bodyStyle={[
                    styles.confirmBtnPrimary,
                    leaveGroupMutation.isPending && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.confirmBtnPrimaryText}>
                    {leaveGroupMutation.isPending
                      ? "Leaving…"
                      : "Yes, leave"}
                  </Text>
                </Clay>
              </TouchableOpacity>
            </View>
          </Clay>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Invalid group */
  invalidRoot: {
    flex: 1,
    backgroundColor: CLAY.canvas,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  invalidCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 6,
    width: "100%",
    maxWidth: 320,
  },
  invalidTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  invalidBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Intro */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  headerHint: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
    marginTop: 2,
  },

  /* Invite button */
  inviteWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: 0.1,
  },

  /* Search — recessed well */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },

  /* Section label */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  listBlock: { paddingHorizontal: SPACING.xl },

  /* Members card */
  membersCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md + 2,
  },
  memberRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  memberEmail: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  memberMetaText: {
    fontSize: 11,
    color: CLAY.inkFaint,
    fontWeight: "600",
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  /* Loading / empty / error */
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  errorCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  errorText: {
    color: ACCENT.red,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Leave ribbon */
  leaveWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  leaveRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: ACCENT.redSoft,
  },
  leaveRibbonText: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT.red,
    letterSpacing: 0.1,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11.5,
    color: CLAY.inkFaint,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    lineHeight: 16,
    fontWeight: "500",
  },

  /* Modal (invite) */
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.5,
  },
  modalHint: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
    marginTop: 2,
  },
  modalSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  modalSearchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },
  inviteListContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  inviteRowWrap: { marginBottom: SPACING.sm },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  inviteRowSelected: {
    backgroundColor: ACCENT.navySoft,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: CLAY.inkFaint,
    justifyContent: "center",
    alignItems: "center",
  },
  selectCircleActive: {
    borderColor: ACCENT.navy,
    backgroundColor: ACCENT.navy,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CLAY.hairline,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: -0.2,
  },

  /* Leave sheet */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)" },
  sheetWrap: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: CLAY.sunken,
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  sheetNote: {
    color: CLAY.inkSoft,
    marginBottom: SPACING.md,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  textArea: {
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
    borderRadius: RADIUS.md,
    padding: 14,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "600",
  },
  fieldError: {
    color: ACCENT.red,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },

  /* Confirm sheet */
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: SPACING.xl,
  },
  confirmShell: {
    width: "100%",
    maxWidth: 380,
    borderRadius: RADIUS.xl,
  },
  confirmCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: CLAY.ink,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  confirmBody: {
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: SPACING.md,
  },
  confirmActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  confirmBtnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: CLAY.sunken,
  },
  confirmBtnGhostText: {
    color: CLAY.ink,
    fontWeight: "700",
    fontSize: 14,
  },
  confirmBtnPrimary: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});