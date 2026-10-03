import React, { useRef, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
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
import {
  mockUser,
  mockNotifications,
} from "@/lib/mock_data/profileMocks/user";
import { useTabBarBottomInset } from "@/lib/layout/tabBar";

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
  gold: "#96632A",
  goldSoft: "#F0DEBE",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

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

  const initials = `${member?.first_name?.[0] ?? ""}${
    member?.last_name?.[0] ?? ""
  }`;
  const fullName = `${member?.first_name ?? ""} ${
    member?.last_name ?? ""
  }`.trim();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset + SPACING.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row: title + edit ─────────────────── */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Profile</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile/settings")}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Clay radius={RADIUS.md} depth={1} bodyStyle={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Identity ─────────────────────────────────── */}
        <View style={styles.identity}>
          <Clay
            color={CLAY.surfaceRaised}
            radius={RADIUS.xl}
            depth={2}
            bodyStyle={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Clay>

          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
            {mockUser.isVerified ? (
              <View style={styles.verifiedBadge}>
                <UserCheck size={13} color={ACCENT.green} strokeWidth={2.8} />
              </View>
            ) : null}
          </View>

          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>
              {mockUser.accountType.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Trust score card ─────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/profile/analytics")}
          style={styles.block}
        >
          <Clay bodyStyle={styles.trustCard}>
            <View style={styles.trustHeader}>
              <View style={styles.trustIconWrap}>
                <Trophy size={16} color={ACCENT.gold} strokeWidth={2.6} />
              </View>
              <Text style={styles.trustTitle}>Trust score</Text>
            </View>

            <Clay
              inset
              radius={RADIUS.sm}
              color={CLAY.sunken}
              bodyStyle={styles.progressTrack}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressWidth },
                ]}
              />
            </Clay>

            <View style={styles.trustFooter}>
              <Text style={styles.trustValue}>
                {mockUser.trustScore}
                <Text style={styles.trustValueSub}>/100</Text>
              </Text>
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>
                  {mockUser.tier.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.trustHint}>
              Tap for detailed analytics
            </Text>
          </Clay>
        </TouchableOpacity>

        {/* ── Financial overview ───────────────────────── */}
        <SectionLabel>Financial overview</SectionLabel>
        <Clay bodyStyle={styles.sectionCard}>
          <MenuItem
            icon={Wallet}
            title="My Wallets"
            subtitle="Manage accounts"
            onPress={() => router.push("/(tabs)")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={Building}
            title="Group Accounts"
            subtitle="Chama, investments"
            onPress={() => router.push("/(tabs)/groups")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={PieChart}
            title="Analytics & Reports"
            subtitle="Spending insights"
            onPress={() => router.push("/(tabs)/profile/analytics")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={History}
            title="Transaction History"
            subtitle="View all transactions"
            onPress={() => router.push("/(tabs)/profile/transactions")}
            last
          />
        </Clay>

        {/* ── Account settings ─────────────────────────── */}
        <SectionLabel>Account settings</SectionLabel>
        <Clay bodyStyle={styles.sectionCard}>
          <MenuItem
            icon={Settings}
            title="Account Settings"
            subtitle="Personal information"
            onPress={() => router.push("/(tabs)/profile/settings")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={Bell}
            title="Notifications"
            subtitle="3 unread notifications"
            badge={{ text: mockNotifications.unread.toString(), tone: "red" }}
            onPress={() => router.push("/(tabs)/profile/notifications")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={Shield}
            title="Security"
            subtitle="2FA, biometrics"
            onPress={() => router.push("/(tabs)/profile/security")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={CreditCard}
            title="Payment Methods"
            subtitle="M-Pesa, bank accounts"
            onPress={() => router.push("/(tabs)/profile/payment-methods")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={Lock}
            title="Privacy Controls"
            subtitle="Data sharing"
            onPress={() => router.push("/(tabs)/profile/privacy")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={UserCheck}
            title="Verification Status"
            badge={{ text: "Verified", tone: "green" }}
            onPress={() => router.push("/(tabs)/profile/verification")}
            last
          />
        </Clay>

        {/* ── Support ──────────────────────────────────── */}
        <SectionLabel>Support</SectionLabel>
        <Clay bodyStyle={styles.sectionCard}>
          <MenuItem
            icon={HelpCircle}
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => router.push("/(tabs)/profile/help")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={FileText}
            title="Terms & Privacy"
            onPress={() => router.push("/(tabs)/profile/terms")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={Award}
            title="Upgrade Plan"
            subtitle="Get premium features"
            onPress={() => router.push("/(tabs)/profile/upgrade")}
            last
          />
        </Clay>

        {/* ── Logout ───────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutWrap}
          activeOpacity={0.9}
          onPress={() => setShowLogoutModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Clay
            color={ACCENT.redSoft}
            radius={RADIUS.lg}
            depth={0}
            highlight={CLAY.highlight}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.logoutBtn}
          >
            <LogOut size={18} color={ACCENT.red} strokeWidth={2.6} />
            <Text style={styles.logoutText}>Log out</Text>
          </Clay>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>

      {/* ── Confirmation modal ─────────────────────────── */}
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

      {/* ── Toast ──────────────────────────────────────── */}
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

function MenuItem({
  icon: Icon,
  title,
  subtitle,
  badge,
  onPress,
  last,
}: {
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  title: string;
  subtitle?: string;
  badge?: { text: string; tone: "red" | "green" };
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.menuRow, !last && styles.menuRowSpacing]}
    >
      <View style={styles.menuIcon}>
        <Icon size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
      </View>

      <View style={styles.menuBody}>
        <Text style={styles.menuTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {badge ? (
        <View
          style={[
            styles.menuBadge,
            {
              backgroundColor:
                badge.tone === "red" ? ACCENT.redSoft : ACCENT.greenSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.menuBadgeText,
              {
                color:
                  badge.tone === "red" ? ACCENT.red : ACCENT.green,
              },
            ]}
          >
            {badge.text}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl + 8,
    paddingBottom: SPACING.xxl,
  },

  /* Header row */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.3,
  },
  title: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.1,
  },

  /* Identity */
  identity: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.5,
    maxWidth: 220,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: CLAY.sunken,
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: CLAY.inkSoft,
  },

  /* Blocks */
  block: { marginBottom: SPACING.xl },

  /* Trust card */
  trustCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  trustIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: ACCENT.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 10,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT.gold,
  },
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trustValue: {
    fontSize: 28,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  trustValueSub: {
    fontSize: 14,
    fontWeight: "700",
    color: CLAY.inkFaint,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT.goldSoft,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ACCENT.gold,
  },
  trustHint: {
    fontSize: 11.5,
    fontWeight: "600",
    color: CLAY.inkFaint,
    textAlign: "center",
  },

  /* Section labels */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
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

  /* Section card */
  sectionCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
  },

  /* Menu rows */
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuRowSpacing: {},
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBody: { flex: 1, gap: 2 },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: CLAY.inkSoft,
  },
  menuBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Logout */
  logoutWrap: {
    marginTop: SPACING.xxl,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  logoutText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: ACCENT.red,
    letterSpacing: 0.1,
  },

  footer: { height: SPACING.lg },
});