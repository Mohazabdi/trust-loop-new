// FRONTEND/app/terms.tsx
import { View, Text, ScrollView, StyleSheet } from "react-native";

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.body}>
        Replace this with your real Terms of Service. Legal doc required
        per TrustLoop's compliance scope.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20 },
});