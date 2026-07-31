import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { SectionHeader } from '@/components/myProfile/SectionHeader';

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Privacy Controls' }} />
      <View style={styles.content}>
        <SectionHeader title="Data Sharing" />
        <Card>
          <Text style={styles.placeholderText}>Manage your data sharing preferences here.</Text>
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
