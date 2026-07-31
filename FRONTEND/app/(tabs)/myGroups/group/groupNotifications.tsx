import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Check,
    ChevronLeft,
    RefreshCw,
    X,
    Clock,
    CheckCircle,
    XCircle,
    MessageSquare,
    Users,
    AlertCircle,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useGroupJoinRequests } from "@/hooks/useGroupJoinRequests";
import { useMemberData } from "@/hooks/useMemberData";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { supabase } from "@/lib/mysupabase/supabase";

const STATUS_CONFIG = {
    pending: {
        label: "Pending",
        bg: "#fef3c7",
        text: "#92400e",
        icon: Clock,
        iconColor: "#d97706",
    },
    approved: {
        label: "Approved",
        bg: "#d1fae5",
        text: "#065f46",
        icon: CheckCircle,
        iconColor: "#10b981",
    },
    rejected: {
        label: "Rejected",
        bg: "#fee2e2",
        text: "#991b1b",
        icon: XCircle,
        iconColor: "#ef4444",
    },
} as const;

export default function GroupNotificationsPage() {
    const { theme } = useGlobalStorage();
    const router = useRouter();
    const { group: groupId, groupName: groupNameParam } =
        useLocalSearchParams<{ group: string; groupName: string }>();

    const { data: memberData } = useMemberData();
    const currentMemberId = memberData?.id;

    const { members, loading: membersLoading } = useGroupMembers(groupId);
    const isAdmin = useMemo(() => {
        if (!currentMemberId || !members.length) return false;
        const me = members.find((m) => m.member_id === currentMemberId);
        return me?.member_role === "admin";
    }, [currentMemberId, members]);

    const {
        requests,
        loading: requestsLoading,
        error: requestsError,
        refetch: refetchRequests,
    } = useGroupJoinRequests(groupId, isAdmin, currentMemberId);

    useFocusEffect(
        useCallback(() => {
            refetchRequests();
        }, [refetchRequests])
    );

    const pendingCount = useMemo(
        () => requests.filter((r) => r.request_status === "pending").length,
        [requests]
    );

    // ── Approve modal ─────────────────────────────────────────
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [approveTarget, setApproveTarget] = useState<any>(null);
    const [approveMessage, setApproveMessage] = useState("");
    const [approveMessageError, setApproveMessageError] = useState("");
    const [approving, setApproving] = useState(false);

    // ── Reject modal ──────────────────────────────────────────
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectReasonError, setRejectReasonError] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const openApproveModal = (request: any) => {
        setApproveTarget(request);
        setApproveMessage("");
        setApproveMessageError("");
        setApproveModalVisible(true);
    };

    const openRejectModal = (request: any) => {
        setRejectTarget(request);
        setRejectReason("");
        setRejectReasonError("");
        setRejectModalVisible(true);
    };

    const handleApprove = async () => {
        if (!approveMessage.trim()) {
            setApproveMessageError("Please provide an approval message.");
            return;
        }
        if (!approveTarget || !currentMemberId) return;
        setApproving(true);
        try {
            const { data, error } = await supabase.rpc(
                "group_join_request_approve",
                {
                    p_group_join_request_id: approveTarget.request_id,
                    p_reviewed_by: currentMemberId,
                    p_admin_message: approveMessage.trim(),
                }
            );
            if (error) throw new Error(error.message);
            setApproveModalVisible(false);
            refetchRequests();
            Alert.alert(
                "Request Approved",
                `An invitation has been sent to ${approveTarget.requester_name}. They must accept it to join the group.`
            );
        } catch (err: any) {
            Alert.alert("Error", err.message ?? "Could not approve request.");
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setRejectReasonError("A rejection reason is required.");
            return;
        }
        if (!rejectTarget || !currentMemberId) return;
        setRejecting(true);
        try {
            const { data, error } = await supabase.rpc(
                "group_join_request_reject",
                {
                    p_group_join_request_id: rejectTarget.request_id,
                    p_reviewed_by: currentMemberId,
                    p_admin_message: rejectReason.trim(),
                }
            );
            if (error) throw new Error(error.message);
            setRejectModalVisible(false);
            refetchRequests();
            Alert.alert(
                "Request Rejected",
                `${rejectTarget.requester_name}'s request has been rejected and they have been notified.`
            );
        } catch (err: any) {
            Alert.alert("Error", err.message ?? "Could not reject request.");
        } finally {
            setRejecting(false);
        }
    };

    const renderRequestCard = ({ item: request }: { item: any }) => {
        const statusCfg =
            STATUS_CONFIG[request.request_status as keyof typeof STATUS_CONFIG] ??
            STATUS_CONFIG.pending;
        const StatusIcon = statusCfg.icon;
        const isPending = request.request_status === "pending";
        const initials = request.requester_name
            ? request.requester_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
            : "??";

        return (
            <View
                style={{
                    backgroundColor: theme.surface ?? theme.background,
                    borderRadius: 16,
                    marginHorizontal: 16,
                    marginBottom: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: isPending
                        ? "rgba(251,191,36,0.3)"
                        : "rgba(0,0,0,0.06)",
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <View
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 23,
                            backgroundColor: theme.primary + "22",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "700",
                                color: theme.primary,
                            }}
                        >
                            {initials}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: theme.text,
                                marginBottom: 2,
                            }}
                        >
                            {request.requester_name}
                        </Text>
                        {request.member_code && (
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: theme.textSecondary,
                                    fontFamily:
                                        Platform.OS === "ios" ? "Courier" : "monospace",
                                }}
                            >
                                {request.member_code}
                            </Text>
                        )}
                        <Text
                            style={{
                                fontSize: 12,
                                color: theme.textSecondary,
                                marginTop: 2,
                            }}
                        >
                            {formatDate(request.created_at)}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: statusCfg.bg,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 20,
                        }}
                    >
                        <StatusIcon size={12} color={statusCfg.iconColor} />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: statusCfg.text,
                            }}
                        >
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>

                {request.request_message && (
                    <View
                        style={{
                            backgroundColor:
                                theme.background === "#fff"
                                    ? "#f8fafc"
                                    : "rgba(255,255,255,0.06)",
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 12,
                            borderLeftWidth: 3,
                            borderLeftColor: theme.primary,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 6,
                            }}
                        >
                            <MessageSquare size={13} color={theme.textSecondary} />
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: theme.textSecondary,
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                }}
                            >
                                Their Message
                            </Text>
                        </View>
                        <Text
                            style={{
                                fontSize: 14,
                                color: theme.text,
                                lineHeight: 20,
                                fontStyle: "italic",
                            }}
                        >
                            "{request.request_message}"
                        </Text>
                    </View>
                )}

                {request.admin_message && !isPending && (
                    <View
                        style={{
                            backgroundColor: statusCfg.bg + "88",
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 12,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 11,
                                color: statusCfg.text,
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                marginBottom: 4,
                            }}
                        >
                            Your Response
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: theme.text,
                                lineHeight: 20,
                            }}
                        >
                            {request.admin_message}
                        </Text>
                    </View>
                )}

                {isPending && (
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                        <TouchableOpacity
                            onPress={() => openRejectModal(request)}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                paddingVertical: 11,
                                borderRadius: 10,
                                backgroundColor: "#fee2e2",
                                borderWidth: 1,
                                borderColor: "#fca5a5",
                            }}
                        >
                            <X size={16} color="#dc2626" />
                            <Text
                                style={{
                                    color: "#dc2626",
                                    fontWeight: "600",
                                    fontSize: 14,
                                }}
                            >
                                Reject
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openApproveModal(request)}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                paddingVertical: 11,
                                borderRadius: 10,
                                backgroundColor: "#10b981",
                            }}
                        >
                            <Check size={16} color="#fff" />
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: 14,
                                }}
                            >
                                Approve
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderEmpty = () => (
        <View
            style={{
                flex: 1,
                alignItems: "center",
                paddingTop: 80,
                paddingHorizontal: 32,
            }}
        >
            <View
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: theme.primary + "15",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <Users size={32} color={theme.primary} />
            </View>
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: theme.text,
                    marginBottom: 8,
                    textAlign: "center",
                }}
            >
                No Join Requests
            </Text>
            <Text
                style={{
                    fontSize: 14,
                    color: theme.textSecondary,
                    textAlign: "center",
                    lineHeight: 21,
                }}
            >
                When members request to join this group, their requests will appear
                here for you to review.
            </Text>
        </View>
    );

    const isLoading = membersLoading || requestsLoading;

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: theme.background }}
            edges={["top"]}
        >
            {/* Header */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(0,0,0,0.06)",
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: theme.primary + "15",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                    }}
                >
                    <ChevronLeft size={20} color={theme.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: theme.text,
                        }}
                        numberOfLines={1}
                    >
                        {groupNameParam ? `${groupNameParam} — Requests` : "Join Requests"}
                    </Text>
                    {pendingCount > 0 && (
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#f59e0b",
                                fontWeight: "600",
                            }}
                        >
                            {pendingCount} pending request
                            {pendingCount !== 1 ? "s" : ""}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    onPress={refetchRequests}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: theme.primary + "15",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <RefreshCw size={18} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {isLoading ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
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
            ) : requestsError ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 32,
                        gap: 12,
                    }}
                >
                    <AlertCircle size={36} color="#ef4444" />
                    <Text
                        style={{
                            color: "#ef4444",
                            textAlign: "center",
                            fontSize: 14,
                        }}
                    >
                        {requestsError}
                    </Text>
                    <TouchableOpacity
                        onPress={refetchRequests}
                        style={{
                            backgroundColor: theme.primary,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.request_id}
                    renderItem={renderRequestCard}
                    contentContainerStyle={{
                        paddingTop: 12,
                        paddingBottom: 40,
                        flexGrow: 1,
                    }}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={requestsLoading}
                            onRefresh={refetchRequests}
                            tintColor={theme.primary}
                        />
                    }
                />
            )}

            {/* Approve Modal */}
            <Modal
                visible={approveModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => !approving && setApproveModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
                        activeOpacity={1}
                        onPress={() => !approving && setApproveModalVisible(false)}
                    />
                    <View
                        style={{
                            backgroundColor: theme.background,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: Platform.OS === "ios" ? 40 : 24,
                        }}
                    >
                        <View
                            style={{
                                height: 4,
                                width: 40,
                                backgroundColor: "#10b981",
                                borderRadius: 2,
                                alignSelf: "center",
                                marginBottom: 20,
                            }}
                        />
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 6,
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: "700",
                                        color: theme.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    Approve Request
                                </Text>
                                <Text
                                    style={{ fontSize: 14, color: theme.textSecondary }}
                                >
                                    {approveTarget?.requester_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() =>
                                    !approving && setApproveModalVisible(false)
                                }
                            >
                                <X size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text
                            style={{
                                color: theme.textSecondary,
                                fontSize: 13,
                                marginTop: 12,
                                marginBottom: 16,
                                lineHeight: 19,
                            }}
                        >
                            Send a welcome message to the member. They will receive an
                            invitation to join the group and must accept it to become a
                            member.
                        </Text>

                        <TextInput
                            multiline
                            numberOfLines={4}
                            placeholder="e.g. Welcome! We'd love to have you in the group..."
                            placeholderTextColor={theme.textSecondary}
                            value={approveMessage}
                            onChangeText={(t) => {
                                setApproveMessage(t);
                                setApproveMessageError("");
                            }}
                            style={{
                                borderWidth: 1,
                                borderColor: approveMessageError ? "#ef4444" : "#d1d5db",
                                borderRadius: 12,
                                padding: 14,
                                color: theme.text,
                                minHeight: 110,
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
                        {!!approveMessageError && (
                            <Text
                                style={{
                                    color: "#ef4444",
                                    fontSize: 12,
                                    marginBottom: 14,
                                }}
                            >
                                {approveMessageError}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={handleApprove}
                            disabled={approving}
                            style={{
                                backgroundColor: "#10b981",
                                paddingVertical: 15,
                                borderRadius: 12,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 8,
                                marginTop: 8,
                                opacity: approving ? 0.7 : 1,
                            }}
                        >
                            {approving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Check size={18} color="#fff" />
                            )}
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "700",
                                    fontSize: 16,
                                }}
                            >
                                {approving ? "Approving..." : "Approve & Send Invite"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Reject Modal */}
            <Modal
                visible={rejectModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => !rejecting && setRejectModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
                        activeOpacity={1}
                        onPress={() => !rejecting && setRejectModalVisible(false)}
                    />
                    <View
                        style={{
                            backgroundColor: theme.background,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: Platform.OS === "ios" ? 40 : 24,
                        }}
                    >
                        <View
                            style={{
                                height: 4,
                                width: 40,
                                backgroundColor: "#ef4444",
                                borderRadius: 2,
                                alignSelf: "center",
                                marginBottom: 20,
                            }}
                        />
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 6,
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: "700",
                                        color: theme.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    Reject Request
                                </Text>
                                <Text
                                    style={{ fontSize: 14, color: theme.textSecondary }}
                                >
                                    {rejectTarget?.requester_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() =>
                                    !rejecting && setRejectModalVisible(false)
                                }
                            >
                                <X size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text
                            style={{
                                color: theme.textSecondary,
                                fontSize: 13,
                                marginTop: 12,
                                marginBottom: 16,
                                lineHeight: 19,
                            }}
                        >
                            Provide a reason for rejection. This message will be sent to
                            the member so they understand why their request was declined.
                        </Text>

                        <TextInput
                            multiline
                            numberOfLines={4}
                            placeholder="e.g. Sorry, the group is currently at capacity..."
                            placeholderTextColor={theme.textSecondary}
                            value={rejectReason}
                            onChangeText={(t) => {
                                setRejectReason(t);
                                setRejectReasonError("");
                            }}
                            style={{
                                borderWidth: 1,
                                borderColor: rejectReasonError ? "#ef4444" : "#d1d5db",
                                borderRadius: 12,
                                padding: 14,
                                color: theme.text,
                                minHeight: 110,
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
                        {!!rejectReasonError && (
                            <Text
                                style={{
                                    color: "#ef4444",
                                    fontSize: 12,
                                    marginBottom: 14,
                                }}
                            >
                                {rejectReasonError}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={handleReject}
                            disabled={rejecting}
                            style={{
                                backgroundColor: "#ef4444",
                                paddingVertical: 15,
                                borderRadius: 12,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 8,
                                marginTop: 8,
                                opacity: rejecting ? 0.7 : 1,
                            }}
                        >
                            {rejecting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <X size={18} color="#fff" />
                            )}
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "700",
                                    fontSize: 16,
                                }}
                            >
                                {rejecting ? "Rejecting..." : "Reject Request"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

function formatDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}