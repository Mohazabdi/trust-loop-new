import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Building2,
  ChevronLeft,
  HandCoins,
  Users2,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

interface TypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: readonly [string, string];
  onPress: () => void;
  comingSoon?: boolean;
  badge?: string;
}

export default function CreateGroupPicker() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const TypeCard = ({
    icon,
    title,
    description,
    gradient,
    onPress,
    comingSoon = false,
    badge,
  }: TypeCardProps) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={comingSoon}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ disabled: comingSoon }}
      style={comingSoon ? { opacity: 0.75 } : undefined}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconWrap}>{icon}</View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            {comingSoon ? (
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>Coming soon</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardDesc}>{description}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomWalletHeader
        subTitle="Create a Group"
        leftAction={{ icon: ChevronLeft, action: () => router.back() }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What kind of group?</Text>
        <Text style={styles.sub}>
          Choose the type that best fits how your group operates.
        </Text>

        <View style={{ gap: 16, marginTop: 8 }}>
          {/* ── Community Group ───────────────────────────── */}
          <TypeCard
            icon={<Users2 size={26} color="#fff" />}
            title="Community Group"
            description="Chama, ROSCA, savings groups. Members pool money, take turns, and manage their own plans."
            gradient={["#285e1d", "#0f4a0b"]}
            onPress={() => router.push("/(tabs)/groups/create/community")}
          />

          {/* ── Institutional / NGO (future) ──────────────── */}
          <TypeCard
            icon={<Building2 size={26} color="#fff" />}
            title="Institutional / NGO"
            description="Organisations running financial programs — donor tracking, beneficiary disbursement, audit trails."
            gradient={["#1d5c5e", "#0f3a3b"]}
            onPress={() =>
              toast("Institutional groups coming soon", {
                position: "top-center",
              })
            }
            comingSoon
          />

          {/* ── SACCO ─────────────────────────────────────── */}
          <TypeCard
            icon={<HandCoins size={26} color="#fff" />}
            title="SACCO"
            description="Registered cooperatives with shares, dividends, multi-signature loans, and member capital management."
            gradient={["#1E3A8A", "#172554"]}
            onPress={() => router.push("/(tabs)/groups/create/sacco")}
          />
        </View>

        <Text style={styles.footer}>
          Not sure? A community group is the right starting point for most
          chamas and savings circles. A SACCO is best if you're a registered
          cooperative with share capital.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
    heading: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.5,
    },
    sub: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
      marginBottom: 8,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 18,
      borderRadius: 20,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
    cardDesc: {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      lineHeight: 17,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.6,
    },
    soonBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    soonBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
    },
    footer: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 20,
      paddingHorizontal: 12,
      lineHeight: 18,
      fontStyle: "italic",
    },
  });
}