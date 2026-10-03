import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useMemberData } from "@/hooks/useMemberData";
import { useGetMemberGroups } from "@/hooks/Usegetmembergroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import {
  useSaccoStorage,
  netShareCapitalForMember,
  totalSharesForMember,
} from "@/store/useSaccoStorage";
import type { SaccoMemberRole, SaccoMemberStatus } from "@/lib/types/sacco";

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
  navyTint: "#DDE4F0",
  amber: "#96632A",
  amberSoft: "#EBD8B8",
  neutral: "#4A566B",
  neutralSoft: "#CDD4E0",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const formatMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const initialsOf = (first?: string, last?: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase() || "?"}`;

const ROLE_LABEL: Record<SaccoMemberRole, string> = {
  admin: "Admin",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member: "Member",
};

const STATUS_META: Record<SaccoMemberStatus, { color: string; soft: string }> = {
  active: { color: ACCENT.green, soft: ACCENT.greenSoft },
  invited: { color: ACCENT.amber, soft: ACCENT.amberSoft },
  removed: { color: ACCENT.neutral, soft: ACCENT.neutralSoft },
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

export default function SaccoMembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sacco_id?: string;
    group_member_id?: string;
  }>();

  const { data: member } = useMemberData();
  const currentMemberId = params.group_member_id ?? member?.id ?? "";

  const sacco = useSaccoStorage((s) =>
    s.saccos.find((x) => x.sacco_id === params.sacco_id)
  );
  const addSaccoMember = useSaccoStorage((s) => s.addSaccoMember);
  const updateSaccoMember = useSaccoStorage((s) => s.updateSaccoMember);
  const removeSaccoMember = useSaccoStorage((s) => s.removeSaccoMember);

  /* Admin's groups for the invite source */
  const { groups: myGroups } = useGetMemberGroups();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* Invite modal */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sourceGroupId, setSourceGroupId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { members: sourceGroupMembers, loading: sourceLoading } =
    useGroupMembers(sourceGroupId ?? undefined);

  /* ── Derived ─────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isAdmin = useMemo(() => {
    const role = myMemberRow?.role;
    return role === "admin" || sacco?.created_by_id === currentMemberId;
  }, [myMemberRow?.role, sacco?.created_by_id, currentMemberId]);

  const activeMembers = useMemo(
    () => (sacco?.members ?? []).filter((m) => m.status !== "removed"),
    [sacco?.members]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? activeMembers.filter((m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
        )
      : activeMembers;
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return a.first_name.localeCompare(b.first_name);
    });
  }, [activeMembers, search]);

  const counts = useMemo(
    () => ({
      total: activeMembers.length,
      active: activeMembers.filter((m) => m.status === "active").length,
      invited: activeMembers.filter((m) => m.status === "invited").length,
    }),
    [activeMembers]
  );

  /* Members already in SACCO (by member id) for filtering */
  const inSaccoIds = useMemo(
    () => new Set(activeMembers.map((m) => m.group_member_id)),
    [activeMembers]
  );

  const invitableMembers = useMemo(() => {
    if (!sourceGroupMembers) return [];
    return sourceGroupMembers.filter(
      (gm: any) => !inSaccoIds.has(gm.member_id)
    );
  }, [sourceGroupMembers, inSaccoIds]);

  /* ── Handlers ───────────────────────────────────────────── */

  const handleBack = useCallback(() => router.back(), [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  const handleOpenInvite = () => {
    /* Default to the first group the admin belongs to */
    const firstGroup = myGroups?.[0]?.group_id ?? null;
    setSourceGroupId(firstGroup);
    setSelectedIds(new Set());
    setInviteOpen(true);
  };

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  };

  const handleSendInvites = () => {
    if (!sacco) return;
    if (selectedIds.size === 0) return;

    let added = 0;
    selectedIds.forEach((id) => {
      const gm = sourceGroupMembers?.find((x: any) => x.member_id === id);
      if (!gm) return;
      addSaccoMember(sacco.sacco_id, {
        group_member_id: gm.member_id,
        first_name: gm.first_name,
        last_name: gm.last_name,
        email: gm.email,
        role: "member",
        status: "invited",
      });
      added += 1;
    });

    toast.success(`${added} invite${added === 1 ? "" : "s"} sent`);
    setSelectedIds(new Set());
    setInviteOpen(false);
  };

  const handleMemberOptions = (m: any) => {
    if (!sacco) return;
    const isCreator = m.group_member_id === sacco.created_by_id;
    const isMe = m.group_member_id === currentMemberId;

    if (m.status === "invited") {
      Alert.alert(
        `${m.first_name} ${m.last_name}`,
        "Invite pending · awaiting their acceptance",
        [
          { text: "Close", style: "cancel" },
          {
            text: "Simulate acceptance",
            onPress: () => {
              updateSaccoMember(sacco.sacco_id, m.id, { status: "active" });
              toast.success(`${m.first_name} accepted`);
            },
          },
          {
            text: "Remove invite",
            style: "destructive",
            onPress: () => {
              removeSaccoMember(sacco.sacco_id, m.id);
              toast("Invite removed");
            },
          },
        ]
      );
      return;
    }

    if (m.status === "active" && !isCreator && !isMe && isAdmin) {
      Alert.alert(
        `${m.first_name} ${m.last_name}`,
        `Role: ${ROLE_LABEL[m.role as SaccoMemberRole] ?? m.role}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Change role",
            onPress: () =>
              Alert.alert("Change role", "Choose a new role", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Treasurer",
                  onPress: () => {
                    updateSaccoMember(sacco.sacco_id, m.id, {
                      role: "treasurer",
                    });
                    toast.success("Role updated");
                  },
                },
                {
                  text: "Secretary",
                  onPress: () => {
                    updateSaccoMember(sacco.sacco_id, m.id, {
                      role: "secretary",
                    });
                    toast.success("Role updated");
                  },
                },
                {
                  text: "Member",
                  onPress: () => {
                    updateSaccoMember(sacco.sacco_id, m.id, {
                      role: "member",
                    });
                    toast.success("Role updated");
                  },
                },
              ]),
          },
          {
            text: "Remove from SACCO",
            style: "destructive",
            onPress: () => {
              removeSaccoMember(sacco.sacco_id, m.id);
              toast("Member removed");
            },
          },
        ]
      );
    }
  };

  /* ── Guards ─────────────────────────────────────────────── */

  if (!sacco) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <View style={styles.missingIcon}>
              <AlertTriangle
                size={24}
                color={ACCENT.navy}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.missingTitle}>SACCO not found</Text>
            <Text style={styles.missingBody}>
              This SACCO is no longer available, or you don't have access to
              it.
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.md }}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.md}
                depth={1}
                highlight="rgba(255,255,255,0.32)"
                shade="rgba(15, 30, 60, 0.44)"
                bodyStyle={styles.missingCta}
              >
                <Text style={styles.missingCtaText}>Go back</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
      >
        {/* ── Back row ─────────────────────────────────── */}
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

        {/* ── Header ───────────────────────────────────── */}
        <View style={styles.header}>
          <SaccoBadge
            category={sacco.sasra_license_category}
            verified={!!sacco.sasra_verified_at}
            size="sm"
          />
          <Text style={styles.title}>
            {counts.total} {counts.total === 1 ? "member" : "members"}
          </Text>
          <Text style={styles.subtitle}>
            {counts.active} active
            {counts.invited > 0 ? ` · ${counts.invited} pending` : ""}
          </Text>
        </View>

        {/* ── Invite CTA (admin) ───────────────────────── */}
        {isAdmin ? (
          <TouchableOpacity
            onPress={handleOpenInvite}
            activeOpacity={0.9}
            style={styles.ctaWrap}
          >
            <Clay
              color={ACCENT.navy}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(15, 30, 60, 0.42)"
              bodyStyle={styles.inviteBtn}
            >
              <UserPlus size={17} color="#fff" strokeWidth={2.6} />
              <Text style={styles.inviteBtnText}>Invite members</Text>
            </Clay>
          </TouchableOpacity>
        ) : null}

        {/* ── Search — recessed well ───────────────────── */}
        <View style={styles.searchWrapOuter}>
          <Clay
            inset
            radius={RADIUS.md}
            color={CLAY.sunken}
            bodyStyle={styles.searchBody}
          >
            <Search size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members"
              placeholderTextColor={CLAY.inkFaint}
              style={styles.searchInput}
              autoCapitalize="words"
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <X size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
              </TouchableOpacity>
            ) : null}
          </Clay>
        </View>

        {/* ── List ─────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Users size={22} color={ACCENT.navy} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? `No members match "${search}"`
                  : "No members yet"}
              </Text>
            </Clay>
          </View>
        ) : (
          <Clay style={styles.listWrap} bodyStyle={styles.list}>
            {filtered.map((m, i) => {
              const isLast = i === filtered.length - 1;
              const isYou = m.group_member_id === currentMemberId;
              const isCreator = m.group_member_id === sacco.created_by_id;
              const statusMeta = STATUS_META[m.status];
              const shares = totalSharesForMember(sacco, m.id);
              const capital = netShareCapitalForMember(sacco, m.id);

              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleMemberOptions(m)}
                  activeOpacity={0.9}
                  style={[styles.row, !isLast && styles.rowDivider]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initialsOf(m.first_name, m.last_name)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {m.first_name} {m.last_name}
                        {isYou ? " · you" : ""}
                      </Text>
                      {isCreator ? (
                        <View style={styles.creatorPill}>
                          <Text style={styles.creatorPillText}>Creator</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.roleText}>{ROLE_LABEL[m.role]}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>
                        {shares} share{shares === 1 ? "" : "s"}
                      </Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>
                        {sacco.currency_code} {formatMoney(capital)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusMeta.soft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusMeta.color },
                      ]}
                    >
                      {m.status}
                    </Text>
                  </View>

                  {isAdmin ? (
                    <ChevronRight
                      size={14}
                      color={CLAY.inkFaint}
                      strokeWidth={2.4}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Clay>
        )}
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
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.navy }]}
            />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.modalEyebrow}>INVITE</Text>
                <Text style={styles.modalTitle}>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : "Add to this SACCO"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInviteOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Source group picker */}
            <View style={styles.sourceLabelRow}>
              <View style={styles.sectionMarker} />
              <Text style={styles.sourceLabel}>Choose from a group</Text>
            </View>

            {myGroups && myGroups.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceRow}
              >
                {myGroups.map((g: any) => {
                  const selected = sourceGroupId === g.group_id;
                  return (
                    <TouchableOpacity
                      key={g.group_id}
                      onPress={() => {
                        setSourceGroupId(g.group_id);
                        setSelectedIds(new Set());
                      }}
                      activeOpacity={0.9}
                    >
                      <Clay
                        color={selected ? ACCENT.navy : CLAY.sunken}
                        radius={RADIUS.xl}
                        depth={selected ? 1 : 0}
                        highlight={
                          selected
                            ? "rgba(255,255,255,0.30)"
                            : CLAY.highlight
                        }
                        shade={
                          selected
                            ? "rgba(15, 30, 60, 0.40)"
                            : CLAY.shadeSoft
                        }
                        bodyStyle={styles.sourceChip}
                      >
                        <Text
                          style={[
                            styles.sourceChipText,
                            selected && styles.sourceChipTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {g.group_name}
                        </Text>
                      </Clay>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.sourceEmpty}>
                You need to be a member of a community group to invite people.
              </Text>
            )}

            {/* Candidate list */}
            <View style={styles.candidatesWrap}>
              {sourceLoading ? (
                <ActivityIndicator
                  color={ACCENT.navy}
                  style={{ marginVertical: 24 }}
                />
              ) : invitableMembers.length === 0 ? (
                <View style={styles.candidateEmpty}>
                  <Text style={styles.candidateEmptyText}>
                    {sourceGroupId
                      ? "Everyone in this group is already part of this SACCO."
                      : "Pick a group above to see available members."}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={invitableMembers}
                  keyExtractor={(item: any) => item.member_id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }: any) => {
                    const selected = selectedIds.has(item.member_id);
                    return (
                      <TouchableOpacity
                        onPress={() => toggleMember(item.member_id)}
                        activeOpacity={0.9}
                        style={styles.candidateRow}
                      >
                        <View style={styles.candidateAvatar}>
                          <Text style={styles.candidateAvatarText}>
                            {initialsOf(item.first_name, item.last_name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={styles.candidateName}
                            numberOfLines={1}
                          >
                            {item.first_name} {item.last_name}
                          </Text>
                          {item.member_role ? (
                            <Text style={styles.candidateMeta}>
                              {item.member_role}
                            </Text>
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
                  }}
                />
              )}
            </View>

            <TouchableOpacity
              onPress={handleSendInvites}
              disabled={selectedIds.size === 0}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.lg }}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(15, 30, 60, 0.42)"
                bodyStyle={[
                  styles.modalPrimary,
                  selectedIds.size === 0 && { opacity: 0.55 },
                ]}
              >
                <Text style={styles.modalPrimaryText}>
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
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Back row */
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

  /* Header */
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 4,
    alignItems: "flex-start",
  },
  title: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  /* Primary CTA */
  ctaWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
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

  /* Search well */
  searchWrapOuter: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  searchBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },

  /* List */
  listWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  creatorPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: ACCENT.navySoft,
  },
  creatorPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
    color: ACCENT.navy,
  },
  metaText: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CLAY.inkFaint,
    opacity: 0.7,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Empty state */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  emptyCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.navySoft,
  },
  emptyText: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    fontWeight: "600",
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.navySoft,
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
  missingCta: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  missingCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Invite modal */
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
    maxHeight: "88%",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 32,
    gap: SPACING.md,
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
  },
  modalEyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },

  sourceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionMarker: {
    width: 4,
    height: 13,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sourceRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
    paddingVertical: 4,
  },
  sourceChip: {
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.xl,
  },
  sourceChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  sourceChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  sourceEmpty: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    paddingVertical: SPACING.md,
    fontWeight: "500",
  },

  candidatesWrap: {
    marginTop: SPACING.md,
    minHeight: 200,
    maxHeight: 340,
  },
  candidateEmpty: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  candidateEmptyText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  candidateAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  candidateAvatarText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.4,
  },
  candidateName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  candidateMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
    textTransform: "capitalize",
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
    borderColor: ACCENT.navy,
    backgroundColor: ACCENT.navy,
  },

  modalPrimary: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});