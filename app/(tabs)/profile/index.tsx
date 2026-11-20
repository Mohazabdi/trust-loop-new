import React, { useRef, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Award,
  Bell,
  Building,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  Lock,
  LogOut,
  PieChart,
  Settings,
  Shield,
  Trophy,
  UserCheck,
  Wallet,
} from "lucide-react-native";

import { ConfirmationModal } from "@/components/myProfile/profile/modals/logout confirmationmodal";
import { LogoutToast } from "@/components/myProfile/profile/toasts/logout toast";
import { onSignOutButtonPress } from "@/utils/signOut";
import { useMemberData } from "@/hooks/useMemberData";
import { mockUser, mockNotifications } from "@/lib/mock_data/profileMocks/user";
import { useTabBarBottomInset } from "@/lib/layout/tabBar";

/* ================================================================== */
/*  LOCAL DESIGN TOKENS (Fully self-contained)                        */
/* ================================================================== */
const CLAY = {
  canvas: "#FFFFFF",
  surface: "#F8FAFC",
  ink: "#0F172A",
  inkSoft: "#475569",
  inkFaint: "#94A3B8",
  border: "#E2E8F0",
} as const;

const ACCENT = {
  green: "#3E9B62",
  greenDark: "#2C7048",
  greenSoft: "#ECFDF5",
  red: "#EF4444",
  redSoft: "#FEE2E2",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  amberInk: "#8A5B1E",
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;
const RADIUS = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

const SHADOWS = {
  soft: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

/* ================================================================== */
/*  SCREEN COMPONENT                                                  */
/* ================================================================== */
export default function ProfileScreen() {
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const tabBarInset = useTabBarBottomInset();

  const { data: member } = useMemberData();

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: mockUser.trustScore,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await onSignOutButtonPress();
      setShowToast(true);
    } catch (e) {
      console.log(`Error Signing out ${e}`);
    }
  };

  const initials = `${member?.first_name?.[0] ?? ""}${member?.last_name?.[0] ?? ""}`;
  const fullName = `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.trim();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset + SPACING.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile/settings")}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "U"}</Text>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName || "Customer"}
            </Text>
            {mockUser.isVerified && (
              <View style={styles.verifiedBadge}>
                <UserCheck size={14} color={ACCENT.green} strokeWidth={2.8} />
              </View>
            )}
          </View>

          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>
              {mockUser.accountType?.toUpperCase() || "PERSONAL"}
            </Text>
          </View>
        </View>

        {/* Trust Score */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/profile/analytics")}
          style={styles.trustCard}
        >
          <View style={styles.trustHeader}>
            <View style={styles.trustIconWrap}>
              <Trophy size={18} color={ACCENT.amberInk} strokeWidth={2.4} />
            </View>
            <Text style={styles.trustTitle}>Trust Score</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.trustFooter}>
            <Text style={styles.trustValue}>
              {mockUser.trustScore}
              <Text style={styles.trustValueSub}>/100</Text>
            </Text>
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>
                {mockUser.tier?.toUpperCase() || "TIER 1"}
              </Text>
            </View>
          </View>
          <Text style={styles.trustHint}>Tap for detailed analytics</Text>
        </TouchableOpacity>

        {/* Financial Overview */}
        <SectionLabel>Financial Overview</SectionLabel>
        <View style={styles.sectionCard}>
          <MenuItem icon={Wallet} title="My Wallets" subtitle="Manage accounts" onPress={() => router.push("/(tabs)/wallet")} />
          <View style={styles.divider} />
          <MenuItem icon={Building} title="Group Accounts" subtitle="Chama, investments" onPress={() => router.push("/(tabs)/groups")} />
          <View style={styles.divider} />
          <MenuItem icon={PieChart} title="Analytics & Reports" subtitle="Spending insights" onPress={() => router.push("/(tabs)/profile/analytics")} />
          <View style={styles.divider} />
          <MenuItem icon={History} title="Transaction History" subtitle="View all transactions" onPress={() => router.push("/(tabs)/profile/transactions")} />
        </View>

        {/* Account Settings */}
        <SectionLabel>Account Settings</SectionLabel>
        <View style={styles.sectionCard}>
          <MenuItem icon={Settings} title="Account Settings" subtitle="Personal information" onPress={() => router.push("/(tabs)/profile/settings")} />
          <View style={styles.divider} />
          <MenuItem icon={Bell} title="Notifications" subtitle="3 unread notifications" badge={{ text: mockNotifications.unread.toString(), tone: "red" }} onPress={() => router.push("/(tabs)/profile/notifications")} />
          <View style={styles.divider} />
          <MenuItem icon={Shield} title="Security" subtitle="2FA, biometrics" onPress={() => router.push("/(tabs)/profile/security")} />
          <View style={styles.divider} />
          <MenuItem icon={CreditCard} title="Payment Methods" subtitle="M-Pesa, bank accounts" onPress={() => router.push("/(tabs)/profile/payment-methods")} />
          <View style={styles.divider} />
          <MenuItem icon={Lock} title="Privacy Controls" subtitle="Data sharing" onPress={() => router.push("/(tabs)/profile/privacy")} />
          <View style={styles.divider} />
          <MenuItem icon={UserCheck} title="Verification Status" badge={{ text: "Verified", tone: "green" }} onPress={() => router.push("/(tabs)/profile/verification")} />
        </View>

        {/* Support */}
        <SectionLabel>Support</SectionLabel>
        <View style={styles.sectionCard}>
          <MenuItem icon={HelpCircle} title="Help Center" subtitle="FAQs and guides" onPress={() => router.push("/(tabs)/profile/help")} />
          <View style={styles.divider} />
          <MenuItem icon={FileText} title="Terms & Privacy" onPress={() => router.push("/(tabs)/profile/terms")} />
          <View style={styles.divider} />
          <MenuItem icon={Award} title="Upgrade Plan" subtitle="Get premium features" onPress={() => router.push("/(tabs)/profile/upgrade")} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={20} color={ACCENT.red} strokeWidth={2.4} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout from your account? This action cannot be undone."
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {showToast && (
        <LogoutToast
          message="You have been logged out successfully"
          type="success"
          duration={3000}
          onHide={() => setShowToast(false)}
        />
      )}
    </View>
  );
}

/* ================================================================== */
/*  INTERNAL SUB-COMPONENTS                                           */
/* ================================================================== */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

function MenuItem({
  icon: Icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  badge?: { text: string; tone: "red" | "green" };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Icon size={18} color={CLAY.inkSoft} strokeWidth={2.2} />
      </View>

      <View style={styles.menuBody}>
        <Text style={styles.menuTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View style={[styles.menuBadge, { backgroundColor: badge.tone === "red" ? ACCENT.redSoft : ACCENT.greenSoft }]}>
          <Text style={[styles.menuBadgeText, { color: badge.tone === "red" ? ACCENT.red : ACCENT.green }]}>
            {badge.text}
          </Text>
        </View>
      ) : null}

      <ChevronRight size={18} color={CLAY.inkFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/* ================================================================== */
/*  STYLESHEET                                                        */
/* ================================================================== */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.5,
  },
  editBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: CLAY.surface,
    borderWidth: 1,
    borderColor: CLAY.border,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.ink,
  },

  identity: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ACCENT.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT.greenDark,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ACCENT.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: CLAY.surface,
    borderWidth: 1,
    borderColor: CLAY.border,
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: CLAY.inkSoft,
  },

  trustCard: {
    backgroundColor: CLAY.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
    ...SHADOWS.soft,
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  trustIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: ACCENT.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: CLAY.ink,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: CLAY.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: ACCENT.amber,
  },
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trustValue: {
    fontSize: 24,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
  },
  trustValueSub: {
    fontSize: 14,
    fontWeight: "600",
    color: CLAY.inkFaint,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT.amberSoft,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: ACCENT.amberInk,
  },
  trustHint: {
    fontSize: 12,
    fontWeight: "500",
    color: CLAY.inkSoft,
    textAlign: "center",
  },

  sectionLabelRow: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionCard: {
    backgroundColor: CLAY.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.soft,
  },
  divider: {
    height: 1,
    backgroundColor: CLAY.border,
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CLAY.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBody: { flex: 1, gap: 2 },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: CLAY.ink,
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: CLAY.inkSoft,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: ACCENT.redSoft,
    marginTop: SPACING.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT.red,
  },
});