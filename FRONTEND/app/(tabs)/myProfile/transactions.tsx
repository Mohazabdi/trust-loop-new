import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '@/lib/constants/colors';
import { SectionHeader } from '@/components/myProfile/SectionHeader';
import { Card } from '@/components/myProfile/Card';

export default function TransactionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Transaction History' }} />
      <View style={styles.content}>
        <SectionHeader title="Recent Transactions" />
        <Card>
          <Text style={styles.placeholderText}>No transactions yet.</Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  placeholderText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
  },
});
