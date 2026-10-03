import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Crown,
  Globe,
  Lock,
  RefreshCw,
  Send,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/mysupabase/supabase";
import { useMemberData } from "@/hooks/useMemberData";
import { useJoinRequests } from "@/hooks/useJoinRequests";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type GroupPreviewData = {
  group_id: string;
  group_name: string;
  group_description: string | null;
  group_status: string;
  max_capacity: number;
  created_at: string;
  total_members: number;
  active_members: number;
  admin_count: number;
  admins: Array<{ member_id: string; first_name: string; last_name: string }>;
  sample_members: Array<{ member_id: string; first_name: string; last_name: string }>;
  is_private: boolean;
};

type CtaState = "ask" | "pending" | "approved" | "member";

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

export default function GroupPreviewPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();
  const { groupId, groupName: groupNameParam } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
  }>();

  const { data: memberData } = useMemberData();
  const currentMemberId = memberData?.id;

  /* ── Preview data ────────────────────────────────────────── */
  const [preview, setPreview] = useState<GroupPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPreview = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_group_preview",
        { p_group_id: groupId }
      );
      if (rpcError) throw new Error(rpcError.message);
      if (!mountedRef.current) return;

      const raw = data?.[0];
      if (raw) {
        setPreview({
          group_id: raw.out_group_id,
          group_name: raw.out_group_name,
          group_description: raw.out_group_description,
          group_status: raw.out_group_status,
          max_capacity: raw.out_max_capacity,
          is_private: raw.out_is_private,
          created_at: raw.out_created_at,
          total_members: raw.out_total_members,
          active_members: raw.out_active_members,
          admin_count: raw.out_admin_count,
          admins: raw.out_admins ?? [],
          sample_members: raw.out_sample_members ?? [],
        });
      } else {
        setPreview(null);
      }
    } catch (err: any) {
      if (mountedRef.current)
        setError(err.message ?? "Failed to load group.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    fetchPreview();
  }, [fetchPreview]));

  /* ── Join request state ──────────────────────────────────── */
  const {
    requestMap,
    refetch: refetchRequests,
    submitRequest,
    submitting,
  } = useJoinRequests(currentMemberId);

  useFocusEffect(useCallback(() => {
    refetchRequests();
  }, [refetchRequests]));

  /* ── CTA state derivation ────────────────────────────────── */
  const ctaState = useMemo((): CtaState => {
    if (!groupId) return "ask";
    const reqStatus = requestMap[groupId];
    if (reqStatus === "approved") return "approved";
    if (reqStatus === "pending") return "pending";
    return "ask";
  }, [groupId, requestMap]);

  /* ── Ask to Join modal ───────────────────────────────────── */
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinMessageError, setJoinMessageError] = useState("");

  const openJoinModal = () => {
    setJoinMessage("");
    setJoinMessageError("");
    setJoinModalVisible(true);
  };

  const handleSubmitJoinRequest = async () => {
    if (!joinMessage.trim()) {
      setJoinMessageError("Please enter a message for your request.");
      return;
    }
    if (!currentMemberId || !groupId) return;
    try {
      const success = await submitRequest(
        groupId,
        currentMemberId,
        joinMessage.trim()
      );
      if (success) {
        setJoinModalVisible(false);
        refetchRequests();
        Alert.alert(
          "Request Sent",
          `Your request to join "${
            preview?.group_name ?? groupNameParam
          }" has been sent. You'll be notified when the admin reviews it.`
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to submit request.");
    }
  };

  /* ── CTA config ──────────────────────────────────────────── */
  const ctaConfig = {
    ask: {
      label: "Ask to join",
      bg: theme.primary,
      textColor: "#fff",
      icon: <Send size={18} color="#fff" strokeWidth={2.6} />,
      onPress: openJoinModal,
      disabled: false,
    },
    pending: {
      label: "Request sent",
      bg: ACCENT.amber,
      textColor: "#fff",
      icon: <Clock size={18} color="#fff" strokeWidth={2.6} />,
      onPress: () => {},
      disabled: true,
    },
    approved: {
      label: "Invitation pending",
      bg: ACCENT.green,
      textColor: "#fff",
      icon: <Bell size={18} color="#fff" strokeWidth={2.6} />,
      onPress: () => router.back(),
      disabled: false,
    },
    member: {
      label: "Open group",
      bg: theme.primary,
      textColor: "#fff",
      icon: <Check size={18} color="#fff" strokeWidth={2.8} />,
      onPress: () =>
        router.push({
          pathname: "/(tabs)/groups/group",
          params: { group: groupId!, groupName: groupNameParam },
        }),
      disabled: false,
    },
  }[ctaState];

  /* ── Helpers ─────────────────────────────────────────────── */
  const getInitials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

  const groupAge = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""} old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""} old`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? "s" : ""} old`;
  };

  /* ── Loading state ───────────────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <Clay bodyStyle={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading group…</Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Error state ─────────────────────────────────────────── */
  if (error || !preview) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => router.back()}
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
            <View
              style={[
                styles.missingIcon,
                { backgroundColor: ACCENT.redSoft },
              ]}
            >
              <AlertCircle size={26} color={ACCENT.red} strokeWidth={2.2} />
            </View>
            <Text style={styles.missingTitle}>Couldn't load group</Text>
            <Text style={styles.missingBody}>
              {error ?? "Group not found."}
            </Text>
            <TouchableOpacity
              onPress={fetchPreview}
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
                <RefreshCw size={16} color="#fff" strokeWidth={2.6} />
                <Text style={styles.missingCtaText}>Try again</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Main render ─────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Back row ──────────────────────────────────── */}
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
              <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Hero card with overlapping avatar ─────────── */}
        <View style={styles.heroWrap}>
          <Clay
            radius={RADIUS.xl}
            depth={2}
            bodyStyle={styles.heroBody}
          >
            <View style={styles.heroPattern} pointerEvents="none">
              {[...Array(4)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.heroRing,
                    {
                      width: 120 + i * 40,
                      height: 120 + i * 40,
                      borderRadius: (120 + i * 40) / 2,
                      top: -60 + i * 12,
                      right: -30 - i * 15,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.heroEyebrow}>GROUP PREVIEW</Text>

            <Clay
              color={theme.primary}
              radius={38}
              depth={2}
              highlight="rgba(255,255,255,0.34)"
              shade="rgba(12, 45, 22, 0.42)"
              style={styles.heroAvatarWrap}
              bodyStyle={styles.heroAvatar}
            >
              <Users size={32} color="#fff" strokeWidth={2.2} />
            </Clay>
          </Clay>
        </View>

        {/* ── Identity block ────────────────────────────── */}
        <View style={styles.identity}>
          <Text style={styles.groupName} numberOfLines={2}>
            {preview.group_name}
          </Text>

          <View style={styles.pillRow}>
            <MetaPill
              icon={<Users size={12} color={CLAY.inkSoft} strokeWidth={2.4} />}
              label={`${preview.total_members} member${
                preview.total_members !== 1 ? "s" : ""
              }`}
            />
            <MetaPill
              icon={
                preview.is_private ? (
                  <Lock size={12} color={CLAY.inkSoft} strokeWidth={2.4} />
                ) : (
                  <Globe size={12} color={CLAY.inkSoft} strokeWidth={2.4} />
                )
              }
              label={preview.is_private ? "Private" : "Open"}
            />
            <MetaPill
              icon={<Calendar size={12} color={CLAY.inkSoft} strokeWidth={2.4} />}
              label={groupAge(preview.created_at)}
            />
          </View>

          {preview.group_description ? (
            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.descWell}
            >
              <Text style={styles.description}>
                {preview.group_description}
              </Text>
            </Clay>
          ) : null}
        </View>

        {/* ── Body cards ────────────────────────────────── */}
        <View style={styles.bodyWrap}>
          {/* Group statistics */}
          <SectionLabel>Group statistics</SectionLabel>
          <Clay bodyStyle={styles.card}>
            <View style={styles.statsGrid}>
              <StatBox
                label="Total members"
                value={preview.total_members}
                icon={<Users size={16} color={theme.primary} strokeWidth={2.6} />}
                soft={`${theme.primary}18`}
              />
              <StatBox
                label="Active members"
                value={preview.active_members}
                icon={<UserCheck size={16} color={ACCENT.green} strokeWidth={2.6} />}
                soft={ACCENT.greenSoft}
                accent={ACCENT.green}
              />
              <StatBox
                label="Administrators"
                value={preview.admin_count}
                icon={<Shield size={16} color={ACCENT.amber} strokeWidth={2.6} />}
                soft={ACCENT.amberSoft}
                accent={ACCENT.amber}
              />
              <StatBox
                label="Capacity"
                value={preview.max_capacity}
                icon={<TrendingUp size={16} color={theme.primary} strokeWidth={2.6} />}
                soft={`${theme.primary}18`}
              />
            </View>
          </Clay>

          {/* Administrators */}
          {preview.admins?.length > 0 && (
            <>
              <SectionLabel>Administrators</SectionLabel>
              <Clay bodyStyle={styles.card}>
                <View style={styles.list}>
                  {preview.admins.map((admin, i, arr) => {
                    const isLast = i === arr.length - 1;
                    return (
                      <View
                        key={admin.member_id}
                        style={[
                          styles.adminRow,
                          !isLast && styles.rowDivider,
                        ]}
                      >
                        <View style={styles.adminAvatar}>
                          <Text style={styles.adminAvatarText}>
                            {getInitials(admin.first_name, admin.last_name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={styles.adminName}
                            numberOfLines={1}
                          >
                            {admin.first_name} {admin.last_name}
                          </Text>
                        </View>
                        <View style={styles.adminPill}>
                          <Crown size={11} color={ACCENT.amber} strokeWidth={2.6} />
                          <Text style={styles.adminPillText}>Admin</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Clay>
            </>
          )}

          {/* Sample members */}
          {preview.sample_members?.length > 0 && (
            <>
              <SectionLabel>Some members</SectionLabel>
              <Clay bodyStyle={styles.card}>
                <View style={styles.membersGrid}>
                  {preview.sample_members.map((m) => (
                    <View key={m.member_id} style={styles.memberTile}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {getInitials(m.first_name, m.last_name)}
                        </Text>
                      </View>
                      <Text
                        style={styles.memberName}
                        numberOfLines={1}
                      >
                        {m.first_name}
                      </Text>
                    </View>
                  ))}
                  {preview.total_members > preview.sample_members.length && (
                    <View style={styles.memberTile}>
                      <Clay
                        inset
                        radius={23}
                        color={CLAY.sunken}
                        bodyStyle={styles.memberMoreAvatar}
                      >
                        <Text style={styles.memberMoreText}>
                          +{preview.total_members - preview.sample_members.length}
                        </Text>
                      </Clay>
                      <Text style={styles.memberName}>more</Text>
                    </View>
                  )}
                </View>
              </Clay>
            </>
          )}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ── Sticky CTA bar ──────────────────────────────── */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          onPress={ctaConfig.onPress}
          disabled={ctaConfig.disabled || submitting === groupId}
          activeOpacity={0.9}
        >
          <Clay
            color={ctaConfig.bg}
            radius={RADIUS.lg}
            depth={2}
            highlight="rgba(255,255,255,0.32)"
            shade="rgba(12, 45, 22, 0.42)"
            bodyStyle={[
              styles.ctaBtn,
              (ctaConfig.disabled || submitting === groupId) && {
                opacity: 0.85,
              },
            ]}
          >
            {submitting === groupId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              ctaConfig.icon
            )}
            <Text style={styles.ctaBtnText}>
              {submitting === groupId ? "Sending…" : ctaConfig.label}
            </Text>
          </Clay>
        </TouchableOpacity>
      </View>

      {/* ── Ask to Join modal ───────────────────────────── */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setJoinModalVisible(false)}
          />
          <View style={styles.modalSheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: theme.primary },
                ]}
              />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.modalEyebrow}>ASK TO JOIN</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {preview.group_name}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalBody}>
                Introduce yourself and explain why you'd like to join.
              </Text>

              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={[
                  styles.joinInputWell,
                  joinMessageError ? { borderColor: ACCENT.red } : null,
                ]}
              >
                <TextInput
                  multiline
                  numberOfLines={5}
                  placeholder="e.g. Hi! I'm interested in joining because…"
                  placeholderTextColor={CLAY.inkFaint}
                  value={joinMessage}
                  onChangeText={(t) => {
                    setJoinMessage(t);
                    setJoinMessageError("");
                  }}
                  style={styles.joinInput}
                  autoFocus
                  maxLength={500}
                />
              </Clay>

              <View style={styles.joinFooter}>
                {joinMessageError ? (
                  <Text style={styles.joinError}>{joinMessageError}</Text>
                ) : (
                  <View />
                )}
                <Text style={styles.joinCount}>
                  {joinMessage.length}/500
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSubmitJoinRequest}
                disabled={submitting === groupId}
                activeOpacity={0.9}
                style={{ marginTop: SPACING.sm }}
              >
                <Clay
                  color={theme.primary}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.32)"
                  shade="rgba(12, 45, 22, 0.42)"
                  bodyStyle={[
                    styles.joinSubmit,
                    submitting === groupId && { opacity: 0.75 },
                  ]}
                >
                  {submitting === groupId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={18} color="#fff" strokeWidth={2.6} />
                  )}
                  <Text style={styles.joinSubmitText}>
                    {submitting === groupId ? "Sending…" : "Send request"}
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
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

function StatBox({
  label,
  value,
  icon,
  soft,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  soft: string;
  accent?: string;
}) {
  return (
    <Clay
      radius={RADIUS.lg}
      depth={0}
      shade={CLAY.shadeSoft}
      style={styles.statBoxWrap}
      bodyStyle={styles.statBox}
    >
      <View style={[styles.statBoxIcon, { backgroundColor: soft }]}>
        {icon}
      </View>
      <Text
        style={[
          styles.statBoxValue,
          { color: accent ?? CLAY.ink },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </Clay>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.metaPill}>
      {icon}
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
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

  /* Hero card with overlapping avatar */
  heroWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  heroBody: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    overflow: "hidden",
    gap: 6,
  },
  heroPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.14,
  },
  heroRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: CLAY.ink,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: CLAY.inkFaint,
  },
  heroAvatarWrap: {
    position: "absolute",
    bottom: -38,
    left: SPACING.lg,
    borderRadius: 38,
  },
  heroAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Identity */
  identity: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + 24,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  groupName: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xl,
    backgroundColor: CLAY.sunken,
  },
  metaPillText: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "700",
  },
  descWell: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  description: {
    fontSize: 13.5,
    color: CLAY.inkSoft,
    lineHeight: 20,
    fontWeight: "500",
  },

  /* Body */
  bodyWrap: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },

  /* Section labels */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: -SPACING.xs,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  /* Cards */
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },

  /* Stats */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statBoxWrap: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: RADIUS.lg,
  },
  statBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 6,
  },
  statBoxIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  statBoxLabel: {
    fontSize: 10.5,
    color: CLAY.inkFaint,
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Admins list */
  list: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: ACCENT.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT.amber,
  },
  adminName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT.amberSoft,
  },
  adminPillText: {
    fontSize: 10.5,
    color: ACCENT.amber,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  /* Sample members grid */
  membersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  memberTile: {
    alignItems: "center",
    gap: 4,
    width: 54,
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.inkSoft,
  },
  memberMoreAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  memberMoreText: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkSoft,
  },
  memberName: {
    fontSize: 11,
    color: CLAY.inkSoft,
    maxWidth: 54,
    textAlign: "center",
    fontWeight: "600",
  },

  /* Sticky CTA bar */
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: CLAY.canvas,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: -0.2,
  },

  /* Ask to Join modal */
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
    gap: SPACING.md,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  modalBody: {
    color: CLAY.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  joinInputWell: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  joinInput: {
    fontSize: 14,
    color: CLAY.ink,
    fontWeight: "500",
    minHeight: 110,
    padding: 0,
  },
  joinFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginTop: -SPACING.xs,
  },
  joinError: {
    color: ACCENT.red,
    fontSize: 12,
    fontWeight: "700",
  },
  joinCount: {
    color: CLAY.inkFaint,
    fontSize: 12,
    fontWeight: "600",
  },
  joinSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  joinSubmitText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15.5,
    letterSpacing: -0.2,
  },

  /* Loading */
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  loadingCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: SPACING.md,
    width: "100%",
    maxWidth: 260,
  },
  loadingText: {
    color: CLAY.inkSoft,
    fontSize: 13.5,
    fontWeight: "600",
  },

  /* Missing / error */
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
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  missingCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});