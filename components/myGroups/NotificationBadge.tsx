// Wraps any icon and overlays a count bubble.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  children: React.ReactNode;
};

export function NotificationBadge({ count, children }: Props) {
  return (
    <View style={styles.wrap}>
      {children}
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#CF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 12 },
});
