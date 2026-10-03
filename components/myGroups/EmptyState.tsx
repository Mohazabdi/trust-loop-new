import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  accentColor?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  accentColor = "#0d9488",
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${accentColor}18`, `${accentColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Icon size={32} color={accentColor} strokeWidth={1.6} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.85}>
          <LinearGradient
            colors={[accentColor, `${accentColor}cc`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.action}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 32,
    gap: 8,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13.5,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  action: {
    marginTop: 12,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
});