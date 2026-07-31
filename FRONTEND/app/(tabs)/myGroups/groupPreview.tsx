import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ChevronLeft,
    Users,
    Shield,
    Calendar,
    TrendingUp,
    UserCheck,
    Crown,
    Send,
    Check,
    Bell,
    Lock,
    Globe,
    RefreshCw,
    AlertCircle,
    Clock,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Types ────────────────────────────────────────────────────
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

// ── CTA button state ─────────────────────────────────────────
type CtaState =
    | "ask"          // no request yet
    | "pending"      // request submitted, awaiting review
    | "approved"     // request approved → invitation exists
    | "member";      // already a member

export default function GroupPreviewPage() {
    const { theme } = useGlobalStorage();
    const router = useRouter();
    const { groupId, groupName: groupNameParam } = useLocalSearchParams<{
        groupId: string;
        groupName: string;
    }>();

    const { data: memberData } = useMemberData();
    const currentMemberId = memberData?.id;

    // ── Preview data ──────────────────────────────────────────
    const [preview, setPreview] = useState<GroupPreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
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

            // The RPC uses out_ prefixed column names to avoid the
            // "column reference is ambiguous" PL/pgSQL error.
            // Map them back to the flat shape GroupPreviewData expects.
            const raw = data?.[0];
            if (raw) {
                setPreview({
                    group_id:          raw.out_group_id,
                    group_name:        raw.out_group_name,
                    group_description: raw.out_group_description,
                    group_status:      raw.out_group_status,
                    max_capacity:      raw.out_max_capacity,
                    is_private:        raw.out_is_private,
                    created_at:        raw.out_created_at,
                    total_members:     raw.out_total_members,
                    active_members:    raw.out_active_members,
                    admin_count:       raw.out_admin_count,
                    admins:            raw.out_admins ?? [],
                    sample_members:    raw.out_sample_members ?? [],
                });
            } else {
                setPreview(null);
            }
        } catch (err: any) {
            if (mountedRef.current) setError(err.message ?? "Failed to load group.");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [groupId]);

    useFocusEffect(useCallback(() => { fetchPreview(); }, [fetchPreview]));

    // ── Join request state ────────────────────────────────────
    const {
        requestMap,
        refetch: refetchRequests,
        submitRequest,
        submitting,
    } = useJoinRequests(currentMemberId);

    // Re-sync request state on focus
    useFocusEffect(useCallback(() => { refetchRequests(); }, [refetchRequests]));

    // ── CTA state derivation ──────────────────────────────────
    const ctaState = useMemo((): CtaState => {
        if (!groupId) return "ask";
        const reqStatus = requestMap[groupId];
        if (reqStatus === "approved") return "approved";
        if (reqStatus === "pending") return "pending";
        return "ask";
    }, [groupId, requestMap]);

    // ── Ask to Join modal ─────────────────────────────────────
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
            const success = await submitRequest(groupId, currentMemberId, joinMessage.trim());
            if (success) {
                setJoinModalVisible(false);
                refetchRequests();
                Alert.alert(
                    "Request Sent",
                    `Your request to join "${preview?.group_name ?? groupNameParam}" has been sent. You'll be notified when the admin reviews it.`
                );
            }
        } catch (err: any) {
            Alert.alert("Error", err.message ?? "Failed to submit request.");
        }
    };

    // ── CTA config ────────────────────────────────────────────
    const ctaConfig = {
        ask: {
            label: "Ask to Join",
            bg: theme.primary,
            textColor: "#fff",
            icon: <Send size={18} color="#fff" />,
            onPress: openJoinModal,
            disabled: false,
        },
        pending: {
            label: "Request Sent",
            bg: "#f59e0b",
            textColor: "#fff",
            icon: <Clock size={18} color="#fff" />,
            onPress: () => {},
            disabled: true,
        },
        approved: {
            label: "Invitation Pending",
            bg: "#10b981",
            textColor: "#fff",
            icon: <Bell size={18} color="#fff" />,
            onPress: () => router.back(),
            disabled: false,
        },
        member: {
            label: "Open Group",
            bg: theme.primary,
            textColor: "#fff",
            icon: <Check size={18} color="#fff" />,
            onPress: () =>
                router.push({
                    pathname: "/(tabs)/myGroups/[group]",
                    params: { group: groupId!, groupName: groupNameParam },
                }),
            disabled: false,
        },
    }[ctaState];

    // ── Helpers ───────────────────────────────────────────────
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

    // ── Colors ────────────────────────────────────────────────
    const cardBg = theme.surface ?? theme.background;
    const isDark = theme.background !== "#fff" && theme.background !== "#ffffff";
    const subtleBg = isDark ? "rgba(255,255,255,0.06)" : "#f8fafc";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";

    if (loading) {
        return (
            <SafeAreaView
                style={{ flex: 1, backgroundColor: theme.background }}
                edges={["top"]}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                    }}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <ChevronLeft size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <View
                    style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                >
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text
                        style={{
                            color: theme.textSecondary,
                            marginTop: 12,
                            fontSize: 14,
                        }}
                    >
                        Loading group...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !preview) {
        return (
            <SafeAreaView
                style={{ flex: 1, backgroundColor: theme.background }}
                edges={["top"]}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                    }}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <ChevronLeft size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 32,
                        gap: 16,
                    }}
                >
                    <AlertCircle size={48} color="#ef4444" />
                    <Text
                        style={{
                            color: theme.text,
                            fontSize: 18,
                            fontWeight: "700",
                            textAlign: "center",
                        }}
                    >
                        Couldn't Load Group
                    </Text>
                    <Text
                        style={{
                            color: theme.textSecondary,
                            textAlign: "center",
                            fontSize: 14,
                        }}
                    >
                        {error ?? "Group not found."}
                    </Text>
                    <TouchableOpacity
                        onPress={fetchPreview}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            backgroundColor: theme.primary,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 10,
                        }}
                    >
                        <RefreshCw size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: theme.background }}
            edges={["top"]}
        >
            {/* ── Header ─────────────────────────────────────── */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.primary + "18",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                    }}
                >
                    <ChevronLeft size={20} color={theme.primary} />
                </TouchableOpacity>
                <Text
                    style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: theme.text,
                        flex: 1,
                    }}
                    numberOfLines={1}
                >
                    Group Preview
                </Text>
                <TouchableOpacity
                    onPress={fetchPreview}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.primary + "18",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <RefreshCw size={16} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* ── Hero / Banner ───────────────────────────── */}
                <View
                    style={{
                        height: 140,
                        backgroundColor: theme.primary + "22",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        paddingBottom: 0,
                        position: "relative",
                    }}
                >
                    {/* Decorative pattern */}
                    <View
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.15,
                        }}
                    >
                        {[...Array(6)].map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    position: "absolute",
                                    width: 80 + i * 20,
                                    height: 80 + i * 20,
                                    borderRadius: (80 + i * 20) / 2,
                                    borderWidth: 1.5,
                                    borderColor: theme.primary,
                                    top: -20 + i * 10,
                                    left: SCREEN_WIDTH * 0.6 - i * 15,
                                }}
                            />
                        ))}
                    </View>

                    {/* Group avatar circle (overlaps hero bottom) */}
                    <View
                        style={{
                            width: 76,
                            height: 76,
                            borderRadius: 38,
                            backgroundColor: theme.primary,
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 3,
                            borderColor: theme.background,
                            marginBottom: -38,
                            zIndex: 10,
                            shadowColor: theme.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.35,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                        <Users size={32} color="#fff" />
                    </View>
                </View>

                {/* ── Identity section ────────────────────────── */}
                <View
                    style={{
                        alignItems: "center",
                        paddingTop: 48,
                        paddingBottom: 20,
                        paddingHorizontal: 24,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "800",
                            color: theme.text,
                            textAlign: "center",
                            marginBottom: 8,
                            letterSpacing: -0.3,
                        }}
                    >
                        {preview.group_name}
                    </Text>

                    {/* Metadata pills */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: 8,
                            marginBottom: 16,
                        }}
                    >
                        <MetaPill
                            icon={<Users size={12} color={theme.textSecondary} />}
                            label={`${preview.total_members} member${preview.total_members !== 1 ? "s" : ""}`}
                            theme={theme}
                            subtleBg={subtleBg}
                        />
                        <MetaPill
                            icon={
                                preview.is_private ? (
                                    <Lock size={12} color={theme.textSecondary} />
                                ) : (
                                    <Globe size={12} color={theme.textSecondary} />
                                )
                            }
                            label={preview.is_private ? "Private" : "Open"}
                            theme={theme}
                            subtleBg={subtleBg}
                        />
                        <MetaPill
                            icon={<Calendar size={12} color={theme.textSecondary} />}
                            label={groupAge(preview.created_at)}
                            theme={theme}
                            subtleBg={subtleBg}
                        />
                    </View>

                    {/* Description */}
                    {preview.group_description && (
                        <Text
                            style={{
                                fontSize: 15,
                                color: theme.textSecondary,
                                textAlign: "center",
                                lineHeight: 23,
                            }}
                        >
                            {preview.group_description}
                        </Text>
                    )}
                </View>

                <View style={{ paddingHorizontal: 16, gap: 16 }}>
                    {/* ── Stats ───────────────────────────────── */}
                    <SectionCard title="Group Statistics" theme={theme} cardBg={cardBg} borderColor={borderColor}>
                        <View
                            style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            <StatBox
                                label="Total Members"
                                value={preview.total_members}
                                icon={<Users size={18} color={theme.primary} />}
                                theme={theme}
                                subtleBg={subtleBg}
                            />
                            <StatBox
                                label="Active Members"
                                value={preview.active_members}
                                icon={<UserCheck size={18} color="#10b981" />}
                                theme={theme}
                                subtleBg={subtleBg}
                                accent="#10b981"
                            />
                            <StatBox
                                label="Administrators"
                                value={preview.admin_count}
                                icon={<Shield size={18} color="#f59e0b" />}
                                theme={theme}
                                subtleBg={subtleBg}
                                accent="#f59e0b"
                            />
                            <StatBox
                                label="Capacity"
                                value={preview.max_capacity}
                                icon={<TrendingUp size={18} color={theme.primary} />}
                                theme={theme}
                                subtleBg={subtleBg}
                            />
                        </View>
                    </SectionCard>

                    {/* ── Admins ──────────────────────────────── */}
                    {preview.admins?.length > 0 && (
                        <SectionCard title="Administrators" theme={theme} cardBg={cardBg} borderColor={borderColor}>
                            <View style={{ gap: 10 }}>
                                {preview.admins.map((admin) => (
                                    <View
                                        key={admin.member_id}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: "#f59e0b22",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: "700",
                                                    color: "#f59e0b",
                                                }}
                                            >
                                                {getInitials(admin.first_name, admin.last_name)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    fontSize: 15,
                                                    fontWeight: "600",
                                                    color: theme.text,
                                                }}
                                            >
                                                {admin.first_name} {admin.last_name}
                                            </Text>
                                        </View>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 4,
                                                backgroundColor: "#f59e0b18",
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 10,
                                            }}
                                        >
                                            <Crown size={11} color="#f59e0b" />
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#f59e0b",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Admin
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </SectionCard>
                    )}

                    {/* ── Sample members ──────────────────────── */}
                    {preview.sample_members?.length > 0 && (
                        <SectionCard title="Some Members" theme={theme} cardBg={cardBg} borderColor={borderColor}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 10,
                                }}
                            >
                                {preview.sample_members.map((m) => (
                                    <View
                                        key={m.member_id}
                                        style={{ alignItems: "center", gap: 4 }}
                                    >
                                        <View
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: 23,
                                                backgroundColor: theme.primary + "22",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 15,
                                                    fontWeight: "700",
                                                    color: theme.primary,
                                                }}
                                            >
                                                {getInitials(m.first_name, m.last_name)}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: theme.textSecondary,
                                                maxWidth: 50,
                                                textAlign: "center",
                                            }}
                                            numberOfLines={1}
                                        >
                                            {m.first_name}
                                        </Text>
                                    </View>
                                ))}
                                {preview.total_members > preview.sample_members.length && (
                                    <View style={{ alignItems: "center", gap: 4 }}>
                                        <View
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: 23,
                                                backgroundColor: subtleBg,
                                                justifyContent: "center",
                                                alignItems: "center",
                                                borderWidth: 1,
                                                borderColor: borderColor,
                                                borderStyle: "dashed",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: "700",
                                                    color: theme.textSecondary,
                                                }}
                                            >
                                                +{preview.total_members - preview.sample_members.length}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: theme.textSecondary,
                                            }}
                                        >
                                            more
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </SectionCard>
                    )}
                </View>
            </ScrollView>

            {/* ── Sticky CTA bar ──────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.background,
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === "ios" ? 34 : 20,
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                <TouchableOpacity
                    onPress={ctaConfig.onPress}
                    disabled={ctaConfig.disabled || submitting === groupId}
                    style={{
                        backgroundColor: ctaConfig.bg,
                        paddingVertical: 16,
                        borderRadius: 14,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                        opacity:
                            ctaConfig.disabled || submitting === groupId ? 0.8 : 1,
                    }}
                >
                    {submitting === groupId ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        ctaConfig.icon
                    )}
                    <Text
                        style={{
                            color: ctaConfig.textColor,
                            fontWeight: "700",
                            fontSize: 17,
                        }}
                    >
                        {submitting === groupId ? "Sending..." : ctaConfig.label}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Ask to Join Modal ────────────────────────────── */}
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
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                        activeOpacity={1}
                        onPress={() => setJoinModalVisible(false)}
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
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: theme.text,
                                marginBottom: 4,
                            }}
                        >
                            Ask to Join
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: theme.textSecondary,
                                marginBottom: 16,
                            }}
                        >
                            {preview.group_name}
                        </Text>

                        <Text
                            style={{
                                color: theme.textSecondary,
                                fontSize: 13,
                                marginBottom: 14,
                                lineHeight: 19,
                            }}
                        >
                            Introduce yourself and explain why you'd like to join.
                        </Text>

                        <TextInput
                            multiline
                            numberOfLines={5}
                            placeholder="e.g. Hi! I'm interested in joining because..."
                            placeholderTextColor={theme.textSecondary}
                            value={joinMessage}
                            onChangeText={(t) => {
                                setJoinMessage(t);
                                setJoinMessageError("");
                            }}
                            style={{
                                borderWidth: 1,
                                borderColor: joinMessageError ? "#ef4444" : "#d1d5db",
                                borderRadius: 12,
                                padding: 14,
                                color: theme.text,
                                minHeight: 120,
                                textAlignVertical: "top",
                                marginBottom: 6,
                                fontSize: 14,
                                backgroundColor: isDark
                                    ? "rgba(255,255,255,0.05)"
                                    : "#f9fafb",
                            }}
                            autoFocus
                            maxLength={500}
                        />

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginBottom: 18,
                            }}
                        >
                            {joinMessageError ? (
                                <Text style={{ color: "#ef4444", fontSize: 12 }}>
                                    {joinMessageError}
                                </Text>
                            ) : (
                                <View />
                            )}
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                {joinMessage.length}/500
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleSubmitJoinRequest}
                            disabled={submitting === groupId}
                            style={{
                                backgroundColor: theme.primary,
                                paddingVertical: 15,
                                borderRadius: 12,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 8,
                                opacity: submitting === groupId ? 0.7 : 1,
                            }}
                        >
                            {submitting === groupId ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Send size={18} color="#fff" />
                            )}
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "700",
                                    fontSize: 16,
                                }}
                            >
                                {submitting === groupId ? "Sending..." : "Send Request"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// ── Sub-components ────────────────────────────────────────────

function SectionCard({
    title,
    children,
    theme,
    cardBg,
    borderColor,
}: {
    title: string;
    children: React.ReactNode;
    theme: any;
    cardBg: string;
    borderColor: string;
}) {
    return (
        <View
            style={{
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            <Text
                style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: theme.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 14,
                }}
            >
                {title}
            </Text>
            {children}
        </View>
    );
}

function StatBox({
    label,
    value,
    icon,
    theme,
    subtleBg,
    accent,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    theme: any;
    subtleBg: string;
    accent?: string;
}) {
    return (
        <View
            style={{
                backgroundColor: subtleBg,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                minWidth: (SCREEN_WIDTH - 80) / 2,
                flex: 1,
                gap: 6,
            }}
        >
            {icon}
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "800",
                    color: accent ?? theme.primary,
                    letterSpacing: -0.5,
                }}
            >
                {value}
            </Text>
            <Text
                style={{
                    fontSize: 11,
                    color: theme.textSecondary,
                    textAlign: "center",
                    fontWeight: "500",
                }}
            >
                {label}
            </Text>
        </View>
    );
}

function MetaPill({
    icon,
    label,
    theme,
    subtleBg,
}: {
    icon: React.ReactNode;
    label: string;
    theme: any;
    subtleBg: string;
}) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: subtleBg,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
            }}
        >
            {icon}
            <Text
                style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                    fontWeight: "500",
                }}
            >
                {label}
            </Text>
        </View>
    );
}