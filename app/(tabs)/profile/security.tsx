import React, { useRef, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Info,
  Shield,
  Smartphone,
  Laptop,
  Lock,
  Fingerprint,
  ShieldCheck,
  Bell,
  History,
  Clock,
  Tablet,
  Globe,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { SectionHeader } from '@/components/myProfile/SectionHeader';
import { mockSecuritySessions, mockSecurityFeatures, mockSecurityTips } from '@/lib/mock_data/profileMocks/security';

export default function SecurityScreen() {
  const router = useRouter();
  const [securityScore] = useState(85);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [features, setFeatures] = useState(mockSecurityFeatures);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: securityScore,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, securityScore]);

  const progressRotation = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  const toggleFeature = (id: string) => {
    setFeatures(prev => 
      prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Security',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Info size={24} color={Colors.primary.blue} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.securityScoreBanner}>
          <View style={styles.scoreHeader}>
            <View style={styles.shieldIcon}>
              <Shield size={32} color={Colors.status.verifiedGreen} />
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreTitle}>Security Score: {securityScore}/100</Text>
              <Badge text="Strong" variant="success" style={styles.scoreBadge} />
            </View>
          </View>
          
          <View style={styles.progressRing}>
            <Animated.View 
              style={[
                styles.progressRingOuter,
                { transform: [{ rotate: progressRotation }] }
              ]}
            />
            <View style={styles.progressRingInner}>
              <Text style={styles.progressRingText}>{securityScore}%</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Active Sessions" actionText="Manage" onActionPress={() => {}} />
          
          {mockSecuritySessions.map((session, index) => (
            <SessionCard key={session.id} session={session} delay={index * 100} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Security Features" />
          
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard 
                key={feature.id} 
                feature={feature} 
                onToggle={() => toggleFeature(feature.id)}
                delay={index * 100}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Advanced Security" />
          
          <Card style={styles.advancedItem}>
            <View style={styles.advancedItemContent}>
              <History size={20} color={Colors.primary.blue} />
              <View style={styles.advancedItemText}>
                <Text style={styles.advancedItemTitle}>Login History</Text>
                <Text style={styles.advancedItemSubtitle}>View all logins</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.advancedItem}>
            <View style={styles.advancedItemContent}>
              <Clock size={20} color={Colors.primary.blue} />
              <View style={styles.advancedItemText}>
                <Text style={styles.advancedItemTitle}>Session Timeout</Text>
                <Text style={styles.advancedItemSubtitle}>15 minutes</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.advancedItem}>
            <View style={styles.advancedItemContent}>
              <Tablet size={20} color={Colors.primary.blue} />
              <View style={styles.advancedItemText}>
                <Text style={styles.advancedItemTitle}>Device Management</Text>
                <Text style={styles.advancedItemSubtitle}>3 devices</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.advancedItem}>
            <View style={styles.advancedItemContent}>
              <Globe size={20} color={Colors.primary.blue} />
              <View style={styles.advancedItemText}>
                <Text style={styles.advancedItemTitle}>IP Whitelisting</Text>
                <Text style={styles.advancedItemSubtitle}>Disabled</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Security Tips" />
          <Card>
            {mockSecurityTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>
        </View>

        <TouchableOpacity style={styles.emergencyButton} activeOpacity={0.8}>
          <AlertTriangle size={20} color={Colors.primary.red} />
          <Text style={styles.emergencyButtonText}>Emergency Lock Account</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function SessionCard({ session, delay }: { session: typeof mockSecuritySessions[0]; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  const DeviceIcon = session.deviceType === 'smartphone' ? Smartphone : Laptop;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionIcon}>
            <DeviceIcon size={20} color={Colors.primary.blue} />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDevice}>{session.deviceName}</Text>
            <Text style={styles.sessionLocation}>
              {session.isCurrent ? 'This device • ' : `${session.browser} • `}
              {session.location}
            </Text>
            <Text style={styles.sessionTime}>{session.lastActive}</Text>
          </View>
          {session.isCurrent ? (
            <View style={styles.activeIndicator} />
          ) : (
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.signOutButton}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

function FeatureCard({ 
  feature, 
  onToggle,
  delay 
}: { 
  feature: typeof mockSecurityFeatures[0]; 
  onToggle: () => void;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  const getIcon = () => {
    switch (feature.id) {
      case '1':
        return Lock;
      case '2':
        return Fingerprint;
      case '3':
        return ShieldCheck;
      case '4':
        return Bell;
      default:
        return Lock;
    }
  };

  const Icon = getIcon();

  return (
    <Animated.View style={[styles.featureCard, { opacity: fadeAnim }]}>
      <Card>
        <View style={styles.featureIcon}>
          <Icon size={24} color={Colors.primary.blue} />
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Switch
          value={feature.enabled}
          onValueChange={onToggle}
          trackColor={{ false: Colors.neutral.gray300, true: Colors.primary.blue }}
          thumbColor={Colors.neutral.white}
          style={styles.featureSwitch}
        />
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
        </TouchableOpacity>
      </Card>
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
  securityScoreBanner: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    width: '100%',
  },
  shieldIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.xs,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
  },
  progressRing: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRingOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: Colors.status.verifiedGreen,
    borderTopColor: Colors.neutral.gray200,
  },
  progressRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingText: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sessionCard: {
    marginBottom: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionLocation: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginBottom: 2,
  },
  sessionTime: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.status.verifiedGreen,
  },
  signOutButton: {
    ...Typography.bodySmall,
    color: Colors.primary.red,
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureCard: {
    width: '48%',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  featureSwitch: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  featureSubtitle: {
    ...Typography.bodySmall,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  advancedItem: {
    marginBottom: Spacing.md,
  },
  advancedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  advancedItemText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  advancedItemTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  advancedItemSubtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
    marginTop: 7,
    marginRight: Spacing.md,
  },
  tipText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    flex: 1,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary.red,
    marginTop: Spacing.md,
  },
  emergencyButtonText: {
    ...Typography.bodyLarge,
    color: Colors.primary.red,
    fontWeight: '600',
  },
  footer: {
    height: Spacing.lg,
  },
});
