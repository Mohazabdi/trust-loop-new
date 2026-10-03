import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

const GRADIENTS: readonly (readonly [string, string])[] = [
  ["#0f766e", "#0d9488"],
  ["#7c3aed", "#a78bfa"],
  ["#be123c", "#fb7185"],
  ["#b45309", "#f59e0b"],
  ["#0369a1", "#38bdf8"],
  ["#4338ca", "#818cf8"],
  ["#15803d", "#4ade80"],
  ["#9d174d", "#f472b6"],
  ["#9a3412", "#fb923c"],
  ["#1e40af", "#60a5fa"],
] as const;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface GroupAvatarProps {
  name: string;
  seed?: string;
  size?: number;
}

export function GroupAvatar({ name, seed, size = 48 }: GroupAvatarProps) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const key = seed ?? name ?? "default";
  const gradient = GRADIENTS[hashString(key) % GRADIENTS.length];

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
        },
      ]}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: size * 0.4,
          fontWeight: "800",
          letterSpacing: 0.3,
          textShadowColor: "rgba(0,0,0,0.15)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
      >
        {initial}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
});