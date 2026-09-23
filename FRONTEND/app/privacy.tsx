// FRONTEND/app/privacy.tsx
import { View, Text, ScrollView, StyleSheet } from "react-native";

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>
        Replace this with your real Privacy Policy. Must comply with Kenya
        Data Protection Act, 2019.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20 },
});