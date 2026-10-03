import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/lib/constants/colors';

interface BadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ text, variant = 'neutral', style, textStyle }: BadgeProps) {
  const variantStyles = getVariantStyles(variant);

  return (
    <View style={[styles.badge, variantStyles.container, style]}>
      <Text style={[styles.text, variantStyles.text, textStyle]}>{text}</Text>
    </View>
  );
}

function getVariantStyles(variant: BadgeProps['variant']) {
  switch (variant) {
    case 'success':
      return {
        container: { backgroundColor: '#D1FAE5' },
        text: { color: Colors.status.verifiedGreen },
      };
    case 'warning':
      return {
        container: { backgroundColor: '#FED7AA' },
        text: { color: Colors.status.pendingOrange },
      };
    case 'error':
      return {
        container: { backgroundColor: '#FEE2E2' },
        text: { color: Colors.primary.red },
      };
    case 'info':
      return {
        container: { backgroundColor: '#DBEAFE' },
        text: { color: Colors.status.securityBlue },
      };
    case 'premium':
      return {
        container: { backgroundColor: '#EDE9FE' },
        text: { color: Colors.status.premiumPurple },
      };
    default:
      return {
        container: { backgroundColor: Colors.neutral.gray100 },
        text: { color: Colors.neutral.gray700 },
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
});
