import { useGlobalStorage } from "@/store/useGlobalStorage";
import { WalletActionsStyles } from "@/styles/wallet_styles/wallet_actions.styles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { BanknoteArrowDown, BanknoteArrowUp, Send } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

export default function WalletActions() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => WalletActionsStyles(theme), [theme]);

  const GradientActionButton = ({
    colors,
    onPress,
    icon: Icon,
    label,
  }: {
    //hte
    colors: [string, string];
    onPress: () => void;
    icon: React.ElementType;
    label: string;
  }) => (
    <Pressable onPress={onPress} style={styles.gradientButton}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Icon size={25} color={theme.surface} />
        <Text style={styles.iconText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sectionTitle}>
          <Text style={styles.titleText}>Make A Transaction</Text>
        </View>
      </View>
      <View style={styles.body}>
        <GradientActionButton
          colors={["#285e1d", theme.secondary]}
          onPress={() => router.push("/depositFunds")}
          icon={BanknoteArrowUp}
          label="Deposit"
        />
        <GradientActionButton
          colors={["#1d5c5e", theme.secondary]}
          onPress={() => router.push("/transferFunds")}
          icon={Send}
          label="Send Money"
        />
        <GradientActionButton
          colors={["#5e1d1d", theme.secondary]}
          onPress={() => router.push("/withdrawFunds")}
          icon={BanknoteArrowDown}
          label="Withdraw"
        />
      </View>
    </View>
  );
}