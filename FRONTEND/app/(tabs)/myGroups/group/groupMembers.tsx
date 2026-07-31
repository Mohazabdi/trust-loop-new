import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupPageStyles } from "@/styles/group_style/group_page.styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BellIcon,
  ChevronLeft,
  MessageCircle,
  Search,
  SquareArrowRightExit,
  UserPlus,
  X,
  Check,
} from "lucide-react-native";
import { NotificationBadge } from "@/components/myGroups/NotificationBadge";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useGroupJoinRequests } from "@/hooks/useGroupJoinRequests";
import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useMemberData } from "@/hooks/useMemberData";
import { useAvailableMembersForInvitation } from "@/hooks/useAvailableMembersForInvitation";
import { useInviteMembersToGroup } from "@/hooks/useInviteMembersToGroup";
import { useLeaveGroupMutation } from "@/hooks/useLeaveGroup";
import {
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function GroupMembersPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();


  const { group_id: groupId,groupName:groupNameParam } = useLocalSearchParams<{ group_id: string ,groupName:string}>();
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);

  if (!groupId || !isValidUUID) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ color: "red" }}>
          Invalid group ID. Please go back.
        </Text>
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
    const currentMember = members.find((m) => m.member_id === currentMemberId);
    return currentMember?.member_role === "admin";
  }, [currentMemberId, members]);

  const {
    requests,
} = useGroupJoinRequests(groupId, isAdmin, currentMemberId);

const pendingRequests = useMemo(
    () => requests.filter((r) => r.request_status === "pending"),
    [requests]
);

const { unreadCount: requestsBadgeCount, markAsSeen: markRequestsAsSeen } =
    useNotificationBadge(
        `badge_join_requests_${groupId}`,
        pendingRequests
    );

  const [searchInput, setSearchInput] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  const {
    members: availableMembers,
    loading: availableLoading,
    hasMore,
    loadMore,
    search: searchAvailable,
    reset: resetAvailable,
  } = useAvailableMembersForInvitation(groupId!);

  const {
    inviteMembers,
    loading: inviteLoading,
    error: inviteError,
  } = useInviteMembersToGroup();

  // ── CHANGED: rightAction now navigates to groupNotifications ──
 const rightAction = useCallback(() => {
    markRequestsAsSeen();
    router.push({
        pathname: "/(tabs)/myGroups/group/groupNotifications",
        params: { group: groupId, groupName: groupNameParam },
    });
}, [router, groupId, groupNameParam, markRequestsAsSeen]);

  const leftAction = () => router.back();
  const styles = useMemo(() => GroupPageStyles(theme), [theme]);

  const handleSearch = (text: string) => {
    setSearchInput(text);
    if (modalVisible) {
      searchAvailable(text);
    }
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
        `${result.invited_count} invitation(s) sent successfully.\n${result.skipped_count} skipped.`
      );
      setModalVisible(false);
      refetchMembers();
    } else if (inviteError) {
      Alert.alert("Error", inviteError);
    } else {
      Alert.alert("Error", "Failed to send invitations. Please try again.");
    }
  };

  const renderMemberCard = (member: any) => (
    <View
      key={member.member_id}
      style={{
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: theme.text,
            }}
          >
            {member.first_name} {member.last_name}
          </Text>
          {member.email && (
            <Text style={{ color: theme.textSecondary }}>{member.email}</Text>
          )}
          <Text
            style={{
              fontSize: 12,
              color: theme.primary,
              marginTop: 4,
            }}
          >
            Role: {member.member_role}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
            Joined: {new Date(member.joined_at).toLocaleDateString()}
          </Text>
        </View>
        {isAdmin && member.member_role !== "admin" && (
          <TouchableOpacity onPress={() => {}}>
            <MessageCircle size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderInvitableItem = ({ item }: { item: any }) => {
    const isSelected = selectedMembers.has(item.member_id);
    return (
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#ddd",
          backgroundColor: isSelected ? "#e6f7ff" : "transparent",
        }}
        onPress={() => toggleSelectMember(item.member_id)}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "500" }}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={{ fontSize: 13, color: "#666" }}>
            {item.email || item.primary_phone}
          </Text>
        </View>
        {isSelected && <Check size={20} color={theme.primary} />}
      </TouchableOpacity>
    );
  };

  if (!groupId) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "red" }}>
          Group ID is missing. Please go back and try again.
        </Text>
      </SafeAreaView>
    );
  }

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
        { text: "OK", onPress: () => router.replace("/myGroups") },
      ]);
    } catch (err: any) {
      setConfirmLeaveVisible(false);
      Alert.alert(
        "Error",
        err?.message ?? "Failed to leave group. Please try again."
      );
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomGroupHeader
        groupName={groupNameParam ? `${groupNameParam} Members` : "Group Members"}
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
            icon: BellIcon,
            action: rightAction,
            badgeCount: isAdmin ? requestsBadgeCount : 0,
        }}
    />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            minHeight: SCREEN_HEIGHT * 0.4,
            justifyContent: "center",
            alignItems: "center",
            gap: 21,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontWeight: "bold" }}>
            Meet everyone
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
              gap: 10,
              borderWidth: 1,
              backgroundColor: theme.background,
              borderColor: theme.background,
              borderRadius: 30,
              shadowColor: theme.foreground,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              inputMode="text"
              value={searchInput}
              onChangeText={handleSearch}
              placeholder="I'll find that member like yesterday"
              placeholderTextColor={theme.textSecondary}
              style={{ width: SCREEN_WIDTH * 0.7 }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 20,
              justifyContent: "flex-start",
              alignItems: "center",
              flexWrap: "wrap",
              maxWidth: SCREEN_WIDTH * 0.7,
            }}
          >
            {isAdmin && (
              <TouchableOpacity
                onPress={openInviteModal}
                style={{
                  padding: 10,
                  borderRadius: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "#17690c",
                  width: 70,
                }}
              >
                <UserPlus size={22} color={theme.surface} />
                <Text
                  style={{
                    color: theme.surface,
                    fontWeight: "bold",
                    fontSize: 11,
                  }}
                >
                  Invite
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                padding: 10,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#152a3b",
                width: 70,
              }}
            >
              <MessageCircle size={22} color={theme.surface} />
              <Text
                style={{
                  color: theme.surface,
                  fontWeight: "bold",
                  fontSize: 11,
                }}
              >
                Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLeavePress}
              style={{
                padding: 10,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#9c612a",
                width: 70,
              }}
            >
              <SquareArrowRightExit size={22} color={theme.surface} />
              <Text
                style={{
                  color: theme.surface,
                  fontWeight: "bold",
                  fontSize: 11,
                }}
              >
                Leave
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.groupContentContainer}>
          {membersLoading ? (
            <ActivityIndicator
              size="large"
              color={theme.primary}
              style={{ marginTop: 20 }}
            />
          ) : membersError ? (
            <Text
              style={{
                color: "red",
                textAlign: "center",
                marginTop: 20,
              }}
            >
              {membersError}
            </Text>
          ) : members.length === 0 ? (
            <Text
              style={{
                textAlign: "center",
                marginTop: 20,
                color: theme.textSecondary,
              }}
            >
              No members found.
            </Text>
          ) : (
            members.map(renderMemberCard)
          )}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#ccc",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: theme.text,
              }}
            >
              Invite Members
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 12 }}>
            <TextInput
              placeholder="Search by name, email or phone"
              placeholderTextColor={theme.textSecondary}
              onChangeText={searchAvailable}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
              }}
            />
            <FlatList
              data={availableMembers}
              keyExtractor={(item) => item.member_id}
              renderItem={renderInvitableItem}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                availableLoading ? (
                  <ActivityIndicator size="small" />
                ) : null
              }
              ListEmptyComponent={
                !availableLoading && availableMembers.length === 0 ? (
                  <Text style={{ textAlign: "center", marginTop: 20 }}>
                    No available members to invite
                  </Text>
                ) : null
              }
            />
          </View>

          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: "#ccc",
            }}
          >
            <TouchableOpacity
              onPress={handleSendInvites}
              disabled={inviteLoading || selectedMembers.size === 0}
              style={{
                backgroundColor: theme.primary,
                padding: 14,
                borderRadius: 8,
                alignItems: "center",
                opacity:
                  inviteLoading || selectedMembers.size === 0 ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {inviteLoading
                  ? "Sending..."
                  : `Send Invites (${selectedMembers.size})`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Leave Group – Step 1: Reason */}
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
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            activeOpacity={1}
            onPress={() => setLeaveModalVisible(false)}
          />
          <View
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: Platform.OS === "ios" ? 34 : 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: theme.text,
                }}
              >
                Why are you leaving?
              </Text>
              <TouchableOpacity
                onPress={() => setLeaveModalVisible(false)}
              >
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              Note: You cannot leave while in an Active Rotation.
            </Text>

            <TextInput
              multiline
              numberOfLines={4}
              placeholder="e.g. I'm no longer participating in rotations..."
              placeholderTextColor={theme.textSecondary}
              value={leaveReason}
              onChangeText={(text) => {
                setLeaveReason(text);
                setLeaveReasonError("");
              }}
              style={{
                borderWidth: 1,
                borderColor: leaveReasonError ? "#e74c3c" : "#ccc",
                borderRadius: 10,
                padding: 12,
                color: theme.text,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: 6,
              }}
              autoFocus
            />
            {!!leaveReasonError && (
              <Text
                style={{
                  color: "#e74c3c",
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                {leaveReasonError}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleLeaveReasonContinue}
              style={{
                backgroundColor: "#9c612a",
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Leave Group – Step 2: Confirm */}
      <Modal
        visible={confirmLeaveVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmLeaveVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 16,
              padding: 24,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: theme.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Leave Group?
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              This action cannot be undone. You will lose access to all group
              activities and rotation plans.
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setConfirmLeaveVisible(false);
                  setLeaveModalVisible(true);
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#ccc",
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>
                  Go Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmLeave}
                disabled={leaveGroupMutation.isPending}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#c0392b",
                  opacity: leaveGroupMutation.isPending ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {leaveGroupMutation.isPending ? "Leaving..." : "Yes, Leave"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}