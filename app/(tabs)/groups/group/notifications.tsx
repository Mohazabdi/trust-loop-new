import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronLeft,
  Clock,
  MessageSquare,
  RefreshCw,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
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
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Status config                                                     */
/* ------------------------------------------------------------------ */

type StatusKey = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    accent: string;
    soft: string;
    icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }
> = {
  pending: {
    label: "Pending",
    accent: ACCENT.amber,
    soft: ACCENT.amberSoft,
    icon: Clock,
  },
  approved: {
    label: "Approved",
    accent: ACCENT.green,
    soft: ACCENT.greenSoft,
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    accent: ACCENT.red,
    soft: ACCENT.redSoft,
    icon: XCircle,
  },
};

type FilterKey = "all" | StatusKey;

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
  inset = false,
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
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

export default function GroupNotificationsPage() {
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

  const approvedCount = useMemo(
    () => requests.filter((r) => r.request_status === "approved").length,
    [requests]
  );

  const rejectedCount = useMemo(
    () => requests.filter((r) => r.request_status === "rejected").length,
    [requests]
  );

  /* ── Filter ──────────────────────────────────────────────── */
  const [filter, setFilter] = useState<FilterKey>("all");

  /* ── Approve modal ───────────────────────────────────────── */
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveMessage, setApproveMessage] = useState("");
  const [approveMessageError, setApproveMessageError] = useState("");
  const [approving, setApproving] = useState(false);

  /* ── Reject modal ────────────────────────────────────────── */
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

  /* ── Sections ────────────────────────────────────────────── */
  const sections = useMemo(() => {
    const filtered = requests.filter(
      (r) => filter === "all" || r.request_status === filter
    );
    const pending = filtered.filter((r) => r.request_status === "pending");
    const history = filtered.filter((r) => r.request_status !== "pending");

    const out: { title: string; count: number; data: any[] }[] = [];
    if (pending.length) {
      out.push({ title: "Needs review", count: pending.length, data: pending });
    }
    if (history.length) {
      out.push({ title: "History", count: history.length, data: history });
    }
    return out;
  }, [requests, filter]);

  const filteredCount = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  /* ── Request row ─────────────────────────────────────────── */
  const renderRequestRow = ({ item: request }: { item: any }) => {
    const statusKey = (
      STATUS_CONFIG[request.request_status as StatusKey]
        ? (request.request_status as StatusKey)
        : "pending"
    ) as StatusKey;
    const cfg = STATUS_CONFIG[statusKey];
    const StatusIcon = cfg.icon;
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
      <View style={styles.rowWrap}>
        <Clay bodyStyle={styles.card}>
          {/* Header row */}
          <View style={styles.cardTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name} numberOfLines={1}>
                {request.requester_name}
              </Text>
              <View style={styles.metaRow}>
                {request.member_code ? (
                  <>
                    <Text style={styles.memberCode} numberOfLines={1}>
                      {request.member_code}
                    </Text>
                    <View style={styles.metaDot} />
                  </>
                ) : null}
                <Text style={styles.timestamp} numberOfLines={1}>
                  {formatDate(request.created_at)}
                </Text>
              </View>
            </View>

            <View style={[styles.statusPill, { backgroundColor: cfg.soft }]}>
              <StatusIcon size={11} color={cfg.accent} strokeWidth={2.6} />
              <Text style={[styles.statusText, { color: cfg.accent }]}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Their message */}
          {request.request_message ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.noteCard}
            >
              <View style={styles.noteLabelRow}>
                <MessageSquare
                  size={11}
                  color={CLAY.inkSoft}
                  strokeWidth={2.6}
                />
                <Text style={styles.noteLabel}>THEIR MESSAGE</Text>
              </View>
              <Text style={styles.noteQuote}>
                “{request.request_message}”
              </Text>
            </Clay>
          ) : null}

          {/* Admin response */}
          {request.admin_message && !isPending ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.noteCard}
            >
              <View style={styles.noteLabelRow}>
                <View
                  style={[
                    styles.noteDot,
                    { backgroundColor: cfg.accent },
                  ]}
                />
                <Text style={styles.noteLabel}>YOUR RESPONSE</Text>
              </View>
              <Text style={styles.noteBody}>{request.admin_message}</Text>
            </Clay>
          ) : null}

          {/* Actions */}
          {isPending ? (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => openRejectModal(request)}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  radius={RADIUS.md}
                  depth={0}
                  shade={CLAY.shadeSoft}
                  bodyStyle={styles.rejectBtn}
                >
                  <X size={15} color={ACCENT.red} strokeWidth={2.6} />
                  <Text style={styles.rejectText}>Reject</Text>
                </Clay>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openApproveModal(request)}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  color={ACCENT.green}
                  radius={RADIUS.md}
                  depth={1}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(20, 50, 30, 0.38)"
                  bodyStyle={styles.approveBtn}
                >
                  <Check size={15} color="#FFFFFF" strokeWidth={2.8} />
                  <Text style={styles.approveText}>Approve</Text>
                </Clay>
              </TouchableOpacity>
            </View>
          ) : null}
        </Clay>
      </View>
    );
  };

  /* ── Section header ──────────────────────────────────────── */
  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; count: number };
  }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionMarker} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionCount}>{section.count}</Text>
    </View>
  );

  /* ── Filter chip ─────────────────────────────────────────── */
  const FilterChip = ({
    label,
    value,
    count,
  }: {
    label: string;
    value: FilterKey;
    count?: number;
  }) => {
    const selected = filter === value;
    return (
      <TouchableOpacity onPress={() => setFilter(value)} activeOpacity={0.9}>
        <Clay
          radius={RADIUS.xl}
          depth={0}
          color={selected ? ACCENT.navy : CLAY.surface}
          highlight={
            selected ? "rgba(255,255,255,0.32)" : CLAY.highlight
          }
          shade={selected ? "rgba(15, 30, 60, 0.40)" : CLAY.shadeSoft}
          bodyStyle={styles.chip}
        >
          <Text
            style={[
              styles.chipText,
              selected && styles.chipTextSelected,
            ]}
          >
            {label}
          </Text>
          {count !== undefined && count > 0 ? (
            <View
              style={[
                styles.chipCount,
                selected && styles.chipCountSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipCountText,
                  selected && styles.chipCountTextSelected,
                ]}
              >
                {count}
              </Text>
            </View>
          ) : null}
        </Clay>
      </TouchableOpacity>
    );
  };

  /* ── List header ─────────────────────────────────────────── */
  const ListHeader = (
    <View>
      <View style={styles.introBlock}>
        <Text style={styles.eyebrow}>NOTIFICATIONS</Text>
        <Text style={styles.heading}>Join requests</Text>
        <Text style={styles.sub}>
          {pendingCount > 0
            ? `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting for your review.`
            : requests.length > 0
            ? "No pending requests. Your review history is below."
            : "Requests to join this group will appear here."}
        </Text>
      </View>

      {requests.length > 0 ? (
        <View style={styles.chipsRow}>
          <FilterChip label="All" value="all" count={requests.length} />
          <FilterChip
            label="Pending"
            value="pending"
            count={pendingCount}
          />
          <FilterChip
            label="Approved"
            value="approved"
            count={approvedCount}
          />
          <FilterChip
            label="Rejected"
            value="rejected"
            count={rejectedCount}
          />
        </View>
      ) : null}
    </View>
  );

  /* ── Empty / error / loading ─────────────────────────────── */
  const renderEmpty = () => {
    if (requestsError) {
      return (
        <View style={styles.stateWrap}>
          <Clay bodyStyle={styles.errorCard}>
            <AlertCircle size={30} color={ACCENT.red} strokeWidth={2.2} />
            <Text style={styles.errorText}>{requestsError}</Text>
            <TouchableOpacity
              onPress={refetchRequests}
              activeOpacity={0.9}
              style={styles.retryWrap}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.md}
                depth={1}
                highlight="rgba(255,255,255,0.32)"
                shade="rgba(15, 30, 60, 0.44)"
                bodyStyle={styles.retryBtn}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      );
    }

    if (requests.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <Clay bodyStyle={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Users size={26} color={ACCENT.navy} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No join requests yet</Text>
            <Text style={styles.emptyBody}>
              When members ask to join this group, you'll review their
              requests here.
            </Text>
          </Clay>
        </View>
      );
    }

    return (
      <View style={styles.stateWrap}>
        <Clay bodyStyle={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <AlertCircle size={24} color={ACCENT.navy} strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>Nothing here</Text>
          <Text style={styles.emptyBody}>
            There are no requests matching this filter.
          </Text>
        </Clay>
      </View>
    );
  };

  const isLoading = membersLoading || requestsLoading;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Clay radius={18} depth={1} bodyStyle={styles.headerBtn}>
            <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
          </Clay>
        </TouchableOpacity>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupNameParam ? `${groupNameParam}` : "Join requests"}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {pendingCount > 0
              ? `${pendingCount} pending`
              : "Nothing pending"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={refetchRequests}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Clay radius={18} depth={1} bodyStyle={styles.headerBtn}>
            <RefreshCw size={18} color={CLAY.ink} strokeWidth={2.4} />
          </Clay>
        </TouchableOpacity>
      </View>

      {/* ── Content ────────────────────────────────────── */}
      {isLoading && requests.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT.navy} />
          <Text style={styles.loadingText}>Loading requests…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.request_id}
          renderItem={renderRequestRow}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={requestsLoading && requests.length > 0}
              onRefresh={refetchRequests}
              tintColor={ACCENT.navy}
              colors={[ACCENT.navy]}
            />
          }
        />
      )}

      {/* ── Approve Modal ──────────────────────────────── */}
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
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => !approving && setApproveModalVisible(false)}
          />
          <View style={styles.modalSheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
              <View
                style={[styles.modalHandle, { backgroundColor: ACCENT.green }]}
              />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.modalTitle}>Approve request</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {approveTarget?.requester_name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => !approving && setApproveModalVisible(false)}
                  hitSlop={8}
                >
                  <X size={22} color={CLAY.ink} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalBody}>
                Send a welcome message. They will receive an invitation and
                must accept it to become a member.
              </Text>

              <TextInput
                multiline
                numberOfLines={4}
                placeholder="e.g. Welcome! We'd love to have you in the group…"
                placeholderTextColor={CLAY.inkFaint}
                value={approveMessage}
                onChangeText={(t) => {
                  setApproveMessage(t);
                  setApproveMessageError("");
                }}
                style={[
                  styles.modalInput,
                  approveMessageError ? { borderColor: ACCENT.red } : null,
                ]}
                autoFocus
                maxLength={500}
              />

              {approveMessageError ? (
                <Text style={styles.modalInputError}>
                  {approveMessageError}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleApprove}
                disabled={approving}
                activeOpacity={0.9}
                style={{ marginTop: SPACING.md }}
              >
                <Clay
                  color={ACCENT.green}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(20, 50, 30, 0.40)"
                  bodyStyle={[
                    styles.modalSubmit,
                    approving && { opacity: 0.75 },
                  ]}
                >
                  {approving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
                  )}
                  <Text style={styles.modalSubmitText}>
                    {approving ? "Approving…" : "Approve & send invite"}
                  </Text>
                </Clay>
              </TouchableOpacity>
            </Clay>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reject Modal ───────────────────────────────── */}
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
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => !rejecting && setRejectModalVisible(false)}
          />
          <View style={styles.modalSheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
              <View
                style={[styles.modalHandle, { backgroundColor: ACCENT.red }]}
              />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.modalTitle}>Reject request</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {rejectTarget?.requester_name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => !rejecting && setRejectModalVisible(false)}
                  hitSlop={8}
                >
                  <X size={22} color={CLAY.ink} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalBody}>
                Provide a reason. This will be sent to the member so they
                understand why their request was declined.
              </Text>

              <TextInput
                multiline
                numberOfLines={4}
                placeholder="e.g. Sorry, the group is currently at capacity…"
                placeholderTextColor={CLAY.inkFaint}
                value={rejectReason}
                onChangeText={(t) => {
                  setRejectReason(t);
                  setRejectReasonError("");
                }}
                style={[
                  styles.modalInput,
                  rejectReasonError ? { borderColor: ACCENT.red } : null,
                ]}
                autoFocus
                maxLength={500}
              />

              {rejectReasonError ? (
                <Text style={styles.modalInputError}>{rejectReasonError}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleReject}
                disabled={rejecting}
                activeOpacity={0.9}
                style={{ marginTop: SPACING.md }}
              >
                <Clay
                  color={ACCENT.red}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.28)"
                  shade="rgba(60, 20, 20, 0.38)"
                  bodyStyle={[
                    styles.modalSubmit,
                    rejecting && { opacity: 0.75 },
                  ]}
                >
                  {rejecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <X size={18} color="#FFFFFF" strokeWidth={2.6} />
                  )}
                  <Text style={styles.modalSubmitText}>
                    {rejecting ? "Rejecting…" : "Reject request"}
                  </Text>
                </Clay>
              </TouchableOpacity>
            </Clay>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },

  /* Header — clay buttons on canvas */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  listContent: {
    paddingBottom: 40,
  },

  /* Intro */
  introBlock: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.3,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sub: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: "500",
    marginTop: 4,
    maxWidth: 340,
  },

  /* Filter chips */
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.xl,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountSelected: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  chipCountText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
  },
  chipCountTextSelected: {
    color: "#FFFFFF",
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkFaint,
  },

  /* Row */
  rowWrap: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  memberCode: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Inset note (message / response) */
  noteCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  noteLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.9,
  },
  noteQuote: {
    fontSize: 13.5,
    color: CLAY.ink,
    lineHeight: 19,
    fontStyle: "italic",
    fontWeight: "500",
  },
  noteBody: {
    fontSize: 13.5,
    color: CLAY.ink,
    lineHeight: 19,
    fontWeight: "500",
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: ACCENT.redSoft,
  },
  rejectText: {
    color: ACCENT.red,
    fontWeight: "800",
    fontSize: 13,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  approveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  /* Empty / error states */
  stateWrap: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  emptyCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: 6,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: ACCENT.navySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: CLAY.ink,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
    maxWidth: 280,
  },
  errorCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  errorText: {
    color: ACCENT.red,
    fontSize: 13.5,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 19,
    maxWidth: 280,
  },
  retryWrap: { marginTop: SPACING.sm },
  retryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  /* Loading */
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    color: CLAY.inkSoft,
    fontSize: 13,
    fontWeight: "600",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  modalSheetWrap: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: 0,
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
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
  modalInput: {
    borderWidth: 1,
    borderColor: CLAY.hairline,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    color: CLAY.ink,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: CLAY.sunken,
  },
  modalInputError: {
    color: ACCENT.red,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  modalSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
});