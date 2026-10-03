import { useGlobalStorage } from "@/store/useGlobalStorage";
import { AvailableMember, useAvailableMembers, useInviteMembers } from "@/hooks/Usegroupmembershooks";
import { Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface InviteMembersModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onInviteSuccess: () => void; // refetch group members after successful invite
}

export default function InviteMembersModal({
  visible,
  groupId,
  onClose,
  onInviteSuccess,
}: InviteMembersModalProps) {
  const { theme } = useGlobalStorage();
  const { availableMembers, loading: fetchLoading, error: fetchError, fetchAvailable } =
    useAvailableMembers(groupId);
  const { sendInvitations, loading: inviteLoading, error: inviteError } =
    useInviteMembers();

  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch available members when modal opens, and re-fetch when search changes
  useEffect(() => {
    if (visible) {
      fetchAvailable(searchText || undefined);
    }
  }, [visible, searchText, fetchAvailable]);

  // Clear selection when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setSearchText("");
    }
  }, [visible]);

 
const toggleSelection = useCallback(async (memberId: string) => {
    setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(memberId)) {
            next.delete(memberId);
        } else {
            next.add(memberId);
        }
        return next;
    });

    // If this is the FIRST member being selected (nothing was selected before),
    // invite immediately without waiting for the Send button.
    if (selectedIds.size === 0) {
        const result = await sendInvitations(groupId, [memberId]);
        if (!result) return;

        if (result.status === "success" || result.status === "partial") {
            Alert.alert(
                "Invitation Sent",
                `Invitation sent successfully to 1 member.`,
                [{ text: "OK", onPress: () => { onClose(); onInviteSuccess(); } }]
            );
        } else {
            const reason = result.skipped_details[0]?.reason ?? "unknown";
            Alert.alert("Not Sent", `Could not invite this member: ${reason}`);
        }
    }
    // If members were already selected, just add to selection —
    // admin uses the Send button to dispatch the batch.
}, [selectedIds, groupId, sendInvitations, onClose, onInviteSuccess]);

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      Alert.alert("No members selected", "Please select at least one member to invite.");
      return;
    }

    const result = await sendInvitations(groupId, Array.from(selectedIds));
    if (!result) return; // error already set in hook

    if (result.status === "success") {
      Alert.alert(
        "Invitations Sent",
        `Successfully invited ${result.invited_count} member${result.invited_count !== 1 ? "s" : ""}.`,
        [{ text: "OK", onPress: () => { onClose(); onInviteSuccess(); } }]
      );
    } else if (result.status === "partial") {
      const skippedReasons = result.skipped_details
        .map((s) => `• ${s.reason}`)
        .join("\n");
      Alert.alert(
        "Partially Sent",
        `${result.invited_count} invited, ${result.skipped_count} skipped:\n${skippedReasons}`,
        [{ text: "OK", onPress: () => { onClose(); onInviteSuccess(); } }]
      );
    } else {
      // all skipped
      const skippedReasons = result.skipped_details
        .map((s) => `• ${s.reason}`)
        .join("\n");
      Alert.alert("No Invitations Sent", `All members were skipped:\n${skippedReasons}`);
    }
  };

  const renderMemberRow = ({ item }: { item: AvailableMember }) => {
    const selected = selectedIds.has(item.member_id);
    const displayName =
      `${item.first_name.charAt(0).toUpperCase()}${item.first_name.slice(1)} ` +
      `${item.last_name.charAt(0).toUpperCase()}${item.last_name.slice(1)}`;

    return (
      <TouchableOpacity
        onPress={() => toggleSelection(item.member_id)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.background,
          backgroundColor: selected ? `${theme.primary}18` : theme.surface,
        }}
      >
        {/* Avatar placeholder */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Users size={22} color={theme.textSecondary} />
        </View>

        {/* Name + email */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "600", fontSize: 15 }}>
            {displayName}
          </Text>
          {item.email ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              {item.email}
            </Text>
          ) : item.primary_phone ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              {item.primary_phone}
            </Text>
          ) : null}
        </View>

        {/* Selection indicator */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: selected ? theme.primary : theme.textSecondary,
            backgroundColor: selected ? theme.primary : "transparent",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {selected && (
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>✓</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "80%",
            paddingBottom: 30,
          }}
        >
          {/* ── Modal header ── */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.background,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>
              Invite Members
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.textSecondary, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* ── Search input ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: 12,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: theme.background,
              gap: 8,
            }}
          >
            <TextInput
              placeholder="Search by name, email or phone..."
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              style={{ flex: 1, color: theme.text, paddingVertical: 10 }}
            />
          </View>

          {/* ── Selection count ── */}
          {selectedIds.size > 0 && (
            <Text
              style={{
                color: theme.primary,
                fontWeight: "600",
                paddingHorizontal: 16,
                paddingBottom: 8,
                fontSize: 13,
              }}
            >
              {selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected
            </Text>
          )}

          {/* ── List ── */}
          {fetchLoading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : fetchError ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "#ef4444", textAlign: "center" }}>{fetchError}</Text>
            </View>
          ) : availableMembers.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary }}>
                No members available to invite.
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableMembers}
              keyExtractor={(item) => item.member_id}
              renderItem={renderMemberRow}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* ── Send button ── */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={inviteLoading || selectedIds.size === 0}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor:
                selectedIds.size === 0 ? theme.textSecondary : "#17690c",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: inviteLoading ? 0.7 : 1,
            }}
          >
            {inviteLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Send{selectedIds.size > 0 ? ` ${selectedIds.size} Invitation${selectedIds.size !== 1 ? "s" : ""}` : " Invitations"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}