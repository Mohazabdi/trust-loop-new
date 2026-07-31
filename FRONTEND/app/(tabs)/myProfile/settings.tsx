import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Search,
  Bell,
  Globe,
  Eye,
  UserCheck,
  Crown,
  HelpCircle,
  FileText,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { mockUser } from '@/lib/mock_data/profileMocks/user';
//import { mockUser } from '@/lib/mocks_data/profileMocks/user';

interface SettingItem {
  icon: any;
  title: string;
  subtitle: string;
  badge?: { text: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium' };
  route?: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const settingsSections: SettingSection[] = [
  {
    title: 'Preferences',
    items: [
      {
        icon: Bell,
        title: 'Notifications',
        subtitle: 'Alerts, quiet hours',
        route: '/notifications',
      },
      {
        icon: Globe,
        title: 'App Preferences',
        subtitle: 'Language, theme, currency',
      },
      {
        icon: Eye,
        title: 'Privacy',
        subtitle: 'Data sharing, visibility',
      },
    ],
  },
  {
    title: 'Services',
    items: [
      {
        icon: UserCheck,
        title: 'Verification',
        subtitle: 'ID verification status',
        badge: { text: 'Level 2', variant: 'success' },
        route: '/verification',
      },
      {
        icon: Crown,
        title: 'Subscription',
        subtitle: 'Upgrade plan, features',
        badge: { text: 'Free', variant: 'neutral' },
        route: '/upgrade',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        icon: HelpCircle,
        title: 'Help Center',
        subtitle: 'FAQs, guides, support',
        route: '/help',
      },
      {
        icon: FileText,
        title: 'Legal',
        subtitle: 'Terms, privacy, compliance',
        route: '/terms',
      },
      {
        icon: Info,
        title: 'About',
        subtitle: 'Version 1.0.0, Trust-Loop',
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Preferences']);
  const [searchVisible, setSearchVisible] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Settings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setSearchVisible(!searchVisible)} 
              style={styles.headerButton}
            >
              <Search size={24} color={Colors.primary.blue} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileQuickView}>
          <View style={styles.profileRow}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{mockUser.avatar}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{mockUser.name}</Text>
                {mockUser.isVerified && (
                  <View style={styles.verifiedBadgeSmall}>
                    <UserCheck size={12} color={Colors.status.verifiedGreen} />
                  </View>
                )}
              </View>
              <Text style={styles.profileEmail}>{mockUser.email}</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.editProfileButton}>Edit Profile</Text>
          </TouchableOpacity>
        </Card>

        {settingsSections.map((section, index) => (
          <SettingsSectionComponent
            key={section.title}
            section={section}
            isExpanded={expandedSections.includes(section.title)}
            onToggle={() => toggleSection(section.title)}
            delay={index * 100}
          />
        ))}

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>Version 1.0.0 • © 2024 Trust-Loop</Text>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function SettingsSectionComponent({ 
  section, 
  isExpanded, 
  onToggle,
  delay,
}: { 
  section: SettingSection; 
  isExpanded: boolean; 
  onToggle: () => void;
  delay: number;
}) {
  const router = useRouter();
  const heightAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: isExpanded ? 1 : 0,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [isExpanded, heightAnim, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronRight size={20} color={Colors.neutral.gray700} />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.sectionItems}>
          {section.items.map((item, index) => (
            <SettingItemComponent 
              key={item.title} 
              item={item} 
              delay={delay + index * 50}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                }
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function SettingItemComponent({ 
  item, 
  delay,
  onPress,
}: { 
  item: SettingItem; 
  delay: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

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

  const Icon = item.icon;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View 
          style={[
            styles.settingItem,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View style={styles.settingIconContainer}>
            <Icon size={20} color={Colors.primary.blue} />
          </View>
          
          <View style={styles.settingContent}>
            <View style={styles.settingTitleRow}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.badge && (
                <Badge 
                  text={item.badge.text} 
                  variant={item.badge.variant} 
                />
              )}
            </View>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>

          <ChevronRight size={20} color={Colors.neutral.gray300} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  profileQuickView: {
    marginBottom: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarSmall: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarSmallText: {
    ...Typography.heading1,
    color: Colors.neutral.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  profileName: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  verifiedBadgeSmall: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmail: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
  },
  editProfileButton: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  sectionItems: {
    gap: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  settingTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  settingSubtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  versionText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  footer: {
    height: Spacing.lg,
  },
});
