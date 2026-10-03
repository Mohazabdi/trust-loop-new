import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
  Check,
  ChevronLeft,
  Search,
  UserPlus,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useMemberData } from "@/hooks/useMemberData";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useSavingsStorage, type SavingsMemberStatus } from "@/store/useSavingsStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS = {
  teal: "#0D9488",
  tealDark: "#115E59",
  mintSoft: "#CCFBF1",
  growth: "#16A34A",
} as const;

const STATUS_META: Record<
  SavingsMemberStatus,
  { color: string; label: string }
> = {
  active: { color: "#16A34A", label: "Active" },
  invited: { color: "#D97706", label: "Invited" },
  removed: { color: "#6B7280", label: "Removed" },
};

const tone = (hex: string, a: number) =>
  `${hex}${Math.round(Math.min(Math.max(a, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")}`;

const initialsOf = (first?: string, last?: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase() || "?"}`;

export default function SavingsMembersScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const plan = useSavingsStorage((s) =>
    s.plans.find((p) => p.savings_plan_id === params.plan_id)
  );
  const addMember = useSavingsStorage((s) => s.addMember);
  const removeMember = useSavingsStorage((s) => s.removeMember);
  const updateMemberStatus = useSavingsStorage((s) => s.updateMemberStatus);

  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const { members: groupMembers, loading: groupMembersLoading } =
    useGroupMembers(params.group_id);

  const isAdmin =
    params.member_role === "admin" ||
    groupMemberDetail?.member_role === "admin";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  /* ── Counts ─────────────────────────────────────────────────── */
  const counts = useMemo(() => {
    const members = plan?.members ?? [];
    return {
      total: members.length,
      active: members.filter((m) => m.status === "active").length,
      invited: members.filter((m) => m.status === "invited").length,
      removed: members.filter((m) => m.status === "removed").length,
    };
  }, [plan]);

  /* ── Available to invite (group members not already in plan) ── */
  const inPlanIds = useMemo(
    () => new Set((plan?.members ?? []).map((m) => m.group_member_id)),
    [plan]
  );

  const availableToInvite = useMemo(() => {
    let list = (groupMembers ?? []).filter(
      (gm: any) => !inPlanIds.has(gm.member_id)
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (gm: any) =>
          `${gm.first_name} ${gm.last_name}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [groupMembers, inPlanIds, search]);

  /* ── Invite ─────────────────────────────────────────────────── */
  const toggleSelect = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  };

  const handleSendInvites = () => {
    if (!plan) return;
    if (selectedIds.size === 0) return;

    let added = 0;
    selectedIds.forEach((id) => {
      const gm = (groupMembers ?? []).find((x: any) => x.member_id === id);
      if (!gm) return;
      addMember(plan.savings_plan_id, {
        group_member_id: gm.member_id,
        first_name: gm.first_name,
        last_name: gm.last_name,
        status: "invited",
      });
      added += 1;
    });

    toast.success(
      `${added} invite${added === 1 ? "" : "s"} sent — awaiting acceptance`
    );
    setSelectedIds(new Set());
    setInviteOpen(false);
  };

  /* ── Demo actions on members (for local dev) ────────────────── */
  const handleMemberOptions = (m: any) => {
    if (!plan) return;
    const isCreator = m.group_member_id === plan.created_by_id;

    if (m.status === "invited") {
      Alert.alert(
        `${m.first_name} ${m.last_name}`,
        "Invited · awaiting their acceptance",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Simulate acceptance",
            onPress: () => {
              updateMemberStatus(plan.savings_plan_id, m.id, "active");
              toast.success(`${m.first_name} accepted`);
            },
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              removeMember(plan.savings_plan_id, m.id);
              toast("Removed from plan");
            },
          },
        ]
      );
    } else if (m.status === "active" && !isCreator) {
      Alert.alert(
        `${m.first_name} ${m.last_name}`,
        "Active member",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove from plan",
            style: "destructive",
            onPress: () => {
              removeMember(plan.savings_plan_id, m.id);
              toast("Removed from plan");
            },
          },
        ]
      );
    }
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <CustomGroupHeader
          groupName="Members"
          leftAction={{ icon: ChevronLeft, action: handleBack }}
          rightAction={{ icon: BellIcon, action: handleNotifications }}
        />
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            Plan not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const creatorId = plan.created_by_id;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Members"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{plan.savings_name.toUpperCase()}</Text>
          <Text style={styles.title}>
            {counts.total} {counts.total === 1 ? "member" : "members"}
          </Text>
          <Text style={styles.subtitle}>
            {counts.active} active
            {counts.invited > 0 ? ` · ${counts.invited} pending` : ""}
          </Text>
        </View>

        {/* Progress summary strip */}
        <View style={styles.summaryRow}>
          <SummaryStat
            value={counts.active}
            label="Active"
            color={SAVINGS.growth}
            theme={theme}
            styles={styles}
          />
          <SummaryStat
            value={counts.invited}
            label="Invited"
            color="#D97706"
            theme={theme}
            styles={styles}
          />
          <SummaryStat
            value={counts.total}
            label="Total"
            color={SAVINGS.teal}
            theme={theme}
            styles={styles}
          />
        </View>

        {/* Invite button (admin only) */}
        {isAdmin ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedIds(new Set());
                setSearch("");
                setInviteOpen(true);
              }}
              activeOpacity={0.85}
              style={styles.inviteBtn}
            >
              <UserPlus size={17} color="#fff" strokeWidth={2.4} />
              <Text style={styles.inviteBtnText}>Invite members</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Members list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>People</Text>
        </View>

        {plan.members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No members yet. Invite group members to join this plan.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {plan.members.map((m, i) => {
              const meta = STATUS_META[m.status];
              const isCreator = m.group_member_id === creatorId;
              const isLast = i === plan.members.length - 1;

              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleMemberOptions(m)}
                  activeOpacity={0.85}
                  style={[styles.memberRow, !isLast && styles.memberRowDivider]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: tone(SAVINGS.teal, 0.12) },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: SAVINGS.teal }]}>
                      {initialsOf(m.first_name, m.last_name)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.first_name} {m.last_name}
                      </Text>
                      {isCreator ? (
                        <View style={styles.creatorPill}>
                          <Text style={styles.creatorPillText}>Creator</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.memberMeta}>
                      Joined{" "}
                      {new Date(m.joined_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: tone(meta.color, 0.12) },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: meta.color }]}
                    />
                    <Text style={[styles.statusText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.footerNote}>
          Tap a member to see actions. In the live app, invites are sent as
          notifications and members accept them from their inbox.
        </Text>
      </ScrollView>

      {/* ── Invite modal ──────────────────────────────────────── */}
      <Modal
        visible={inviteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInviteOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.modalEyebrow}>INVITE</Text>
              <Text style={styles.modalTitle}>
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Add group members"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setInviteOpen(false)}
              hitSlop={10}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search group members"
              placeholderTextColor={theme.textSecondary}
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <X size={15} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List */}
          <ScrollView
            style={styles.modalList}
            contentContainerStyle={{ paddingBottom: SPACING.lg }}
            showsVerticalScrollIndicator={false}
          >
            {groupMembersLoading ? (
              <Text style={styles.emptyText}>Loading group members…</Text>
            ) : availableToInvite.length === 0 ? (
              <Text style={styles.emptyText}>
                Everyone in the group is already part of this plan.
              </Text>
            ) : (
              availableToInvite.map((gm: any, i: number) => {
                const selected = selectedIds.has(gm.member_id);
                const isLast = i === availableToInvite.length - 1;
                return (
                  <TouchableOpacity
                    key={gm.member_id}
                    onPress={() => toggleSelect(gm.member_id)}
                    activeOpacity={0.85}
                    style={[
                      styles.inviteRow,
                      !isLast && styles.memberRowDivider,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: tone(SAVINGS.teal, 0.12) },
                      ]}
                    >
                      <Text
                        style={[styles.avatarText, { color: SAVINGS.teal }]}
                      >
                        {initialsOf(gm.first_name, gm.last_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {gm.first_name} {gm.last_name}
                      </Text>
                      {gm.member_role ? (
                        <Text style={styles.memberMeta}>{gm.member_role}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: selected
                            ? SAVINGS.teal
                            : `${theme.text}20`,
                          backgroundColor: selected
                            ? SAVINGS.teal
                            : "transparent",
                        },
                      ]}
                    >
                      {selected ? (
                        <Check size={12} color="#fff" strokeWidth={3} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={handleSendInvites}
            disabled={selectedIds.size === 0}
            activeOpacity={0.85}
            style={[
              styles.modalPrimaryBtn,
              { opacity: selectedIds.size === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.modalPrimaryBtnText}>
              {selectedIds.size > 0
                ? `Send ${selectedIds.size} invite${selectedIds.size === 1 ? "" : "s"}`
                : "Select members"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper                                                            */
/* ------------------------------------------------------------------ */

function SummaryStat({
  value,
  label,
  color,
  theme,
  styles,
}: {
  value: number;
  label: string;
  color: string;
  theme: any;
  styles: any;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: SPACING.xxl },

    header: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      gap: 4,
    },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: TYPE.h1,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 12.5,
      fontWeight: "500",
      color: theme.textSecondary,
      marginTop: 2,
    },

    summaryRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.sm,
    },
    summaryStat: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      alignItems: "center",
      gap: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },

    actionRow: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
    },
    inviteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
      backgroundColor: SAVINGS.teal,
      shadowColor: SAVINGS.teal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
    inviteBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },

    sectionHeader: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.xxl,
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: TYPE.h3,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.3,
    },

    listCard: {
      marginHorizontal: SPACING.xl,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    memberRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.text}10`,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    memberName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    memberMeta: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
      textTransform: "capitalize",
    },
    creatorPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: SAVINGS.mintSoft,
    },
    creatorPillText: {
      fontSize: 9,
      fontWeight: "800",
      color: SAVINGS.tealDark,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },

    emptyCard: {
      marginHorizontal: SPACING.xl,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${theme.text}15`,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 12.5,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
    },

    footerNote: {
      fontSize: 11.5,
      color: theme.textSecondary,
      textAlign: "center",
      paddingHorizontal: SPACING.xxl,
      marginTop: SPACING.xxl,
      lineHeight: 17,
      fontStyle: "italic",
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
      maxHeight: "82%",
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.md,
      paddingBottom: 32,
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
      marginBottom: SPACING.md,
    },
    modalEyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: SAVINGS.teal,
      letterSpacing: 1.2,
    },
    modalTitle: {
      fontSize: TYPE.h3 + 2,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.4,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
      marginBottom: SPACING.md,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      paddingVertical: 12,
      fontSize: 14.5,
    },
    modalList: {
      maxHeight: 340,
    },
    inviteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingVertical: SPACING.md,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    modalPrimaryBtn: {
      marginTop: SPACING.md,
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      backgroundColor: SAVINGS.teal,
    },
    modalPrimaryBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
  });
}