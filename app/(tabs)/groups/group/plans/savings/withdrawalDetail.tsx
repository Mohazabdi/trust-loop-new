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
  X,
  XCircle,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useSavingsStorage } from "@/store/useSavingsStorage";

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
  shadeSoft: "rgba(148, 163, 184, 0.32)",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

/**
 * Savings teal + growth green + withdrawal red, all muted to sit
 * comfortably on the clay canvas instead of glowing off it.
 */
const SAVINGS = {
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
  tealTint: "#EBF5F4",
  tealInk: "#2E5C58",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  withdrawal: "#CF6B6B",
  withdrawalSoft: "#FAE3E3",
  withdrawalTint: "#FCF0F0",
  withdrawalInk: "#7A3535",
  warning: "#C08A3E",
  warningSoft: "#F7EAD8",
  warningInk: "#7A5416",
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const STATUS_META = {
  pending: {
    color: SAVINGS.warning,
    label: "Pending approval",
    soft: SAVINGS.warningSoft,
    ink: SAVINGS.warningInk,
  },
  approved: {
    color: SAVINGS.growth,
    label: "Approved",
    soft: SAVINGS.growthSoft,
    ink: SAVINGS.growth,
  },
  declined: {
    color: SAVINGS.withdrawal,
    label: "Declined",
    soft: SAVINGS.withdrawalSoft,
    ink: SAVINGS.withdrawalInk,
  },
} as const;

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
  return `${parts[0][0] ?? ""}${
    parts[parts.length - 1][0] ?? ""
  }`.toUpperCase();
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
  children: React.ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: any;
  bodyStyle?: any;
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

export default function WithdrawalDetailScreen() {
  const router = useRouter();
  const { setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    withdrawal_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

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
  const myGroupMemberId =
    params.group_member_id ?? groupMemberDetail?.id ?? "";
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
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
              <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
            </Clay>
          </TouchableOpacity>
        </View>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <Text style={styles.missingTitle}>Request not found</Text>
            <Text style={styles.missingBody}>
              This withdrawal request is no longer available.
            </Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[request.status];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
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
          {/* ── Floating back row ──────────────────────── */}
          <View style={styles.backRow}>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
                <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
              </Clay>
            </TouchableOpacity>
          </View>

          {/* ── Title block with floating bell ─────────── */}
          <View style={styles.titleBlock}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.eyebrow}>WITHDRAWAL REQUEST</Text>
              <Text style={styles.title} numberOfLines={2}>
                Request details
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {plan.savings_name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleNotifications}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.bellWrap}
            >
              <Clay radius={18} depth={1} bodyStyle={styles.bellBody}>
                <BellIcon size={20} color={CLAY.ink} strokeWidth={2.4} />
              </Clay>
            </TouchableOpacity>
          </View>

          {/* ── Status slab ────────────────────────────── */}
          <Clay
            color={meta.soft}
            radius={RADIUS.xl}
            depth={1}
            bodyStyle={styles.statusCard}
          >
            <View style={styles.statusTop}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: "rgba(255,255,255,0.55)" },
                ]}
              >
                {request.status === "pending" ? (
                  <Clock size={11} color={meta.color} strokeWidth={2.6} />
                ) : request.status === "approved" ? (
                  <CheckCircle
                    size={11}
                    color={meta.color}
                    strokeWidth={2.6}
                  />
                ) : (
                  <XCircle
                    size={11}
                    color={meta.color}
                    strokeWidth={2.6}
                  />
                )}
                <Text
                  style={[styles.statusPillText, { color: meta.color }]}
                >
                  {meta.label}
                </Text>
              </View>
            </View>

            <Text style={styles.statusAmount}>
              {plan.currency_code} {formatMoney(request.amount)}
            </Text>
            <Text style={[styles.statusSub, { color: meta.ink }]}>
              {request.reason}
              {request.note ? ` · ${request.note}` : ""}
            </Text>
          </Clay>

          {/* ── Request info card ──────────────────────── */}
          <Clay bodyStyle={styles.infoCard}>
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
          </Clay>

          {/* ── Approval progress ──────────────────────── */}
          {request.status === "pending" ? (
            <View style={styles.progressSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionMarker} />
                <Text style={styles.sectionLabel}>Progress</Text>
              </View>
              <View style={styles.progressDotsRow}>
                {Array.from({ length: quorum }).map((_, i) => {
                  const done = i < approvalCount;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        done && {
                          backgroundColor: SAVINGS.growth,
                          borderColor: SAVINGS.growth,
                        },
                      ]}
                    >
                      {done ? (
                        <CheckCircle
                          size={14}
                          color="#fff"
                          strokeWidth={3}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <Text style={styles.progressHint}>
                {`${quorum - approvalCount} more approval${
                  quorum - approvalCount === 1 ? "" : "s"
                } needed to release funds`}
              </Text>
            </View>
          ) : null}

          {/* ── Approvals list ────────────────────────── */}
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionLabel}>Approvals & comments</Text>
          </View>

          <Clay bodyStyle={styles.approvalsList}>
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
                const soft = isApprove
                  ? SAVINGS.growthSoft
                  : SAVINGS.withdrawalSoft;
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.approvalRow,
                      !isLast && styles.rowDivider,
                    ]}
                  >
                    <View
                      style={[
                        styles.approvalAvatar,
                        { backgroundColor: soft },
                      ]}
                    >
                      <Text
                        style={[styles.approvalAvatarText, { color }]}
                      >
                        {initialsOf(a.approver_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.approvalNameRow}>
                        <Text
                          style={styles.approvalName}
                          numberOfLines={1}
                        >
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
                        <Text style={styles.approvalComment}>
                          "{a.comment}"
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Clay>

          {/* ── Decline reason ─────────────────────────── */}
          {request.status === "declined" && request.decline_reason ? (
            <Clay
              color={SAVINGS.withdrawalSoft}
              radius={RADIUS.lg}
              depth={0}
              shade="rgba(120, 40, 40, 0.22)"
              bodyStyle={styles.declineBanner}
            >
              <XCircle
                size={15}
                color={SAVINGS.withdrawal}
                strokeWidth={2.6}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.declineBannerLabel}>
                  DECLINED REASON
                </Text>
                <Text style={styles.declineBannerText}>
                  {request.decline_reason}
                </Text>
              </View>
            </Clay>
          ) : null}

          {/* ── Comment for approval ───────────────────── */}
          {canApprove ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Comment{" "}
                <Text style={styles.fieldOptional}>(optional)</Text>
              </Text>
              <Clay
                radius={RADIUS.md}
                depth={0}
                shade={CLAY.shadeSoft}
                bodyStyle={[styles.inputWell, styles.textAreaWell]}
              >
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a short note for the record"
                  placeholderTextColor={CLAY.inkFaint}
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={140}
                />
              </Clay>
            </View>
          ) : null}

          {/* ── Actions ────────────────────────────────── */}
          {canApprove ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => setDeclineOpen(true)}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  color={SAVINGS.withdrawalSoft}
                  radius={RADIUS.lg}
                  depth={0}
                  shade="rgba(120, 40, 40, 0.22)"
                  bodyStyle={styles.declineBtn}
                >
                  <ThumbsDown
                    size={16}
                    color={SAVINGS.withdrawal}
                    strokeWidth={2.6}
                  />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Clay>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApprove}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <Clay
                  color={SAVINGS.growth}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.30)"
                  shade="rgba(20, 50, 30, 0.38)"
                  bodyStyle={styles.approveBtn}
                >
                  <ThumbsUp size={16} color="#FFFFFF" strokeWidth={2.6} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </Clay>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Requester can cancel while pending ─────── */}
          {isRequester && request.status === "pending" ? (
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.9}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel request</Text>
            </TouchableOpacity>
          ) : null}

          {/* ── Requester info note ────────────────────── */}
          {isRequester && request.status === "pending" ? (
            <Clay
              color={SAVINGS.tealTint}
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.infoBox}
            >
              <Clock
                size={13}
                color={SAVINGS.tealInk}
                strokeWidth={2.4}
              />
              <Text style={styles.infoText}>
                You cannot approve your own request. Wait for {quorum} other
                members to approve.
              </Text>
            </Clay>
          ) : null}

          {/* ── Already decided note ───────────────────── */}
          {!isRequester && alreadyDecided && request.status === "pending" ? (
            <Clay
              color={SAVINGS.tealTint}
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.infoBox}
            >
              <CheckCircle
                size={13}
                color={SAVINGS.tealInk}
                strokeWidth={2.4}
              />
              <Text style={styles.infoText}>
                You have already responded to this request.
              </Text>
            </Clay>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Decline modal ──────────────────────────────── */}
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
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: SAVINGS.withdrawal },
              ]}
            />

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
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelper}>
              The requester will see this reason. Be specific and
              constructive.
            </Text>

            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[styles.inputWell, styles.textAreaWell]}
            >
              <TextInput
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="e.g. Balance too low for the group's monthly reserve"
                placeholderTextColor={CLAY.inkFaint}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
                maxLength={200}
              />
            </Clay>
            <Text style={styles.modalCount}>
              {declineReason.length}/200
            </Text>

            <TouchableOpacity
              onPress={handleDecline}
              activeOpacity={0.9}
              disabled={!declineReason.trim()}
              style={{ marginTop: SPACING.md }}
            >
              <Clay
                color={SAVINGS.withdrawal}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.28)"
                shade="rgba(120, 40, 40, 0.38)"
                bodyStyle={[
                  styles.modalBtn,
                  !declineReason.trim() && { opacity: 0.55 },
                ]}
              >
                <ThumbsDown size={16} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.modalBtnText}>Decline request</Text>
              </Clay>
            </TouchableOpacity>
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },

  /* Floating back row */
  backRow: {
    paddingTop: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Title block with floating bell */
  titleBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    marginTop: 4,
    fontWeight: "600",
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Status slab */
  statusCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
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
    borderRadius: 9,
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
    color: CLAY.ink,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  statusSub: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  /* Info card */
  infoCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    flex: 1,
    textAlign: "right",
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
  },

  /* Progress */
  progressSection: {
    gap: SPACING.sm,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  progressDotsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CLAY.hairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  progressHint: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  /* Approvals list */
  approvalsList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  approvalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
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
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  approvalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  approvalBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  approvalMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  approvalComment: {
    fontSize: 12,
    color: CLAY.ink,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
    fontStyle: "italic",
    opacity: 0.9,
  },
  emptyApprovals: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptyApprovalsText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },

  /* Decline banner */
  declineBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  declineBannerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: SAVINGS.withdrawal,
    letterSpacing: 0.8,
  },
  declineBannerText: {
    fontSize: 13,
    color: CLAY.ink,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Comment field */
  fieldGroup: { gap: SPACING.sm },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldOptional: {
    fontWeight: "600",
    color: CLAY.inkFaint,
    textTransform: "none",
  },
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  textAreaWell: {
    paddingVertical: SPACING.md,
  },
  input: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "600",
    padding: 0,
    minHeight: 26,
  },
  textArea: {
    minHeight: 66,
    textAlignVertical: "top",
  },

  /* Actions */
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: SAVINGS.withdrawal,
    letterSpacing: 0.1,
  },

  /* Cancel */
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    backgroundColor: CLAY.sunken,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: CLAY.ink,
  },

  /* Info banner */
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: SAVINGS.tealInk,
    lineHeight: 17,
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  missingCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: SPACING.sm,
    width: "100%",
    maxWidth: 320,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  missingBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
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
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  modalHelper: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    marginBottom: SPACING.lg,
    fontWeight: "500",
  },
  modalCount: {
    fontSize: 10.5,
    color: CLAY.inkFaint,
    textAlign: "right",
    marginTop: 6,
    fontWeight: "600",
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});