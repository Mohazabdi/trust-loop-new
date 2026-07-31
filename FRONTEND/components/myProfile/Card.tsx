import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '@/lib/constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  level?: 1 | 2 | 3;
}

export function Card({ children, style, level = 2 }: CardProps) {
  const shadowStyle = level === 1 ? Shadows.level1 : level === 2 ? Shadows.level2 : Shadows.level3;

  return (
    <View style={[styles.card, shadowStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
});
