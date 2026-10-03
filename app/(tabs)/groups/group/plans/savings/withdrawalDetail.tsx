import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BellIcon,
  CheckCircle,
  ChevronLeft,
  Clock,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  XCircle,
} from "lucide-react-native";
import { toast } from "sonner-native";

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useSavingsStorage } from "@/store/useSavingsStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS = {
  teal: "#0D9488",
  tealDark: "#115E59",
  mintSoft: "#CCFBF1",
  withdrawal: "#DC2626",
  withdrawalDeep: "#B91C1C",
  withdrawalSoft: "#FEF2F2",
  growth: "#16A34A",
  growthSoft: "#DCFCE7",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
} as const;

const STATUS_META = {
  pending: { color: SAVINGS.warning, label: "Pending approval", soft: SAVINGS.warningSoft },
  approved: { color: SAVINGS.growth, label: "Approved", soft: SAVINGS.growthSoft },
  declined: { color: SAVINGS.withdrawal, label: "Declined", soft: SAVINGS.withdrawalSoft },
} as const;

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const initialsOf = (fullName?: string) => {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

export default function WithdrawalDetailScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    withdrawal_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const plan = useSavingsStorage((s) =>
    s.plans.find((p) => p.savings_plan_id === params.plan_id)
  );
  const request = useMemo(
    () =>
      plan?.withdrawal_requests.find(
        (w) => w.withdrawal_id === params.withdrawal_id
      ),
    [plan, params.withdrawal_id]
  );

  const approveWithdrawal = useSavingsStorage((s) => s.approveWithdrawal);
  const declineWithdrawal = useSavingsStorage((s) => s.declineWithdrawal);
  const cancelWithdrawal = useSavingsStorage((s) => s.cancelWithdrawal);

  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const [comment, setComment] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  /* ── Identity ───────────────────────────────────────────────── */
  const myGroupMemberId = params.group_member_id ?? groupMemberDetail?.id ?? "";
  const myFullName =
    `${groupMemberDetail?.first_name ?? member?.first_name ?? ""} ${
      groupMemberDetail?.last_name ?? member?.last_name ?? ""
    }`.trim() || "You";

  const isRequester = request?.requested_by_id === myGroupMemberId;
  const isAdmin =
    params.member_role === "admin" ||
    groupMemberDetail?.member_role === "admin" ||
    plan?.created_by_id === myGroupMemberId;

  const alreadyDecided = useMemo(
    () =>
      (request?.approvals ?? []).some(
        (a) => a.group_member_id === myGroupMemberId
      ),
    [request, myGroupMemberId]
  );

  const approvalCount = useMemo(
    () =>
      (request?.approvals ?? []).filter((a) => a.decision === "approve").length,
    [request]
  );

  const quorum = plan?.approval_quorum ?? 3;

  /* Whether the current user can act */
  const canApprove =
    !!request &&
    request.status === "pending" &&
    !isRequester &&
    !alreadyDecided;

  /* ── Actions ────────────────────────────────────────────────── */
  const handleApprove = () => {
    if (!plan || !request || !canApprove) return;

    Alert.alert(
      "Approve withdrawal",
      `You are approving ${plan.currency_code} ${formatMoney(
        request.amount
      )} to be released to ${request.requested_by_name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            approveWithdrawal(plan.savings_plan_id, request.withdrawal_id, {
              group_member_id: myGroupMemberId,
              full_name: myFullName,
              comment: comment.trim() || undefined,
            });
            toast.success("Approved");
            setComment("");
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    if (!plan || !request) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    declineWithdrawal(plan.savings_plan_id, request.withdrawal_id, {
      group_member_id: myGroupMemberId,
      full_name: myFullName,
      reason: declineReason.trim(),
    });
    toast.success("Request declined");
    setDeclineOpen(false);
    setDeclineReason("");
  };

  const handleCancel = () => {
    if (!plan || !request) return;
    Alert.alert(
      "Cancel request",
      "This will remove the request. You can submit a new one later.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => {
            cancelWithdrawal(plan.savings_plan_id, request.withdrawal_id);
            toast("Request cancelled");
            router.back();
          },
        },
      ]
    );
  };

  /* ── Guards ─────────────────────────────────────────────────── */
  if (!plan || !request) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <CustomGroupHeader
          groupName="Request"
          leftAction={{ icon: ChevronLeft, action: handleBack }}
          rightAction={{ icon: BellIcon, action: handleNotifications }}
        />
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            This request could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[request.status];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Withdrawal request"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status card */}
          <View style={[styles.statusCard, { backgroundColor: meta.soft }]}>
            <View style={styles.statusTop}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: tone(meta.color, 0.18) },
                ]}
              >
                {request.status === "pending" ? (
                  <Clock size={11} color={meta.color} strokeWidth={2.6} />
                ) : request.status === "approved" ? (
                  <CheckCircle size={11} color={meta.color} strokeWidth={2.6} />
                ) : (
                  <XCircle size={11} color={meta.color} strokeWidth={2.6} />
                )}
                <Text style={[styles.statusPillText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>

            <Text style={styles.statusAmount}>
              {plan.currency_code} {formatMoney(request.amount)}
            </Text>
            <Text style={[styles.statusSub, { color: meta.color }]}>
              {request.reason}
              {request.note ? ` · ${request.note}` : ""}
            </Text>
          </View>

          {/* Requested by */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Requested by</Text>
              <Text style={styles.infoValue}>{request.requested_by_name}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Requested on</Text>
              <Text style={styles.infoValue}>
                {formatDate(request.created_at)}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Approvals needed</Text>
              <Text style={styles.infoValue}>
                {approvalCount}/{quorum}
              </Text>
            </View>
          </View>

          {/* Approval progress */}
          {request.status === "pending" ? (
            <View style={styles.progressSection}>
              <Text style={styles.sectionLabel}>Progress</Text>
              <View style={styles.progressDotsRow}>
                {Array.from({ length: quorum }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i < approvalCount && {
                        backgroundColor: SAVINGS.growth,
                        borderColor: SAVINGS.growth,
                      },
                    ]}
                  >
                    {i < approvalCount ? (
                      <CheckCircle size={14} color="#fff" strokeWidth={3} />
                    ) : null}
                  </View>
                ))}
              </View>
              <Text style={styles.progressHint}>
                {request.status === "pending"
                  ? `${quorum - approvalCount} more approval${
                      quorum - approvalCount === 1 ? "" : "s"
                    } needed to release funds`
                  : ""}
              </Text>
            </View>
          ) : null}

          {/* Approvals list */}
          <Text style={styles.sectionLabel}>Approvals & comments</Text>
          <View style={styles.approvalsList}>
            {request.approvals.length === 0 ? (
              <View style={styles.emptyApprovals}>
                <Text style={styles.emptyApprovalsText}>
                  No one has responded yet.
                </Text>
              </View>
            ) : (
              request.approvals.map((a, i, arr) => {
                const isLast = i === arr.length - 1;
                const isApprove = a.decision === "approve";
                const color = isApprove ? SAVINGS.growth : SAVINGS.withdrawal;
                const soft = isApprove ? SAVINGS.growthSoft : SAVINGS.withdrawalSoft;
                return (
                  <View
                    key={a.id}
                    style={[styles.approvalRow, !isLast && styles.rowDivider]}
                  >
                    <View
                      style={[styles.approvalAvatar, { backgroundColor: soft }]}
                    >
                      <Text style={[styles.approvalAvatarText, { color }]}>
                        {initialsOf(a.approver_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.approvalNameRow}>
                        <Text style={styles.approvalName} numberOfLines={1}>
                          {a.approver_name}
                        </Text>
                        <View
                          style={[
                            styles.approvalBadge,
                            { backgroundColor: soft },
                          ]}
                        >
                          <Text
                            style={[styles.approvalBadgeText, { color }]}
                          >
                            {isApprove ? "Approved" : "Declined"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.approvalMeta}>
                        {formatDate(a.decided_at)}
                      </Text>
                      {a.comment ? (
                        <Text style={styles.approvalComment}>"{a.comment}"</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Decline reason (if declined) */}
          {request.status === "declined" && request.decline_reason ? (
            <View style={styles.declineBanner}>
              <XCircle
                size={15}
                color={SAVINGS.withdrawalDeep}
                strokeWidth={2.4}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.declineBannerLabel}>
                  Declined reason
                </Text>
                <Text style={styles.declineBannerText}>
                  {request.decline_reason}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Comment for approval (if can act) */}
          {canApprove ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Comment <Text style={styles.fieldOptional}>(optional)</Text>
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add a short note for the record"
                placeholderTextColor={theme.textSecondary}
                style={styles.commentInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={140}
              />
            </View>
          ) : null}

          {/* Actions */}
          {canApprove ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => setDeclineOpen(true)}
                activeOpacity={0.85}
                style={[styles.actionBtn, styles.declineBtn]}
              >
                <ThumbsDown
                  size={16}
                  color={SAVINGS.withdrawal}
                  strokeWidth={2.4}
                />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApprove}
                activeOpacity={0.85}
                style={[styles.actionBtn, styles.approveBtn]}
              >
                <ThumbsUp size={16} color="#fff" strokeWidth={2.4} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Requester can cancel while pending */}
          {isRequester && request.status === "pending" ? (
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.85}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel request</Text>
            </TouchableOpacity>
          ) : null}

          {/* Requester already decided message */}
          {isRequester && request.status === "pending" ? (
            <View style={styles.infoBox}>
              <Clock size={13} color={SAVINGS.tealDark} strokeWidth={2.4} />
              <Text style={styles.infoText}>
                You cannot approve your own request. Wait for {quorum} other
                members to approve.
              </Text>
            </View>
          ) : null}

          {/* Already decided by this user */}
          {!isRequester && alreadyDecided && request.status === "pending" ? (
            <View style={styles.infoBox}>
              <CheckCircle
                size={13}
                color={SAVINGS.tealDark}
                strokeWidth={2.4}
              />
              <Text style={styles.infoText}>
                You have already responded to this request.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Decline modal */}
      <Modal
        visible={declineOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDeclineOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.modalEyebrow}>DECLINE REQUEST</Text>
              <Text style={styles.modalTitle}>
                Why are you declining?
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDeclineOpen(false)}
              hitSlop={10}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalHelper}>
            The requester will see this reason. Be specific and constructive.
          </Text>

          <TextInput
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder="e.g. Balance too low for the group's monthly reserve"
            placeholderTextColor={theme.textSecondary}
            style={styles.modalInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoFocus
            maxLength={200}
          />
          <Text style={styles.modalCount}>{declineReason.length}/200</Text>

          <TouchableOpacity
            onPress={handleDecline}
            activeOpacity={0.85}
            disabled={!declineReason.trim()}
            style={[
              styles.modalBtn,
              { opacity: declineReason.trim() ? 1 : 0.5 },
            ]}
          >
            <ThumbsDown size={16} color="#fff" strokeWidth={2.4} />
            <Text style={styles.modalBtnText}>Decline request</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
      gap: SPACING.lg,
    },

    statusCard: {
      padding: SPACING.lg,
      borderRadius: RADIUS.xl,
      marginTop: SPACING.md,
      gap: SPACING.sm,
    },
    statusTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    statusAmount: {
      fontSize: 34,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -1,
      fontVariant: ["tabular-nums"],
    },
    statusSub: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.1,
    },

    infoCard: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: SPACING.sm + 2,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
    },
    infoDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${theme.text}10`,
    },

    progressSection: {
      gap: SPACING.sm,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    progressDotsRow: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    progressDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: `${theme.text}20`,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface ?? theme.background,
    },
    progressHint: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "500",
      marginTop: 2,
    },

    approvalsList: {
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: `${theme.text}08`,
    },
    approvalRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.md,
      padding: SPACING.md + 2,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.text}10`,
    },
    approvalAvatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    approvalAvatarText: {
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    approvalNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      flexWrap: "wrap",
    },
    approvalName: {
      fontSize: 13.5,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.1,
    },
    approvalBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    approvalBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    approvalMeta: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    approvalComment: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "500",
      lineHeight: 17,
      marginTop: 4,
      fontStyle: "italic",
      opacity: 0.85,
    },
    emptyApprovals: {
      padding: SPACING.lg,
      alignItems: "center",
    },
    emptyApprovalsText: {
      fontSize: 12.5,
      color: theme.textSecondary,
    },

    declineBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: SPACING.md + 2,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.withdrawalSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.2),
    },
    declineBannerLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: SAVINGS.withdrawalDeep,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    declineBannerText: {
      fontSize: 13,
      color: SAVINGS.withdrawalDeep,
      fontWeight: "500",
      lineHeight: 18,
    },

    fieldGroup: { gap: SPACING.sm },
    fieldLabel: {
      fontSize: TYPE.label,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: 0.2,
    },
    fieldOptional: { fontWeight: "500", color: theme.textSecondary },
    commentInput: {
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.surface ?? theme.background,
      minHeight: 80,
    },

    actionsRow: {
      flexDirection: "row",
      gap: SPACING.md,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
    },
    approveBtn: {
      backgroundColor: SAVINGS.growth,
      shadowColor: SAVINGS.growth,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 3,
    },
    approveBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
    declineBtn: {
      backgroundColor: SAVINGS.withdrawalSoft,
      borderWidth: 1,
      borderColor: tone(SAVINGS.withdrawal, 0.25),
    },
    declineBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: SAVINGS.withdrawal,
      letterSpacing: 0.2,
    },

    cancelBtn: {
      paddingVertical: 13,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: `${theme.text}15`,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },

    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: SAVINGS.mintSoft,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "500",
      color: SAVINGS.tealDark,
      lineHeight: 17,
    },

    /* Modal */
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    modalSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.md,
      paddingBottom: 40,
    },
    modalHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.text}20`,
      marginBottom: SPACING.md,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.sm,
    },
    modalEyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: SAVINGS.withdrawal,
      letterSpacing: 1.2,
    },
    modalTitle: {
      fontSize: TYPE.h3 + 2,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.4,
    },
    modalHelper: {
      fontSize: 12.5,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: SPACING.lg,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.surface ?? theme.background,
      minHeight: 100,
    },
    modalCount: {
      fontSize: 10.5,
      color: theme.textSecondary,
      textAlign: "right",
      marginTop: 4,
    },
    modalBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.withdrawal,
    },
    modalBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
  });
}