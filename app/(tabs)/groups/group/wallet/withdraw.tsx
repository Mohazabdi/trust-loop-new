import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupWithdrawScreen() {
  const { theme } = useGlobalStorage();
  const { group_id } = useLocalSearchParams<{ group_id?: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomWalletHeader
        subTitle="Withdrawal request"
        leftAction={{ icon: ChevronLeft, action: () => router.back() }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>
          Group withdrawal
        </Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Group ID: {group_id ?? "unknown"}
        </Text>
        <View
          style={[
            styles.placeholder,
            {
              borderColor: `${theme.text}15`,
              backgroundColor: theme.surface ?? theme.background,
            },
          ]}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            Withdrawal request flow goes here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  heading: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 12 },
  placeholder: {
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
});