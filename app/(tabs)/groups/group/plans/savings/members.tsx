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

import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useMemberData } from "@/hooks/useMemberData";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import {
  useSavingsStorage,
  type SavingsMemberStatus,
} from "@/store/useSavingsStorage";

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
 * Savings-specific muted accent. Same hue as the savings sections
 * elsewhere in the app, desaturated to sit comfortably on the clay
 * canvas instead of glowing off it.
 */
const SAVINGS = {
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
  tealTint: "#EBF5F4",
  tealInk: "#2E5C58",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  amberInk: "#7A5416",
  neutral: "#8A93A3",
  neutralSoft: "#E4E9F1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const STATUS_META: Record<
  SavingsMemberStatus,
  { color: string; soft: string; label: string }
> = {
  active: { color: SAVINGS.growth, soft: SAVINGS.growthSoft, label: "Active" },
  invited: {
    color: SAVINGS.amber,
    soft: SAVINGS.amberSoft,
    label: "Invited",
  },
  removed: {
    color: SAVINGS.neutral,
    soft: SAVINGS.neutralSoft,
    label: "Removed",
  },
};

const initialsOf = (first?: string, last?: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase() || "?"}`;

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

export default function SavingsMembersScreen() {
  const router = useRouter();
  const { setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
    member_role: string;
  }>();

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
      list = list.filter((gm: any) =>
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
      Alert.alert(`${m.first_name} ${m.last_name}`, "Active member", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove from plan",
          style: "destructive",
          onPress: () => {
            removeMember(plan.savings_plan_id, m.id);
            toast("Removed from plan");
          },
        },
      ]);
    }
  };

  if (!plan) {
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
            <Text style={styles.missingTitle}>Plan not found</Text>
            <Text style={styles.missingBody}>
              This savings plan is no longer available.
            </Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  const creatorId = plan.created_by_id;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating back row ─────────────────────────── */}
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

        {/* ── Title block with floating bell ────────────── */}
        <View style={styles.titleBlock}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>{plan.savings_name.toUpperCase()}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {counts.total} {counts.total === 1 ? "member" : "members"}
            </Text>
            <Text style={styles.subtitle}>
              {counts.active} active
              {counts.invited > 0 ? ` · ${counts.invited} pending` : ""}
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

        {/* ── Summary strip ─────────────────────────────── */}
        <View style={styles.summaryRow}>
          <SummaryStat value={counts.active} label="Active" color={SAVINGS.growth} />
          <SummaryStat value={counts.invited} label="Invited" color={SAVINGS.amber} />
          <SummaryStat value={counts.total} label="Total" color={SAVINGS.teal} />
        </View>

        {/* ── Invite action (admin only) ────────────────── */}
        {isAdmin ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedIds(new Set());
                setSearch("");
                setInviteOpen(true);
              }}
              activeOpacity={0.9}
            >
              <Clay
                color={SAVINGS.teal}
                radius={RADIUS.lg}
                depth={2}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(30, 70, 66, 0.42)"
                bodyStyle={styles.inviteBtn}
              >
                <UserPlus size={17} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.inviteBtnText}>Invite members</Text>
              </Clay>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Section label ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>People</Text>
        </View>

        {/* ── Members list ──────────────────────────────── */}
        {plan.members.length === 0 ? (
          <View style={styles.listWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No members yet. Invite group members to join this plan.
              </Text>
            </Clay>
          </View>
        ) : (
          <Clay style={styles.listWrap} bodyStyle={styles.listCard}>
            {plan.members.map((m, i) => {
              const meta = STATUS_META[m.status];
              const isCreator = m.group_member_id === creatorId;
              const isLast = i === plan.members.length - 1;

              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleMemberOptions(m)}
                  activeOpacity={0.9}
                  style={[styles.memberRow, !isLast && styles.memberRowDivider]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: SAVINGS.tealSoft },
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
                      { backgroundColor: meta.soft },
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
          </Clay>
        )}

        <Text style={styles.footerNote}>
          Tap a member to see actions. In the live app, invites are sent as
          notifications and members accept them from their inbox.
        </Text>
      </ScrollView>

      {/* ── Invite modal ──────────────────────────────────── */}
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
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: SAVINGS.teal }]}
            />

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
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.searchWrap}
            >
              <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search group members"
                placeholderTextColor={CLAY.inkFaint}
                style={styles.searchInput}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <X size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
            </Clay>

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
                      activeOpacity={0.9}
                      style={[
                        styles.inviteRow,
                        !isLast && styles.memberRowDivider,
                      ]}
                    >
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: SAVINGS.tealSoft },
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
                          selected && styles.checkCircleSelected,
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
              activeOpacity={0.9}
              style={{ marginTop: SPACING.md }}
            >
              <Clay
                color={SAVINGS.teal}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(30, 70, 66, 0.42)"
                bodyStyle={[
                  styles.modalPrimaryBtn,
                  selectedIds.size === 0 && { opacity: 0.55 },
                ]}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  {selectedIds.size > 0
                    ? `Send ${selectedIds.size} invite${
                        selectedIds.size === 1 ? "" : "s"
                      }`
                    : "Select members"}
                </Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
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
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Clay radius={RADIUS.lg} depth={0} shade={CLAY.shadeSoft} style={{ flex: 1 }} bodyStyle={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Clay>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

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
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
    marginTop: 2,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Summary strip */
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  summaryStat: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  /* Invite action */
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
  },
  inviteBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Section label */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },

  /* List wrappers */
  listWrap: { paddingHorizontal: SPACING.xl },

  /* Members list */
  listCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  memberRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  memberMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  creatorPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: SAVINGS.tealSoft,
  },
  creatorPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: SAVINGS.tealInk,
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

  /* Empty */
  emptyCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  footerNote: {
    fontSize: 11.5,
    color: CLAY.inkFaint,
    textAlign: "center",
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xxl,
    lineHeight: 17,
    fontWeight: "500",
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
    maxHeight: "82%",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: 32,
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
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CLAY.inkFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    borderColor: SAVINGS.teal,
    backgroundColor: SAVINGS.teal,
  },
  modalPrimaryBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});