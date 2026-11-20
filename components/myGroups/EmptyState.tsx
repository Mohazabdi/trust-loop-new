import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const INK = "#1E293B";
const INK_SOFT = "#64748B";
const DEFAULT_ACCENT = "#3E9B62";

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
  accentColor = DEFAULT_ACCENT,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {/* accentColor is a prop, so the tint is the only dynamic style */}
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1F` }]}>
        <Icon size={28} color={accentColor} strokeWidth={2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action ? (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.85}
          style={[styles.action, { backgroundColor: accentColor }]}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "700", color: INK, textAlign: "center", letterSpacing: -0.3 },
  description: { fontSize: 14, color: INK_SOFT, textAlign: "center", lineHeight: 20, maxWidth: 300, fontWeight: "500" },
  action: { marginTop: 16, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
