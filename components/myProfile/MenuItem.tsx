import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';
import { Badge } from './Badge';

interface MenuItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';
  };
  onPress?: () => void;
  showChevron?: boolean;
}

export function MenuItem({ 
  icon: Icon, 
  title, 
  subtitle, 
  badge, 
  onPress,
  showChevron = true,
}: MenuItemProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.iconContainer}>
          <Icon size={24} color={Colors.primary.blue} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badge && (
              <Badge 
                text={badge.text} 
                variant={badge.variant} 
                style={styles.badge}
              />
            )}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {showChevron && (
          <ChevronRight size={20} color={Colors.neutral.gray300} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.bodyLarge,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginTop: 2,
  },
  badge: {
    marginLeft: Spacing.xs,
  },
});
