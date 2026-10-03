import { useGlobalStorage } from "@/store/useGlobalStorage";
import { Tabs, usePathname } from "expo-router";
import { Home, User, Users, Wallet } from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/*  Tab visibility                                                    */
/*                                                                    */
/*  The floating tab bar is only mounted on the four tab roots.       */
/*  Every nested route — SACCO home, rotation detail, create flows,   */
/*  wallet transfer, group chat, preview, settings — hides the bar.   */
/*                                                                    */
/*  This is a whitelist, not a blacklist: adding a new nested route   */
/*  hides the bar automatically. You never have to remember to add    */
/*  it to a list of exceptions.                                       */
/* ------------------------------------------------------------------ */

const TAB_ROOT_PATHS = ["/", "/wallet", "/groups", "/profile"];

function isTabRoot(pathname: string): boolean {
  // Strip query strings and hashes, trim trailing slashes, fall back to "/"
  const clean =
    pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  return TAB_ROOT_PATHS.includes(clean);
}

/* ------------------------------------------------------------------ */
/*  Design tokens — matched to the rest of the app                    */
/* ------------------------------------------------------------------ */

const CLAY = {
  surface: "#F0F4FA",
  sunken: "#C8D1DF",
  ink: "#1A2438",
  inkSoft: "#4A566B",
  edge: "rgba(71, 85, 105, 0.22)",
} as const;

const RADIUS = { pill: 22, capsule: 34 } as const;

/* ------------------------------------------------------------------ */
/*  Custom clay tab bar                                               */
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
    <View
      pointerEvents="box-none"
      style={[
        styles.barWrap,
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
      ]}
    >
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
                  <View
                    style={[styles.activePill, { backgroundColor: brand }]}
                  >
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
  const showTabBar = isTabRoot(pathname);

  return (
    <Tabs
      tabBar={(props) => <ClayTabBar {...props} hide={!showTabBar} />}
      screenOptions={{ headerShown: false }}
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

  barShell: {
    width: "100%",
    borderRadius: RADIUS.capsule,
    backgroundColor: CLAY.surface,
    borderWidth: 1,
    borderColor: CLAY.edge,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },

  barBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },

  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  tabPressed: {
    opacity: 0.85,
  },

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