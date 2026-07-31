import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Check, AlertCircle, Clock, LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';

export type VerificationStepStatus = 'pending' | 'current' | 'completed' | 'failed';

export interface VerificationStepProps {
  id: string;
  title: string;
  description: string;
  status: VerificationStepStatus;
  icon?: LucideIcon;
  level: 1 | 2 | 3;
  order: number;
  isLast?: boolean;
  onPress?: () => void;
  required?: boolean;
  estimatedTime?: string;
}

export function VerificationStep({
  id,
  title,
  description,
  status,
  icon: Icon,
  level,
  order,
  isLast = false,
  onPress,
  required = true,
  estimatedTime,
}: VerificationStepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const getStatusColors = useCallback(() => {
    switch (status) {
      case 'completed':
        return {
          bg: '#D1FAE5',
          text: Colors.status.verifiedGreen,
          icon: Colors.status.verifiedGreen,
          border: Colors.status.verifiedGreen,
        };
      case 'current':
        return {
          bg: '#DBEAFE',
          text: Colors.primary.blue,
          icon: Colors.primary.blue,
          border: Colors.primary.blue,
        };
      case 'failed':
        return {
          bg: '#FEE2E2',
          text: Colors.primary.red,
          icon: Colors.primary.red,
          border: Colors.primary.red,
        };
      default:
        return {
          bg: Colors.neutral.gray50,
          text: Colors.neutral.gray700,
          icon: Colors.neutral.gray400,
          border: Colors.neutral.gray300,
        };
    }
  }, [status]);

  const colors = getStatusColors();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: order * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: order * 100,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [order, fadeAnim, scaleAnim]);

  useEffect(() => {
    if (status === 'current') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [status, progressAnim]);

  const progressOpacity = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {!isLast && (
        <View style={styles.connectorContainer}>
          <View style={[styles.connector, { backgroundColor: colors.border }]} />
        </View>
      )}

      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: status === 'current' ? 2 : 1,
            },
          ]}
        >
          {status === 'completed' && <Check size={16} color={colors.icon} />}
          {status === 'current' && (
            <Animated.View
              style={[
                styles.currentIndicator,
                { opacity: progressOpacity },
              ]}
            />
          )}
          {status === 'failed' && <AlertCircle size={16} color={colors.icon} />}
          {status === 'pending' && (
            <Text style={[styles.stepNumber, { color: colors.text }]}>
              {order}
            </Text>
          )}
        </View>

        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) }]}>
          <Text style={styles.levelText}>L{level}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.content,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
        onPress={onPress}
        disabled={status === 'pending' && !onPress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {Icon && <Icon size={18} color={colors.icon} style={styles.icon} />}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {!required && (
              <Text style={styles.optionalText}>(Optional)</Text>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
            <Text style={styles.statusText}>
              {status === 'completed' && 'Verified'}
              {status === 'current' && 'In Progress'}
              {status === 'failed' && 'Needs Review'}
              {status === 'pending' && 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.text }]}>
          {description}
        </Text>

        <View style={styles.footer}>
          {estimatedTime && status === 'current' && (
            <View style={styles.timeEstimate}>
              <Clock size={14} color={colors.icon} />
              <Text style={[styles.timeText, { color: colors.text }]}>
                ~{estimatedTime}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function getLevelColor(level: number) {
  switch (level) {
    case 1:
      return Colors.status.verifiedGreen;
    case 2:
      return Colors.primary.blue;
    case 3:
      return Colors.status.premiumPurple;
    default:
      return Colors.neutral.gray300;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  connectorContainer: {
    position: 'absolute',
    top: 32,
    left: 15,
    bottom: -Spacing.lg,
    width: 1,
    zIndex: -1,
  },
  connector: {
    flex: 1,
    width: '100%',
  },
  indicatorContainer: {
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  currentIndicator: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
  },
  stepNumber: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  levelBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  levelText: {
    ...Typography.caption,
    fontSize: 8,
    color: Colors.neutral.white,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  optionalText: {
    ...Typography.caption,
    color: Colors.neutral.gray500,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.neutral.white,
    fontWeight: '600',
  },
  description: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
  footer: {
    marginTop: Spacing.sm,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...Typography.caption,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});