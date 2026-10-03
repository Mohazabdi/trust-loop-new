import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  Shield,
  CheckCircle,
  Lock,
  ChevronRight,
  Award,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type VerificationLevel = 1 | 2 | 3;
export type VerificationStatusType = 'not_started' | 'in_progress' | 'verified' | 'suspended';

interface Benefit {
  level: VerificationLevel;
  title: string;
  unlocked: boolean;
  icon: string;
}

export interface VerificationStatusProps {
  currentLevel: VerificationLevel;
  progressPercentage: number;
  status: VerificationStatusType;
  completedSteps: number;
  totalSteps: number;
  nextLevelUnlockAt: number;
  benefits?: Benefit[];
  onLevelPress?: (level: VerificationLevel) => void;
  onBenefitPress?: (benefit: Benefit) => void;
  onViewDetails?: () => void;
}

const STATUS_CONFIG = {
  not_started: {
    color: Colors.neutral.gray400,
    text: 'Not Started',
    icon: Lock,
  },
  in_progress: {
    color: Colors.primary.blue,
    text: 'In Progress',
    icon: Shield,
  },
  verified: {
    color: Colors.status.verifiedGreen,
    text: 'Verified',
    icon: CheckCircle,
  },
  suspended: {
    color: Colors.primary.red,
    text: 'Suspended',
    icon: Lock,
  },
} as const;

const LEVEL_COLORS: Record<VerificationLevel, string> = {
  1: Colors.status.verifiedGreen,
  2: Colors.primary.blue,
  3: Colors.status.premiumPurple,
};

const LEVELS: VerificationLevel[] = [1, 2, 3];

export function VerificationStatus({
  currentLevel,
  progressPercentage,
  status,
  completedSteps,
  totalSteps,
  nextLevelUnlockAt,
  benefits = [],
  onLevelPress,
  onBenefitPress,
  onViewDetails,
}: VerificationStatusProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { color: statusColor, text: statusText, icon: StatusIcon } = STATUS_CONFIG[status];

  const unlockedBenefits = useMemo(() => 
    benefits.filter(b => b.unlocked).slice(0, 3),
    [benefits]
  );

  const lockedBenefitsCount = useMemo(() => 
    benefits.filter(b => !b.unlocked).length,
    [benefits]
  );

  const remainingSteps = useMemo(() => 
    Math.max(0, nextLevelUnlockAt - completedSteps),
    [nextLevelUnlockAt, completedSteps]
  );

  const handleLevelPress = useCallback((level: VerificationLevel) => {
    if (level <= currentLevel) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onLevelPress?.(level);
    }
  }, [currentLevel, onLevelPress]);

  const handleBenefitPress = useCallback((benefit: Benefit) => {
    onBenefitPress?.(benefit);
  }, [onBenefitPress]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.();
  }, [onViewDetails]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progressPercentage]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const renderLevelIndicator = (level: VerificationLevel) => {
    const isCurrentLevel = level === currentLevel;
    const isUnlocked = level <= currentLevel;
    const backgroundColor = isUnlocked ? LEVEL_COLORS[level] : Colors.neutral.gray200;

    return (
      <TouchableOpacity
        key={level}
        style={[
          styles.levelIndicatorHorizontal,
          { backgroundColor },
        ]}
        onPress={() => handleLevelPress(level)}
        disabled={!isUnlocked}
        activeOpacity={isUnlocked ? 0.7 : 1}
        accessibilityLabel={`Level ${level} ${isUnlocked ? 'unlocked' : 'locked'}${isCurrentLevel ? ', current level' : ''}`}
        accessibilityRole="button"
      >
        <Text style={styles.levelNumberHorizontal}>L{level}</Text>
        {isCurrentLevel && (
          <View 
            style={styles.currentLevelDotHorizontal}
            accessibilityLabel="Current level indicator"
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderBenefitCard = (benefit: Benefit, index: number) => {
    const levelColor = LEVEL_COLORS[benefit.level];

    return (
      <TouchableOpacity
        key={`${benefit.level}-${index}`}
        style={styles.benefitCard}
        onPress={() => handleBenefitPress(benefit)}
        activeOpacity={0.8}
        accessibilityLabel={`Benefit: ${benefit.title}, Level ${benefit.level}`}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.benefitIcon,
            { backgroundColor: `${levelColor}20` },
          ]}
        >
          <Award size={20} color={levelColor} />
        </View>
        <Text style={styles.benefitName} numberOfLines={2}>
          {benefit.title}
        </Text>
        <View
          style={[
            styles.benefitLevelBadge,
            { backgroundColor: levelColor },
          ]}
        >
          <Text style={styles.benefitLevelText}>L{benefit.level}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        }
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Verification status: ${statusText}. Level ${currentLevel}, ${completedSteps} of ${totalSteps} steps completed`}
    >
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <StatusIcon size={20} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={handleViewDetails}
          accessibilityLabel="View verification details"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View Details</Text>
          <ChevronRight size={16} color={Colors.primary.blue} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Verification Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
        </View>
        
        <View style={styles.horizontalProgressContainer}>
          <View style={styles.horizontalProgressBarBg}>
            <Animated.View
              style={[
                styles.horizontalProgressBarFill,
                { 
                  width: progressWidth,
                  backgroundColor: LEVEL_COLORS[currentLevel],
                },
              ]}
              accessibilityLabel={`Progress: ${Math.round(progressPercentage)}%`}
            />
          </View>
          
          <View style={styles.levelIndicatorsHorizontal}>
            {LEVELS.map(renderLevelIndicator)}
          </View>
        </View>

        <View style={styles.stepsProgress}>
          <Text style={styles.stepsCount}>
            {completedSteps}/{totalSteps} steps completed
          </Text>
          {currentLevel < 3 && remainingSteps > 0 && (
            <Text style={styles.nextLevelText}>
              {remainingSteps} more {remainingSteps === 1 ? 'step' : 'steps'} to unlock Level {currentLevel + 1}
            </Text>
          )}
          {currentLevel === 3 && (
            <Text style={[styles.nextLevelText, { color: LEVEL_COLORS[3] }]}>
              Maximum verification level achieved
            </Text>
          )}
        </View>
      </View>

      {unlockedBenefits.length > 0 && (
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Current Benefits</Text>
          <View style={styles.benefitsGrid}>
            {unlockedBenefits.map(renderBenefitCard)}
          </View>
          {lockedBenefitsCount > 0 && (
            <TouchableOpacity 
              style={styles.moreBenefitsButton}
              onPress={handleViewDetails}
              accessibilityLabel={`${lockedBenefitsCount} more benefits locked. Tap to view details`}
              accessibilityRole="button"
            >
              <Text style={styles.moreBenefitsText}>
                +{lockedBenefitsCount} more benefit{lockedBenefitsCount !== 1 ? 's' : ''} locked
              </Text>
              <ChevronRight size={16} color={Colors.neutral.gray500} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.level2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: Spacing.xs,
  },
  viewAllText: {
    ...Typography.bodySmall,
    color: Colors.primary.blue,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  progressPercentage: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  horizontalProgressContainer: {
    marginBottom: Spacing.md,
  },
  horizontalProgressBarBg: {
    height: 8,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  horizontalProgressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.xs,
  },
  levelIndicatorsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  levelIndicatorHorizontal: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  levelNumberHorizontal: {
    ...Typography.bodySmall,
    color: Colors.neutral.white,
    fontWeight: '700',
  },
  currentLevelDotHorizontal: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.neutral.white,
    borderWidth: 2,
    borderColor: Colors.neutral.gray300,
  },
  stepsProgress: {
    gap: Spacing.xs,
  },
  stepsCount: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  nextLevelText: {
    ...Typography.caption,
    color: Colors.neutral.gray600,
    fontStyle: 'italic',
  },
  benefitsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
    paddingTop: Spacing.lg,
  },
  benefitsTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  benefitsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  benefitCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.md,
    minHeight: 100,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  benefitName: {
    ...Typography.caption,
    color: Colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    flex: 1,
  },
  benefitLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  benefitLevelText: {
    ...Typography.caption,
    fontSize: 8,
    color: Colors.neutral.white,
    fontWeight: '700',
  },
  moreBenefitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  moreBenefitsText: {
    ...Typography.caption,
    color: Colors.neutral.gray500,
  },
});