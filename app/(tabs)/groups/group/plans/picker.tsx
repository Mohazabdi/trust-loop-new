import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronRight,
  Layers,
  PiggyBank,
  RefreshCcw,
} from "lucide-react-native";
import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

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
  teal: "#2E7A73",
  tealSoft: "#CBE4E1",
  purple: "#5B4B9E",
  purpleSoft: "#DCD5F0",
  navy: "#2F4F8A",
  navySoft: "#CBD7EE",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Plan catalogue                                                    */
/* ------------------------------------------------------------------ */

const PLANS = [
  {
    key: "rotation",
    label: "Rotation",
    subtitle: "Merry-go-round · ROSCA",
    description:
      "Members contribute each round and take turns receiving the pooled payout.",
    accent: ACCENT.green,
    accentSoft: ACCENT.greenSoft,
    icon: RefreshCcw,
    available: true,
  },
  {
    key: "savings",
    label: "Savings",
    subtitle: "Target-based group savings",
    description:
      "Contributions accumulate toward a shared goal. Withdrawals need multi-member approval.",
    accent: ACCENT.teal,
    accentSoft: ACCENT.tealSoft,
    icon: PiggyBank,
    available: true,
  },
  {
    key: "tableBanking",
    label: "Table Banking",
    subtitle: "Save together & borrow",
    description:
      "A hybrid plan that combines group savings with member lending.",
    accent: ACCENT.purple,
    accentSoft: ACCENT.purpleSoft,
    icon: Layers,
    available: false,
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Clay primitive — two-layer moulded surface                        */
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

export default function PlanPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    group_id?: string;
    group_member_id?: string;
    member_role?: string;
  }>();

  const handlePick = (key: string, available: boolean) => {
    if (!available) {
      toast("This plan type is coming soon", { position: "top-center" });
      return;
    }

    if (key === "rotation") {
      router.push({
        pathname: "/(tabs)/groups/group/plans/rotation/create",
        params: {
          group_id: params.group_id,
          group_member_id: params.group_member_id,
        },
      });
      return;
    }

    if (key === "savings") {
      router.push({
        pathname: "/(tabs)/groups/group/plans/savings/create",
        params: {
          group_id: params.group_id,
          group_member_id: params.group_member_id,
        },
      });
      return;
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBlock}>
          <Text style={styles.eyebrow}>NEW PLAN</Text>
          <Text style={styles.heading}>What kind of plan?</Text>
          <Text style={styles.sub}>
            Choose a plan type that matches how this group saves and shares.
          </Text>
        </View>

        {/* Plan cards */}
        <View style={styles.planList}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isAvail = plan.available;

            return (
              <TouchableOpacity
                key={plan.key}
                onPress={() => handlePick(plan.key, isAvail)}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={`${plan.label}. ${plan.subtitle}`}
                accessibilityState={{ disabled: !isAvail }}
              >
                <Clay
                  bodyStyle={[
                    styles.card,
                    !isAvail && styles.cardDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: plan.accentSoft },
                    ]}
                  >
                    <Icon size={22} color={plan.accent} strokeWidth={2.4} />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{plan.label}</Text>
                      {!isAvail ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: plan.accentSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: plan.accent },
                            ]}
                          >
                            Coming soon
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardSub}>{plan.subtitle}</Text>
                    <Text style={styles.cardDesc}>{plan.description}</Text>
                  </View>

                  {isAvail ? (
                    <ChevronRight
                      size={16}
                      color={CLAY.inkFaint}
                      strokeWidth={2.4}
                    />
                  ) : null}
                </Clay>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer note — recessed well */}
        <View style={styles.footerWrap}>
          <Clay
            inset
            radius={RADIUS.md}
            color={CLAY.sunken}
            bodyStyle={styles.footerCard}
          >
            <Text style={styles.footerText}>
              You can add more plans later. Each plan is independent — members
              can join the ones they want.
            </Text>
          </Clay>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scrollContent: {
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },

  /* Intro */
  introBlock: {
    paddingTop: SPACING.xl + 8,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.3,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sub: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: "500",
    marginTop: 4,
    maxWidth: 340,
  },

  /* Plan list */
  planList: {
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  cardDisabled: { opacity: 0.62 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  cardDesc: {
    fontSize: 12,
    color: CLAY.inkSoft,
    lineHeight: 17,
    marginTop: 3,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Footer note */
  footerWrap: {
    marginTop: SPACING.xxl,
  },
  footerCard: {
    padding: SPACING.lg,
  },
  footerText: {
    fontSize: 12,
    color: CLAY.inkSoft,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "500",
  },
});