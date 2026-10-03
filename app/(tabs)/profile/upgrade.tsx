import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Check,
  Crown,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Clock,
  HeadphonesIcon,
  BarChart,
  Lock,
  Award,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  popular?: boolean;
  features: string[];
  icon: any;
  color: string;
  bgColor: string;
}

const individualPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      'Up to KES 50,000 daily limit',
      'Join up to 3 groups',
      'Basic trust score',
      'Standard support',
      'Mobile app access',
    ],
    icon: Users,
    color: Colors.neutral.gray700,
    bgColor: Colors.neutral.gray100,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    period: 'month',
    popular: true,
    features: [
      'Up to KES 150,000 daily limit',
      'Join unlimited groups',
      'Advanced analytics & reports',
      'Priority support',
      'Trust score boost',
      'Lower transaction fees',
      'Custom notifications',
    ],
    icon: Crown,
    color: Colors.status.premiumPurple,
    bgColor: '#EDE9FE',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 1499,
    period: 'month',
    features: [
      'Unlimited daily transactions',
      'Create & manage groups',
      'Advanced analytics & insights',
      '24/7 priority support',
      'Maximum trust score boost',
      'Zero transaction fees',
      'Dedicated account manager',
      'API access',
    ],
    icon: Sparkles,
    color: Colors.primary.yellow,
    bgColor: '#FEF3C7',
  },
];

const organizationPlans: PricingPlan[] = [
  {
    id: 'business',
    name: 'Business',
    price: 4999,
    period: 'month',
    features: [
      'Up to 50 team members',
      'Unlimited transactions',
      'Multi-wallet management',
      'Advanced reporting',
      'API integration',
      'Priority support',
      'Compliance tools',
    ],
    icon: TrendingUp,
    color: Colors.status.securityBlue,
    bgColor: '#DBEAFE',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    period: 'custom',
    popular: true,
    features: [
      'Unlimited team members',
      'White-label solution',
      'Custom integrations',
      'Dedicated infrastructure',
      'SLA guarantees',
      '24/7 dedicated support',
      'Custom features',
      'On-premise deployment',
    ],
    icon: Award,
    color: Colors.status.verifiedGreen,
    bgColor: '#D1FAE5',
  },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'individual' | 'organization'>('individual');
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: selectedTab === 'individual' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [selectedTab, tabIndicatorAnim]);

  const tabIndicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const currentPlans = selectedTab === 'individual' ? individualPlans : organizationPlans;

  const handleSubscribe = (plan: PricingPlan) => {
    if (plan.id === 'free') {
      Alert.alert('Current Plan', 'You are already on the Free plan');
      return;
    }
    
    if (plan.period === 'custom') {
      Alert.alert('Contact Sales', 'Our team will contact you to discuss Enterprise solutions');
      return;
    }

    Alert.alert(
      'Subscribe to ' + plan.name,
      `Confirm subscription for KES ${plan.price}/${plan.period}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Subscribe', onPress: () => {
          Alert.alert('Success', 'Subscription activated successfully!');
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Upgrade Plan',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>
          Unlock powerful features and grow with TrustLoop
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setSelectedTab('individual')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'individual' && styles.tabTextActive,
            ]}>
              Individual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setSelectedTab('organization')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'organization' && styles.tabTextActive,
            ]}>
              Organization
            </Text>
          </TouchableOpacity>
          <Animated.View 
            style={[
              styles.tabIndicator,
              { transform: [{ translateX: tabIndicatorTranslate }] },
            ]} 
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {currentPlans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSubscribe={handleSubscribe}
            delay={index * 100}
          />
        ))}

        <Card style={styles.featuresComparisonCard}>
          <Text style={styles.comparisonTitle}>All Plans Include</Text>
          <View style={styles.comparisonList}>
            <ComparisonItem icon={Shield} text="Bank-level security" />
            <ComparisonItem icon={Lock} text="256-bit encryption" />
            <ComparisonItem icon={Clock} text="Instant transfers" />
            <ComparisonItem icon={BarChart} text="Transaction history" />
          </View>
        </Card>

        <Card style={styles.faqCard}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I change plans anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              We accept M-Pesa, bank transfers, and credit/debit cards.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a refund policy?</Text>
            <Text style={styles.faqAnswer}>
              Yes, we offer a 30-day money-back guarantee on all paid plans.
            </Text>
          </View>
        </Card>

        <TouchableOpacity 
          style={styles.contactSalesButton}
          activeOpacity={0.8}
          onPress={() => Alert.alert('Contact Sales', 'Our team will reach out to you shortly')}
        >
          <HeadphonesIcon size={20} color={Colors.primary.blue} />
          <Text style={styles.contactSalesText}>Need help choosing? Contact Sales</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function PlanCard({ 
  plan, 
  onSubscribe,
  delay 
}: { 
  plan: PricingPlan; 
  onSubscribe: (plan: PricingPlan) => void;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();
  }, [delay, fadeAnim, scaleAnim]);

  const Icon = plan.icon;

  return (
    <Animated.View style={{ 
      opacity: fadeAnim, 
      transform: [{ scale: scaleAnim }],
    }}>
      <Card style={[
        styles.planCard,
        plan.popular && styles.planCardPopular,
      ]}>
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Zap size={12} color={Colors.neutral.white} />
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: plan.bgColor }]}>
            <Icon size={32} color={plan.color} />
          </View>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.planPriceRow}>
              {plan.period === 'custom' ? (
                <Text style={styles.planCustomPrice}>Custom Pricing</Text>
              ) : (
                <>
                  <Text style={styles.planPrice}>
                    {plan.price === 0 ? 'Free' : `KES ${plan.price.toLocaleString()}`}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Check size={16} color={Colors.status.verifiedGreen} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[
            styles.subscribeButton,
            plan.popular && styles.subscribeButtonPopular,
          ]}
          onPress={() => onSubscribe(plan)}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.subscribeButtonText,
            plan.popular && styles.subscribeButtonTextPopular,
          ]}>
            {plan.id === 'free' ? 'Current Plan' : plan.period === 'custom' ? 'Contact Sales' : 'Subscribe Now'}
          </Text>
        </TouchableOpacity>
      </Card>
    </Animated.View>
  );
}

function ComparisonItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.comparisonItem}>
      <View style={styles.comparisonIcon}>
        <Icon size={16} color={Colors.primary.blue} />
      </View>
      <Text style={styles.comparisonText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  header: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  headerTitle: {
    ...Typography.displayMedium,
    color: Colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.neutral.white,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    width: 172,
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  planCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    position: 'relative',
  },
  planCardPopular: {
    borderWidth: 2,
    borderColor: Colors.primary.blue,
    ...Shadows.level3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary.blue,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  popularText: {
    ...Typography.caption,
    color: Colors.neutral.white,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.xs,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    ...Typography.displayMedium,
    fontSize: 28,
    color: Colors.neutral.gray900,
  },
  planPeriod: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginLeft: 4,
  },
  planCustomPrice: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  planFeatures: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  featureText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.gray200,
  },
  subscribeButtonPopular: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  subscribeButtonText: {
    ...Typography.bodyLarge,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  subscribeButtonTextPopular: {
    color: Colors.neutral.white,
  },
  featuresComparisonCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  comparisonTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.lg,
  },
  comparisonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  comparisonIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  comparisonText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
    flex: 1,
  },
  faqCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  faqTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.lg,
  },
  faqItem: {
    marginBottom: Spacing.lg,
  },
  faqQuestion: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  faqAnswer: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    lineHeight: 20,
  },
  contactSalesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary.blue,
  },
  contactSalesText: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  footer: {
    height: Spacing.lg,
  },
});
