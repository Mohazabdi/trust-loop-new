import { useGlobalStorage } from "@/store/useGlobalStorage";
import { Tabs, usePathname } from "expo-router";
import { User, Users, Wallet } from "lucide-react-native";
export default function TabLayout() {
  const { theme } = useGlobalStorage();
  const pathname = usePathname();                         // ← ADDED: get current route
  const isChatScreen = pathname.includes("/chat");        // ← ADDED: detect chat screen
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.surface,
          height: 100,
          paddingBottom: 10,
          paddingTop: 4,
          display: isChatScreen ? "none" : "flex",        // ← ADDED
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600" as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "my Wallet",
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
          animation: "shift",
        }}
      />
      <Tabs.Screen
        name="myGroups"
        options={{
          title: "my Groups",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          animation: "shift",
          // href: null,
        }}
      />
      <Tabs.Screen
        name="myProfile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          animation: "shift",
          // href: null,
        }}
      />
      <Tabs.Screen
        name="transferFunds"
        options={{
          title: "transfer Funds",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          animation: "shift",
          href: null,
        }}
      />
      <Tabs.Screen
        name="depositFunds"
        options={{
          title: "Deposit Funds",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          animation: "shift",
          href: null,
        }}
      />
      <Tabs.Screen
        name="withdrawFunds"
        options={{
          title: "Withdraw Funds",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          animation: "shift",
          href: null,
        }}
      />
      <Tabs.Screen
        name="transactionReceipt"
        options={{
          title: "Transaction Receipt",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          animation: "shift",
          href: null,
        }}
      />
    </Tabs>
  );
}
