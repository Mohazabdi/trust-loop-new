import React, { useState, useRef, useEffect } from 'react';
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
  Plus,
  Eye,
  EyeOff,
  Phone,
  Building,
  CreditCard,
  Smartphone,
  Star,
  MoreHorizontal,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { SectionHeader } from '@/components/myProfile/SectionHeader';
import { mockPaymentMethods, mockTransactionLimits, mockTotalBalance } from '@/lib/mock_data/profileMocks/payments';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const toggleBalanceVisibility = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setBalanceVisible(!balanceVisible);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Payment Methods',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Plus size={24} color={Colors.primary.blue} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Card style={styles.balanceHeroCard}>
            <View style={styles.balanceGradient}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceHeroLabel}>Total Portfolio Value</Text>
                <TouchableOpacity 
                  onPress={toggleBalanceVisibility}
                  activeOpacity={0.7}
                  style={styles.eyeButton}
                >
                  {balanceVisible ? (
                    <Eye size={20} color={Colors.neutral.white} />
                  ) : (
                    <EyeOff size={20} color={Colors.neutral.white} />
                  )}
                </TouchableOpacity>
              </View>
              
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.balanceHeroAmount}>
                  {balanceVisible 
                    ? `KES ${mockTotalBalance.toLocaleString()}` 
                    : '••••••••'
                  }
                </Text>
              </Animated.View>

              <View style={styles.balanceChange}>
                <TrendingUp size={16} color={'#10B981'} />
                <Text style={styles.balanceChangeText}>+12.5% this month</Text>
              </View>
            </View>
          </Card>

          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>3</Text>
              <Text style={styles.quickStatLabel}>Active Methods</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>98%</Text>
              <Text style={styles.quickStatLabel}>Success Rate</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <CheckCircle size={20} color={Colors.status.verifiedGreen} />
              <Text style={styles.quickStatLabel}>All Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.defaultMethodHeader}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Star size={20} color={Colors.primary.yellow} />
            </Animated.View>
            <Text style={styles.defaultMethodTitle}>Primary Payment Method</Text>
          </View>
          
          <TouchableOpacity activeOpacity={0.9}>
            <Card style={styles.defaultMethodCard}>
              <View style={styles.defaultMethodContent}>
                <View style={styles.defaultMethodLeft}>
                  <View style={[styles.methodIconLarge, { backgroundColor: '#D1FAE5' }]}>
                    <Phone size={28} color={Colors.status.verifiedGreen} />
                  </View>
                  <View style={styles.defaultMethodInfo}>
                    <Text style={styles.defaultMethodName}>M-Pesa</Text>
                    <Text style={styles.defaultMethodNumber}>{mockPaymentMethods.mpesa[0].number}</Text>
                    <View style={styles.defaultMethodBadges}>
                      <Badge text="Verified" variant="success" />
                      <Badge text="Primary" variant="info" />
                    </View>
                  </View>
                </View>
                <View style={styles.defaultMethodRight}>
                  <Text style={styles.defaultMethodLimit}>KES 150K</Text>
                  <Text style={styles.defaultMethodLimitLabel}>Daily Limit</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.changeDefaultLink}>Change Primary Method</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <SectionHeader 
            title="Mobile Money" 
            actionText="+ Add"
            onActionPress={() => {}}
          />
          
          {mockPaymentMethods.mpesa.map((method, index) => (
            <MPesaMethodCard key={method.id} method={method} delay={index * 80} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader 
            title="Bank Accounts" 
            actionText="+ Link"
            onActionPress={() => {}}
          />
          
          {mockPaymentMethods.banks.map((bank, index) => (
            <BankMethodCard key={bank.id} bank={bank} delay={index * 80} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader 
            title="Payment Cards" 
            actionText="+ Add"
            onActionPress={() => {}}
          />
          
          {mockPaymentMethods.cards.map((card, index) => (
            <CardMethodCard key={card.id} card={card} delay={index * 80} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Transaction Limits" />
          
          <Card style={styles.limitsCard}>
            {mockTransactionLimits.map((limit, index) => (
              <View key={index} style={styles.limitRow}>
                <View style={styles.limitInfo}>
                  <Text style={styles.limitType}>{limit.type}</Text>
                  <View style={styles.limitBar}>
                    <View style={[styles.limitBarFill, { width: '65%' }]} />
                  </View>
                </View>
                <View style={styles.limitValues}>
                  <Text style={styles.limitAmount}>KES {limit.limit.toLocaleString()}</Text>
                  <Text style={styles.limitUsed}>65% used</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <Card style={styles.securityNote}>
          <Shield size={24} color={Colors.status.verifiedGreen} />
          <View style={styles.securityNoteContent}>
            <Text style={styles.securityNoteTitle}>Bank-level Security</Text>
            <Text style={styles.securityNoteText}>
              All payment data is encrypted with 256-bit SSL encryption
            </Text>
          </View>
        </Card>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function MPesaMethodCard({ method, delay }: { method: typeof mockPaymentMethods.mpesa[0]; delay: number }) {
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

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.9}>
        <Card style={styles.methodCard}>
          <View style={styles.methodRow}>
            <View style={[styles.methodIcon, { backgroundColor: '#D1FAE5' }]}>
              <Phone size={24} color={Colors.status.verifiedGreen} />
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>{method.number}</Text>
                {method.isDefault && <Star size={14} color={Colors.primary.yellow} />}
              </View>
              <Text style={styles.methodSubtitle}>
                {method.verified ? 'Verified' : 'Pending verification'}
              </Text>
              {method.verified && (
                <Text style={styles.methodLimit}>Daily: KES {method.dailyLimit.toLocaleString()}</Text>
              )}
              {!method.verified && (
                <TouchableOpacity style={styles.verifyButtonSmall} activeOpacity={0.8}>
                  <Text style={styles.verifyButtonSmallText}>Verify Now</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MoreHorizontal size={20} color={Colors.neutral.gray700} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

function BankMethodCard({ bank, delay }: { bank: typeof mockPaymentMethods.banks[0]; delay: number }) {
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

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.9}>
        <Card style={styles.methodCard}>
          <View style={styles.methodRow}>
            <View style={[styles.methodIcon, { backgroundColor: '#DBEAFE' }]}>
              <Building size={24} color={Colors.status.securityBlue} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{bank.name}</Text>
              <Text style={styles.methodSubtitle}>{bank.accountName}</Text>
              <Text style={styles.methodAccount}>•••• {bank.accountNumber.slice(-4)}</Text>
              {bank.verified && <Badge text="Verified" variant="success" style={styles.badgeInline} />}
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MoreHorizontal size={20} color={Colors.neutral.gray700} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CardMethodCard({ card, delay }: { card: typeof mockPaymentMethods.cards[0]; delay: number }) {
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

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.9}>
        <Card style={styles.cardMethodCard}>
          <View style={styles.cardMethodGradient}>
            <View style={styles.cardMethodHeader}>
              <Text style={styles.cardMethodType}>{card.type}</Text>
              <CreditCard size={32} color={Colors.neutral.white} />
            </View>
            <Text style={styles.cardMethodNumber}>•••• •••• •••• {card.last4}</Text>
            <View style={styles.cardMethodFooter}>
              <View>
                <Text style={styles.cardMethodLabel}>Cardholder</Text>
                <Text style={styles.cardMethodValue}>{card.cardholderName}</Text>
              </View>
              <View>
                <Text style={styles.cardMethodLabel}>Expires</Text>
                <Text style={styles.cardMethodValue}>{card.expiryDate}</Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  balanceHeroCard: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: Spacing.xl,
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceHeroLabel: {
    ...Typography.bodyMedium,
    color: Colors.neutral.white,
    opacity: 0.9,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  balanceHeroAmount: {
    ...Typography.displayLarge,
    fontSize: 36,
    color: Colors.neutral.white,
    marginBottom: Spacing.sm,
  },
  balanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceChangeText: {
    ...Typography.bodyMedium,
    color: '#10B981',
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.level1,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
    marginBottom: 2,
  },
  quickStatLabel: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    textAlign: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.neutral.gray200,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  defaultMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  defaultMethodTitle: {
    ...Typography.bodyLarge,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  defaultMethodCard: {
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primary.yellow,
    ...Shadows.level2,
  },
  defaultMethodContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  defaultMethodLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  methodIconLarge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  defaultMethodInfo: {
    flex: 1,
  },
  defaultMethodName: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: 2,
  },
  defaultMethodNumber: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginBottom: Spacing.sm,
  },
  defaultMethodBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  defaultMethodRight: {
    alignItems: 'flex-end',
  },
  defaultMethodLimit: {
    ...Typography.heading2,
    color: Colors.primary.blue,
    marginBottom: 2,
  },
  defaultMethodLimitLabel: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  changeDefaultLink: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
    textAlign: 'center',
  },
  methodCard: {
    marginBottom: Spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  methodTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  methodSubtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginTop: 2,
  },
  methodLimit: {
    ...Typography.bodySmall,
    color: Colors.primary.blue,
    marginTop: 2,
    fontWeight: '600',
  },
  methodAccount: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  badgeInline: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  verifyButtonSmall: {
    marginTop: Spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
  },
  verifyButtonSmallText: {
    ...Typography.bodySmall,
    color: Colors.neutral.white,
    fontWeight: '600',
  },
  moreButton: {
    padding: Spacing.sm,
  },
  cardMethodCard: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  cardMethodGradient: {
    padding: Spacing.lg,
    backgroundColor: '#7C3AED',
    borderRadius: BorderRadius.md,
  },
  cardMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardMethodType: {
    ...Typography.bodyMedium,
    color: Colors.neutral.white,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardMethodNumber: {
    ...Typography.heading1,
    fontSize: 22,
    color: Colors.neutral.white,
    marginBottom: Spacing.lg,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  cardMethodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMethodLabel: {
    ...Typography.bodySmall,
    color: Colors.neutral.white,
    opacity: 0.7,
    marginBottom: 2,
  },
  cardMethodValue: {
    ...Typography.bodyMedium,
    color: Colors.neutral.white,
    fontWeight: '600',
  },
  limitsCard: {
    padding: Spacing.lg,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  limitInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  limitType: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  limitBar: {
    height: 6,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.xs,
  },
  limitValues: {
    alignItems: 'flex-end',
  },
  limitAmount: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  limitUsed: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: Colors.status.verifiedGreen,
  },
  securityNoteContent: {
    flex: 1,
  },
  securityNoteTitle: {
    ...Typography.bodyMedium,
    color: Colors.status.verifiedGreen,
    fontWeight: '600',
    marginBottom: 2,
  },
  securityNoteText: {
    ...Typography.bodySmall,
    color: Colors.status.verifiedGreen,
  },
  footer: {
    height: Spacing.lg,
  },
});
