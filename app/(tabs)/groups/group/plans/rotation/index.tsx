import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";
import {
  Banknote,
  BellIcon,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  LogOut,
  PlusCircle,
  Settings2,
  User,
  UserPlus,
  Users,
} from "lucide-react-native";
import BottomSheet from "@gorhom/bottom-sheet";

import CustomBottomSheet from "@/components/CustomBottomSheet";
import CircularProgress from "@/components/myGroups/PieProgress";
import RotationPlanSettings from "@/components/myGroups/PlanSettings";
import { TruncatedText } from "@/utils/TruncateText";

import { useDeleteRotationInvite } from "@/hooks/useDeleteRotationInvite";
import { useGetRotationMemberId } from "@/hooks/useGetRotationMemberId";
import { useGetRotationPlan } from "@/hooks/useGetRotationPlan";
import {
  RotationPlanMembers,
  useGetRotationPlanMemberInvites,
} from "@/hooks/useGetRotationPlanMembers";
import {
  Rotationcycles,
  useGetRotationPlanSchedules,
} from "@/hooks/useGetRotationPlanSchedules";
import { useGetReserveContributions } from "@/hooks/useGetReserveContribution";
import { useGetMemberCycleProgress } from "@/hooks/useGetMemberCycleProgress";
import { useGetRotationProgress } from "@/hooks/useGetRotationProgress";

import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";

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
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

/** Semantic tones, desaturated to sit on the clay canvas. */
const SEMANTIC = {
  success: ACCENT.green,
  warning: ACCENT.amber,
  danger: ACCENT.red,
  info: ACCENT.navy,
} as const;

const STATUS_COLORS = {
  active: ACCENT.green,
  dormant: ACCENT.neutral,
  paused: ACCENT.amber,
  complete: ACCENT.navy,
} as const;

type RotationStatus = keyof typeof STATUS_COLORS;

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
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

export default function RotationDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_member_id: string;
  }>();
  const { theme, setIsNotificationOpen, setIsRotationInviteesSheetOpen } =
    useGlobalStorage();
  const {
    setRotationPlanId,
    setIsAdmin,
    setPlanIsActive,
    setGroupMemberId,
    setRotationMemberId,
    setRotationCycles,
  } = useGroupStorage();

  /* ── Bottom sheets ─────────────────────────────────────── */
  const settingsSheetRef = useRef<BottomSheet>(null);
  const openSettings = () => settingsSheetRef.current?.snapToIndex(0);
  const closeSettings = () => settingsSheetRef.current?.close();

  /* ── Data ──────────────────────────────────────────────── */
  const { data: rotationPlan, refetch: refetchPlan } = useGetRotationPlan(
    params.plan_id
  );
  const { data: memberRotationPlanId, refetch: refetchRotationMember } =
    useGetRotationMemberId(
      params.group_member_id,
      rotationPlan?.rotation_plan_id
    );
  const { data: schedules, refetch: refetchSchedules } =
    useGetRotationPlanSchedules(params.plan_id);
  const { data: invitedMembers, refetch: refetchInvited } =
    useGetRotationPlanMemberInvites(params.plan_id);
  const { data: contributionRecords, refetch: refetchContributions } =
    useGetReserveContributions(memberRotationPlanId);
  const { data: cycleProgress, refetch: refetchCycleProgress } =
    useGetMemberCycleProgress(memberRotationPlanId);
  const { data: rotationProgress, refetch: refetchRotationProgress } =
    useGetRotationProgress(params.plan_id);

  const deleteInviteMutation = useDeleteRotationInvite();

  const rotationStatus: RotationStatus =
    (rotationPlan?.rotation_status as RotationStatus) ?? "dormant";

  const acceptedCount = useMemo(
    () =>
      (invitedMembers ?? []).filter(
        (m) => m.invitation_status === "accepted"
      ).length,
    [invitedMembers]
  );

  const totalContributed = useMemo(
    () =>
      (contributionRecords ?? []).reduce(
        (sum, r) => sum + (r.trans_amount ?? 0),
        0
      ),
    [contributionRecords]
  );

  const overallPercentage = rotationProgress?.progress_percentage ?? 0;

  const {
    net_balance = 0,
    amount_collectable = 0,
    total_cycles = 0,
    current_cycle = 0,
    progress_percentage = 0,
  } = cycleProgress ?? {};

  const createdBy = rotationPlan?.created_by;
  const isCreator = params.group_member_id === createdBy;

  /* ── Store sync ────────────────────────────────────────── */
  useEffect(() => {
    setPlanIsActive(rotationStatus === "active");
  }, [rotationStatus, setPlanIsActive]);

  useEffect(() => {
    setIsAdmin(isCreator);
    setGroupMemberId(params.group_member_id);
  }, [isCreator, params.group_member_id, setIsAdmin, setGroupMemberId]);

  /* ── Refresh ───────────────────────────────────────────── */
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPlan(),
        refetchRotationMember(),
        refetchSchedules(),
        refetchInvited(),
        refetchContributions(),
        refetchCycleProgress(),
        refetchRotationProgress(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchPlan,
    refetchRotationMember,
    refetchSchedules,
    refetchInvited,
    refetchContributions,
    refetchCycleProgress,
    refetchRotationProgress,
  ]);

  /* ── Handlers ──────────────────────────────────────────── */
  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const handleOpenSettings = useCallback(() => {
    setRotationMemberId(memberRotationPlanId ?? "");
    setRotationCycles(schedules?.length ?? 0);
    setRotationPlanId(rotationPlan?.rotation_plan_id ?? "");
    openSettings();
  }, [
    memberRotationPlanId,
    schedules?.length,
    rotationPlan?.rotation_plan_id,
    setRotationMemberId,
    setRotationCycles,
    setRotationPlanId,
  ]);

  const handleAddMembers = useCallback(() => {
    setIsRotationInviteesSheetOpen(true);
    setRotationPlanId(rotationPlan?.rotation_plan_id ?? "");
    setRotationMemberId(memberRotationPlanId ?? "");
  }, [
    setIsRotationInviteesSheetOpen,
    rotationPlan?.rotation_plan_id,
    memberRotationPlanId,
    setRotationPlanId,
    setRotationMemberId,
  ]);

  const handleContribute = useCallback(() => {
    setRotationPlanId(rotationPlan?.rotation_plan_id ?? "");
    setRotationMemberId(memberRotationPlanId ?? "");
    router.push("/(tabs)/groups/group/contribute");
  }, [
    rotationPlan?.rotation_plan_id,
    memberRotationPlanId,
    setRotationPlanId,
    setRotationMemberId,
    router,
  ]);

  const handleDeleteInvite = useCallback(
    async (inviteId: string, planId: string) => {
      try {
        await deleteInviteMutation.mutateAsync({
          rotation_plan_invite_id: inviteId,
        });
        queryClient.invalidateQueries({
          queryKey: ["group_member_rotation_invites", planId],
        });
        toast.success("Member removed from plan");
      } catch (err: any) {
        toast.error(err?.message ?? "Could not remove member");
      }
    },
    [deleteInviteMutation, queryClient]
  );

  /* ── Expansion state ───────────────────────────────────── */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── List data ─────────────────────────────────────────── */
  const data: (RotationPlanMembers | Rotationcycles)[] =
    rotationStatus === "dormant" ? invitedMembers ?? [] : schedules ?? [];

  /* ── Renderers ─────────────────────────────────────────── */
  const renderPendingMember = useCallback(
    ({ item }: { item: RotationPlanMembers }) => {
      const itemIsCreator = item.group_member_id === createdBy;
      const isYou = params.group_member_id === item.group_member_id;
      const isPending = item.invitation_status === "pending";
      const canDelete = isCreator && !itemIsCreator;

      return (
        <View style={styles.listRowWrap}>
          <Clay
            bodyStyle={[
              styles.row,
              isYou && {
                backgroundColor: ACCENT.greenSoft,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: isYou ? ACCENT.green : CLAY.sunken,
                },
              ]}
            >
              <User
                size={16}
                color={isYou ? "#fff" : CLAY.inkSoft}
                strokeWidth={2.2}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.member_first_name} {item.member_last_name}
                {isYou ? " · you" : ""}
              </Text>
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isPending
                        ? SEMANTIC.warning
                        : SEMANTIC.success,
                    },
                  ]}
                />
                <Text style={styles.metaText}>
                  {isPending ? "Pending invite" : "Accepted"}
                </Text>
                {itemIsCreator ? (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaTextAccent}>creator</Text>
                  </>
                ) : null}
              </View>
            </View>

            {canDelete ? (
              <TouchableOpacity
                onPress={() =>
                  handleDeleteInvite(item.id, item.rotation_plan_id)
                }
                hitSlop={8}
                activeOpacity={0.9}
              >
                <Clay
                  radius={RADIUS.sm}
                  depth={0}
                  bodyStyle={styles.rowAction}
                >
                  <Text style={styles.rowActionText}>Remove</Text>
                </Clay>
              </TouchableOpacity>
            ) : null}
          </Clay>
        </View>
      );
    },
    [createdBy, params.group_member_id, handleDeleteInvite]
  );

  const renderCycle = useCallback(
    ({ item }: { item: Rotationcycles }) => {
      const isCollapsed = !expandedIds.has(item.id);
      const isUpcoming = item.cycle_status === "upcoming";

      return (
        <View style={styles.listRowWrap}>
          <Clay bodyStyle={styles.cycleCard}>
            <TouchableOpacity
              onPress={() => toggleExpanded(item.id)}
              activeOpacity={0.9}
              style={styles.cycleHeader}
            >
              <View style={styles.cycleLeft}>
                <View
                  style={[
                    styles.cycleIndex,
                    { backgroundColor: CLAY.sunken },
                  ]}
                >
                  <Text style={styles.cycleIndexText}>
                    {item.cycleName.replace(/[^0-9]/g, "") || "•"}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cycleTitle} numberOfLines={1}>
                    {item.cycleName}
                  </Text>
                  <View style={styles.metaRow}>
                    <Calendar
                      size={11}
                      color={CLAY.inkSoft}
                      strokeWidth={2.4}
                    />
                    <Text style={styles.metaText}>
                      {formatDate(item.date_scheduled)}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.cycleStatusPill,
                  {
                    backgroundColor: isUpcoming
                      ? CLAY.sunken
                      : ACCENT.greenSoft,
                  },
                ]}
              >
                {isUpcoming ? (
                  <Clock size={11} color={CLAY.inkSoft} strokeWidth={2.4} />
                ) : (
                  <CheckCircle
                    size={11}
                    color={SEMANTIC.success}
                    strokeWidth={2.4}
                  />
                )}
                <Text
                  style={[
                    styles.cycleStatusText,
                    {
                      color: isUpcoming ? CLAY.inkSoft : SEMANTIC.success,
                    },
                  ]}
                >
                  {item.cycle_status}
                </Text>
              </View>

              <View style={styles.chevronBtn}>
                {isCollapsed ? (
                  <ChevronDown
                    size={16}
                    color={CLAY.inkSoft}
                    strokeWidth={2.4}
                  />
                ) : (
                  <ChevronUp
                    size={16}
                    color={CLAY.inkSoft}
                    strokeWidth={2.4}
                  />
                )}
              </View>
            </TouchableOpacity>

            {!isCollapsed ? (
              <View style={styles.cycleEvents}>
                {item.members.map((member) => {
                  const isYou =
                    params.group_member_id === member.member_id;
                  const isDebit = member.amountType === "debit";
                  const isDone = member.status !== "upcoming";

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.cycleEvent,
                        isYou && { backgroundColor: ACCENT.greenSoft },
                      ]}
                    >
                      <View
                        style={[
                          styles.avatarSmall,
                          {
                            backgroundColor: isYou
                              ? ACCENT.green
                              : CLAY.sunken,
                          },
                        ]}
                      >
                        <User
                          size={13}
                          color={isYou ? "#fff" : CLAY.inkSoft}
                          strokeWidth={2.2}
                        />
                      </View>

                      <Text style={styles.eventName} numberOfLines={1}>
                        {member.names}
                        {isYou ? " · you" : ""}
                      </Text>

                      <Text
                        style={[
                          styles.eventAmount,
                          {
                            color: isDebit
                              ? SEMANTIC.warning
                              : SEMANTIC.success,
                          },
                        ]}
                      >
                        {isDebit ? "−" : "+"} {member.amount}
                      </Text>

                      <View
                        style={[
                          styles.eventStatusDot,
                          {
                            backgroundColor: isDone
                              ? SEMANTIC.success
                              : SEMANTIC.warning,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Clay>
        </View>
      );
    },
    [expandedIds, toggleExpanded, params.group_member_id]
  );

  const renderItem = useCallback(
    ({ item }: { item: RotationPlanMembers | Rotationcycles }) =>
      rotationStatus === "dormant"
        ? renderPendingMember({ item: item as RotationPlanMembers })
        : renderCycle({ item: item as Rotationcycles }),
    [rotationStatus, renderPendingMember, renderCycle]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  /* ── Header ────────────────────────────────────────────── */
  const statusColor = STATUS_COLORS[rotationStatus];

  const ListHeader = (
    <View>
      {/* Floating back row */}
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

      {/* Title block with floating bell */}
      <View style={styles.titleBlock}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.eyebrow}>ROTATION PLAN</Text>
          <Text style={styles.screenTitle} numberOfLines={2}>
            {rotationPlan?.rotation_name ?? "Rotation"}
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

      {/* Summary card */}
      <Clay style={styles.summaryWrap} bodyStyle={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.statusPill}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={styles.statusText}>{rotationStatus}</Text>
          </View>
          <Text style={styles.cycleCount}>
            {rotationStatus === "dormant"
              ? "Not started"
              : `${schedules?.length ?? 0} cycles`}
          </Text>
        </View>

        <View style={styles.summaryBody}>
          <View style={styles.ringWrap}>
            <CircularProgress
              percentage={rotationStatus === "dormant" ? 0 : overallPercentage}
              size={118}
              strokeWidth={12}
              color={statusColor}
              backgroundColor={CLAY.sunken}
            />
          </View>

          <View style={styles.summaryDetails}>
            <DetailRow
              icon={Calendar}
              label="Starts"
              value={formatDate(rotationPlan?.start_date)}
            />
            <DetailRow
              icon={Users}
              label="Members"
              value={`${acceptedCount} accepted`}
            />
            <DetailRow
              icon={Banknote}
              label="Contribution"
              value={`${rotationPlan?.amount_collectable ?? 0} ${
                rotationPlan?.currency_code ?? ""
              }`}
            />
          </View>
        </View>

        {rotationPlan?.rotation_description ? (
          <TruncatedText
            text={rotationPlan.rotation_description}
            maxLines={2}
            style={styles.description}
          />
        ) : null}
      </Clay>

      {/* Actions */}
      <View style={styles.actionRow}>
        <View style={{ flex: 1 }}>
          {rotationStatus === "dormant" ? (
            isCreator ? (
              <PrimaryAction
                label="Add members"
                icon={UserPlus}
                color={SEMANTIC.success}
                onPress={handleAddMembers}
              />
            ) : (
              <PrimaryAction
                label="Opt out of rotation"
                icon={LogOut}
                color={SEMANTIC.danger}
                onPress={() => {}}
              />
            )
          ) : rotationStatus === "active" ? (
            <PrimaryAction
              label={`Contribute · cycle ${current_cycle}/${total_cycles}`}
              icon={PlusCircle}
              color={SEMANTIC.success}
              onPress={handleContribute}
            />
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleOpenSettings}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Plan settings"
        >
          <Clay
            radius={RADIUS.lg}
            depth={0}
            bodyStyle={styles.settingsBtn}
          >
            <Settings2 size={18} color={CLAY.ink} strokeWidth={2.2} />
          </Clay>
        </TouchableOpacity>
      </View>

      {/* Progress (active only) */}
      {rotationStatus === "active" ? (
        <Clay style={styles.progressWrap} bodyStyle={styles.progressCard}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    Math.max(progress_percentage, 0),
                    100
                  )}%`,
                  backgroundColor: SEMANTIC.success,
                },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <StatBlock label="My contribution" value={`${net_balance}`} />
            <StatBlock
              label="Remaining"
              value={`${Math.max(
                amount_collectable * total_cycles - net_balance,
                0
              )}`}
            />
            <StatBlock
              label="Complete"
              value={`${progress_percentage}%`}
              highlight
            />
          </View>
        </Clay>
      ) : null}

      {/* Section label */}
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionLabel}>
            {rotationStatus === "dormant" ? "Invited members" : "Schedule"}
          </Text>
        </View>
        <Text style={styles.sectionCount}>
          {rotationStatus === "dormant"
            ? `${invitedMembers?.length ?? 0}`
            : `${schedules?.length ?? 0} cycles`}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {rotationStatus === "dormant"
                  ? "No members invited yet"
                  : "Schedule coming soon"}
              </Text>
              <Text style={styles.emptyBody}>
                {rotationStatus === "dormant"
                  ? "Invite members to begin building the plan."
                  : "Cycles will appear here once the plan starts."}
              </Text>
            </Clay>
          </View>
        }
      />

      <CustomBottomSheet
        ref={settingsSheetRef}
        title="Plan settings"
        snapPoints={["70%"]}
      >
        <RotationPlanSettings closeBottomSheet={closeSettings} />
      </CustomBottomSheet>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational components                                   */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon size={12} color={CLAY.inkSoft} strokeWidth={2.4} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PrimaryAction({
  label,
  icon: Icon,
  color,
  onPress,
}: {
  label: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Clay
        color={color}
        radius={RADIUS.lg}
        depth={1}
        highlight="rgba(255,255,255,0.30)"
        shade="rgba(20, 35, 55, 0.32)"
        bodyStyle={styles.primaryAction}
      >
        <Text style={styles.primaryActionText} numberOfLines={1}>
          {label}
        </Text>
        <Icon size={18} color="#fff" strokeWidth={2.2} />
      </Clay>
    </TouchableOpacity>
  );
}

function StatBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statBlock}>
      <Text
        style={[
          styles.statValue,
          { color: highlight ? SEMANTIC.success : CLAY.ink },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  listContent: { paddingBottom: 40 },

  /* Floating back row */
  backRow: {
    paddingHorizontal: SPACING.xl,
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Summary card */
  summaryWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  summaryCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: CLAY.inkSoft,
  },
  cycleCount: {
    fontSize: TYPE.label,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },
  summaryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  ringWrap: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDetails: {
    flex: 1,
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    flex: 1,
    fontSize: TYPE.label,
    fontWeight: "700",
    color: CLAY.ink,
    textAlign: "right",
  },
  description: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Actions */
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  primaryActionText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.1,
  },
  settingsBtn: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Progress */
  progressWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  progressCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY.sunken,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  /* Section label */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
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
  sectionCount: {
    fontSize: TYPE.label,
    fontWeight: "600",
    color: CLAY.inkFaint,
  },

  /* List rows */
  listRowWrap: { paddingHorizontal: SPACING.xl },

  /* Member row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    fontWeight: "500",
  },
  metaTextAccent: {
    fontSize: 11.5,
    fontWeight: "800",
    color: ACCENT.navy,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.6,
  },
  rowAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT.redSoft,
  },
  rowActionText: {
    color: ACCENT.red,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  /* Cycle card */
  cycleCard: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  cycleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
  },
  cycleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  cycleIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleIndexText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: CLAY.inkSoft,
  },
  cycleTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: CLAY.ink,
  },
  cycleStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  cycleStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  chevronBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleEvents: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 6,
  },
  cycleEvent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: CLAY.sunken,
  },
  eventName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: CLAY.ink,
  },
  eventAmount: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  eventStatusDot: { width: 6, height: 6, borderRadius: 3 },

  /* Empty */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 6,
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
});