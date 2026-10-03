import { useGlobalStorage } from "@/store/useGlobalStorage";
import { Tabs, usePathname } from "expo-router";
import { Home, User, Users, Wallet } from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/*  Hide rules — unchanged                                            */
/* ------------------------------------------------------------------ */

const HIDE_TAB_BAR_PATHS = [
  "/wallet/transfer",
  "/wallet/deposit",
  "/wallet/withdraw",
  "/wallet/receipt",
];

/* ------------------------------------------------------------------ */
/*  Design tokens — matched to the rest of the app                    */
/* ------------------------------------------------------------------ */

const CLAY = {
  surface: "#F0F4FA",
  sunken: "#C8D1DF",
  ink: "#1A2438",
  inkSoft: "#4A566B",
  /** Deeper than the canvas hairline so the capsule edge is actually
   *  visible against the light canvas behind it. */
  edge: "rgba(71, 85, 105, 0.22)",
} as const;

const RADIUS = { pill: 22, capsule: 34 } as const;

/* ------------------------------------------------------------------ */
/*  Custom tab bar                                                    */
/* ------------------------------------------------------------------ */

function ClayTabBar({
  state,
  descriptors,
  navigation,
  hide,
}: BottomTabBarProps & { hide: boolean }) {
  const insets = useSafeAreaInsets();
  const { theme } = useGlobalStorage();
  const brand = theme.primary;

  if (hide) return null;

  return (
    // Wrapper gets generous padding on all sides. React Native clips
    // shadows to the parent's bounding box, so the shadow needs real
    // space above, below, and to the sides to actually render.
    <View
      pointerEvents="box-none"
      style={[
        styles.barWrap,
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
      ]}
    >
      {/* Single view that carries the shadow, border, and radius.
          No nested shadow-casting view — that's what was cancelling
          the shadow before. */}
      <View style={styles.barShell}>
        <View style={styles.barBody}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : typeof options.title === "string"
                ? options.title
                : route.name;

            const renderIcon = (color: string) =>
              options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 20,
              });

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                android_ripple={{ color: "transparent" }}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={
                  options.tabBarAccessibilityLabel ?? label
                }
                style={({ pressed }) => [
                  styles.tabTouchable,
                  pressed && styles.tabPressed,
                ]}
              >
                {isFocused ? (
                  // Active pill — flat brand slab. No shadow here;
                  // shadows nested this deep get clipped and muddy.
                  // The colour contrast alone is enough to read it
                  // as raised.
                  <View style={[styles.activePill, { backgroundColor: brand }]}>
                    {renderIcon("#FFFFFF")}
                    <Text
                      style={styles.activeLabel}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {label}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inactiveWrap}>
                    <View style={styles.inactiveIconWell}>
                      {renderIcon(CLAY.inkSoft)}
                    </View>
                    <Text
                      style={styles.inactiveLabel}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab layout                                                        */
/* ------------------------------------------------------------------ */

export default function TabLayout() {
  const pathname = usePathname();

  const hideTabBar =
    HIDE_TAB_BAR_PATHS.some((p) => pathname.includes(p)) ||
    pathname.includes("/groups/group");

  return (
    <Tabs
      tabBar={(props) => <ClayTabBar {...props} hide={hideTabBar} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: hideTabBar ? "none" : "flex",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={2.6} />
          ),
          animation: "shift",
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => (
            <Wallet color={color} size={size} strokeWidth={2.6} />
          ),
          animation: "shift",
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={2.6} />
          ),
          animation: "shift",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={2.6} />
          ),
          animation: "shift",
        }}
      />
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* Floating wrapper. Generous padding on every side so the
     shell's shadow has room to render. React Native clips shadows
     to the parent bounding box — no padding means no shadow. */
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* The capsule. Single view carries the radius, border, and
     shadow. Nothing sits on top of it that would cancel the
     shadow out. */
  barShell: {
    width: "100%",
    borderRadius: RADIUS.capsule,
    backgroundColor: CLAY.surface,
    // Visible edge — this is what makes the capsule read as a
    // physical object against the light canvas behind it. The
    // previous hairline (rgba 0.14) was too faint to see.
    borderWidth: 1,
    borderColor: CLAY.edge,

    // iOS shadow. Single source of truth — clean, offset downward
    // so the capsule appears to float above the page.
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,

    // Android shadow. Android renders elevation much weaker than
    // iOS shadows at the same value, so 14 is roughly equivalent
    // to the iOS settings above.
    elevation: 14,
  },

  /* Inner row. No shadow, no border, just layout. */
  barBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },

  /* Equal-width tap areas. */
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  tabPressed: {
    opacity: 0.85,
  },

  /* Active tab — flat brand pill. The colour contrast is enough
     to read it as the selected state; no need to stack shadows. */
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    minHeight: 44,
  },

  activeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },

  /* Inactive tab — icon in a recessed well. */
  inactiveWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 4,
    minHeight: 44,
  },

  inactiveIconWell: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(71, 85, 105, 0.18)",
  },

  inactiveLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: CLAY.inkSoft,
    letterSpacing: 0.1,
  },
});