import React, { useRef, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
  Users,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Download,
  Share2,
  Lightbulb,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { SectionHeader } from '@/components/myProfile/SectionHeader';
// import { Card } from '@/components/';
// import { Badge } from '@/lib/components/Badge';
// import { SectionHeader } from '@/lib/components/SectionHeader';

const screenWidth = Dimensions.get('window').width;

interface ScoreFactor {
  id: string;
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
  status: 'good' | 'warning' | 'critical';
}

const mockScoreFactors: ScoreFactor[] = [
  {
    id: '1',
    name: 'Contribution Consistency',
    weight: 30,
    score: 27,
    maxScore: 30,
    description: 'Regular and timely contributions to group funds',
    status: 'good',
  },
  {
    id: '2',
    name: 'Payment Timeliness',
    weight: 25,
    score: 22,
    maxScore: 25,
    description: 'On-time payment history',
    status: 'good',
  },
  {
    id: '3',
    name: 'Group Participation',
    weight: 20,
    score: 16,
    maxScore: 20,
    description: 'Active engagement in group activities',
    status: 'warning',
  },
  {
    id: '4',
    name: 'Peer Feedback',
    weight: 15,
    score: 13,
    maxScore: 15,
    description: 'Positive reviews from group members',
    status: 'good',
  },
  {
    id: '5',
    name: 'Penalties/Defaults',
    weight: 10,
    score: 7,
    maxScore: 10,
    description: 'History of missed payments or disputes',
    status: 'warning',
  },
];

const mockHistoricalData = [
  { month: 'Jun', score: 72 },
  { month: 'Jul', score: 74 },
  { month: 'Aug', score: 71 },
  { month: 'Sep', score: 76 },
  { month: 'Oct', score: 78 },
  { month: 'Nov', score: 81 },
  { month: 'Dec', score: 85 },
];

const mockInsights = [
  {
    id: '1',
    type: 'positive',
    title: 'Excellent payment streak',
    description: 'You have made 12 consecutive on-time payments',
    icon: CheckCircle,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Increase group participation',
    description: 'Attending more meetings can boost your score by 4 points',
    icon: AlertCircle,
  },
  {
    id: '3',
    type: 'tip',
    title: 'Set up auto-contributions',
    description: 'Automate payments to maintain consistency',
    icon: Lightbulb,
  },
];

const mockKeyEvents = [
  { month: 'Jul', event: 'Joined Family Investment Group', score: 74 },
  { month: 'Sep', event: 'Completed 6-month cycle', score: 76 },
  { month: 'Nov', event: 'Peer endorsement received', score: 81 },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'breakdown' | 'insights'>('overview');
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const position = selectedTab === 'overview' ? 0 : selectedTab === 'breakdown' ? 1 : 2;
    Animated.spring(tabIndicatorAnim, {
      toValue: position,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [selectedTab, tabIndicatorAnim]);

  const tabIndicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, (screenWidth - Spacing.md * 2) / 3, ((screenWidth - Spacing.md * 2) / 3) * 2],
  });

  const currentScore = 85;
  const previousScore = 81;
  const scoreTrend = currentScore > previousScore ? 'up' : currentScore < previousScore ? 'down' : 'stable';

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Trust Score Analytics',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setSelectedTab('overview')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setSelectedTab('breakdown')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selectedTab === 'breakdown' && styles.tabTextActive]}>
              Breakdown
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setSelectedTab('insights')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selectedTab === 'insights' && styles.tabTextActive]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>
        <Animated.View 
          style={[
            styles.tabIndicator,
            { 
              transform: [{ translateX: tabIndicatorTranslate }],
              width: (screenWidth - Spacing.md * 2) / 3,
            }
          ]} 
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollAnim } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {selectedTab === 'overview' && (
          <>
            <Card style={styles.scoreOverviewCard}>
              <View style={styles.scoreHeader}>
                <View>
                  <Text style={styles.scoreLabel}>Current Trust Score</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreValue}>{currentScore}</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                  </View>
                </View>
                <View style={styles.scoreTrend}>
                  {scoreTrend === 'up' && <TrendingUp size={24} color={Colors.status.verifiedGreen} />}
                  {scoreTrend === 'down' && <TrendingDown size={24} color={Colors.primary.red} />}
                  {scoreTrend === 'stable' && <Minus size={24} color={Colors.neutral.gray700} />}
                  <Text style={[
                    styles.scoreTrendText,
                    scoreTrend === 'up' && styles.scoreTrendUp,
                    scoreTrend === 'down' && styles.scoreTrendDown,
                  ]}>
                    {scoreTrend === 'up' && '+'}
                    {currentScore - previousScore} pts
                  </Text>
                </View>
              </View>

              <View style={styles.tierBadgeContainer}>
                <Badge text="Premium Tier" variant="premium" />
                <Text style={styles.tierDescription}>
                  Excellent standing • Top 15% of users
                </Text>
              </View>
            </Card>

            <View style={styles.section}>
              <SectionHeader title="Score History" />
              <Card>
                <View style={styles.chartContainer}>
                  {mockHistoricalData.map((data, index) => {
                    const height = (data.score / 100) * 150;
                    return (
                      <View key={index} style={styles.chartBar}>
                        <View style={styles.chartBarContainer}>
                          <View style={[styles.chartBarFill, { height }]} />
                        </View>
                        <Text style={styles.chartLabel}>{data.month}</Text>
                        <Text style={styles.chartValue}>{data.score}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.keyEvents}>
                  <Text style={styles.keyEventsTitle}>Key Events</Text>
                  {mockKeyEvents.map((event, index) => (
                    <View key={index} style={styles.keyEventItem}>
                      <View style={styles.keyEventDot} />
                      <View style={styles.keyEventContent}>
                        <Text style={styles.keyEventMonth}>{event.month}</Text>
                        <Text style={styles.keyEventText}>{event.event}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Quick Stats" />
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <Clock size={24} color={Colors.primary.blue} />
                  <Text style={styles.statValue}>12</Text>
                  <Text style={styles.statLabel}>Months Active</Text>
                </Card>
                <Card style={styles.statCard}>
                  <DollarSign size={24} color={Colors.status.verifiedGreen} />
                  <Text style={styles.statValue}>98%</Text>
                  <Text style={styles.statLabel}>Payment Rate</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Users size={24} color={Colors.status.premiumPurple} />
                  <Text style={styles.statValue}>3</Text>
                  <Text style={styles.statLabel}>Groups</Text>
                </Card>
                <Card style={styles.statCard}>
                  <MessageCircle size={24} color={Colors.primary.yellow} />
                  <Text style={styles.statValue}>4.8</Text>
                  <Text style={styles.statLabel}>Peer Rating</Text>
                </Card>
              </View>
            </View>
          </>
        )}

        {selectedTab === 'breakdown' && (
          <>
            <View style={styles.section}>
              <SectionHeader title="Score Components" />
              {mockScoreFactors.map((factor, index) => (
                <ScoreFactorCard key={factor.id} factor={factor} delay={index * 100} />
              ))}
            </View>

            <Card style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Score</Text>
              <Text style={styles.totalValue}>{currentScore}/100</Text>
              <View style={styles.totalProgressBar}>
                <View style={[styles.totalProgressFill, { width: `${currentScore}%` }]} />
              </View>
            </Card>
          </>
        )}

        {selectedTab === 'insights' && (
          <>
            <View style={styles.section}>
              <SectionHeader title="Personalized Insights" />
              {mockInsights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} delay={index * 100} />
              ))}
            </View>

            <View style={styles.section}>
              <SectionHeader title="Recommendations" />
              <Card>
                <View style={styles.recommendation}>
                  <View style={styles.recommendationIcon}>
                    <CheckCircle size={20} color={Colors.status.verifiedGreen} />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Maintain your payment streak
                    </Text>
                    <Text style={styles.recommendationText}>
                      Continue making on-time contributions to keep your high score
                    </Text>
                  </View>
                </View>

                <View style={styles.recommendation}>
                  <View style={styles.recommendationIcon}>
                    <Users size={20} color={Colors.primary.blue} />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Participate in group meetings
                    </Text>
                    <Text style={styles.recommendationText}>
                      Active participation can increase your score by 4-5 points
                    </Text>
                  </View>
                </View>

                <View style={styles.recommendation}>
                  <View style={styles.recommendationIcon}>
                    <MessageCircle size={20} color={Colors.primary.yellow} />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Request peer endorsements
                    </Text>
                    <Text style={styles.recommendationText}>
                      Positive feedback from group members builds credibility
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Download Reports" />
              <Card>
                <TouchableOpacity style={styles.reportButton} activeOpacity={0.7}>
                  <Download size={20} color={Colors.primary.blue} />
                  <Text style={styles.reportButtonText}>Download Summary Report</Text>
                </TouchableOpacity>
                <View style={styles.reportDivider} />
                <TouchableOpacity style={styles.reportButton} activeOpacity={0.7}>
                  <Download size={20} color={Colors.primary.blue} />
                  <Text style={styles.reportButtonText}>Download Detailed Report</Text>
                </TouchableOpacity>
                <View style={styles.reportDivider} />
                <TouchableOpacity style={styles.reportButton} activeOpacity={0.7}>
                  <Share2 size={20} color={Colors.primary.blue} />
                  <Text style={styles.reportButtonText}>Share Score</Text>
                </TouchableOpacity>
              </Card>
            </View>
          </>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function ScoreFactorCard({ factor, delay }: { factor: ScoreFactor; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  const percentage = (factor.score / factor.maxScore) * 100;
  const statusColor = 
    factor.status === 'good' ? Colors.status.verifiedGreen :
    factor.status === 'warning' ? Colors.primary.yellow :
    Colors.primary.red;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.factorCard}>
        <View style={styles.factorHeader}>
          <View style={styles.factorInfo}>
            <Text style={styles.factorName}>{factor.name}</Text>
            <Text style={styles.factorDescription}>{factor.description}</Text>
          </View>
          <View style={styles.factorScore}>
            <Text style={styles.factorScoreValue}>{factor.score}</Text>
            <Text style={styles.factorScoreMax}>/{factor.maxScore}</Text>
          </View>
        </View>

        <View style={styles.factorProgressContainer}>
          <View style={styles.factorProgressBar}>
            <View 
              style={[
                styles.factorProgressFill, 
                { width: `${percentage}%`, backgroundColor: statusColor }
              ]} 
            />
          </View>
          <Text style={styles.factorWeight}>Weight: {factor.weight}%</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

function InsightCard({ insight, delay }: { insight: typeof mockInsights[0]; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  const Icon = insight.icon;
  const iconColor = 
    insight.type === 'positive' ? Colors.status.verifiedGreen :
    insight.type === 'warning' ? Colors.primary.yellow :
    Colors.primary.blue;

  const bgColor = 
    insight.type === 'positive' ? '#D1FAE5' :
    insight.type === 'warning' ? '#FEF3C7' :
    '#DBEAFE';

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.insightCard}>
        <View style={[styles.insightIcon, { backgroundColor: bgColor }]}>
          <Icon size={24} color={iconColor} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightDescription}>{insight.description}</Text>
        </View>
      </Card>
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
  tabContainer: {
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  tabIndicator: {
    height: 3,
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  scoreOverviewCard: {
    marginBottom: Spacing.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  scoreLabel: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginBottom: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    ...Typography.displayLarge,
    color: Colors.neutral.gray900,
  },
  scoreMax: {
    ...Typography.heading2,
    color: Colors.neutral.gray700,
    marginLeft: 2,
  },
  scoreTrend: {
    alignItems: 'center',
  },
  scoreTrendText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreTrendUp: {
    color: Colors.status.verifiedGreen,
  },
  scoreTrendDown: {
    color: Colors.primary.red,
  },
  tierBadgeContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
  },
  tierDescription: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: Spacing.lg,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '70%',
    height: 150,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: Colors.primary.blue,
    borderTopLeftRadius: BorderRadius.xs,
    borderTopRightRadius: BorderRadius.xs,
  },
  chartLabel: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginTop: Spacing.xs,
  },
  chartValue: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginTop: 2,
  },
  keyEvents: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
  },
  keyEventsTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  keyEventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  keyEventDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
    marginTop: 6,
    marginRight: Spacing.md,
  },
  keyEventContent: {
    flex: 1,
  },
  keyEventMonth: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    fontWeight: '600',
  },
  keyEventText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    ...Typography.displayMedium,
    color: Colors.neutral.gray900,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    textAlign: 'center',
  },
  factorCard: {
    marginBottom: Spacing.md,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  factorInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  factorName: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  factorDescription: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  factorScore: {
    alignItems: 'flex-end',
  },
  factorScoreValue: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
  },
  factorScoreMax: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
  },
  factorProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  factorProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
  },
  factorProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.xs,
  },
  factorWeight: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    fontWeight: '600',
  },
  totalCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    ...Typography.bodyLarge,
    color: Colors.neutral.gray700,
    marginBottom: Spacing.sm,
  },
  totalValue: {
    ...Typography.displayLarge,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.md,
  },
  totalProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  totalProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.sm,
  },
  insightCard: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  insightDescription: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  recommendation: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendationText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  reportButtonText: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  reportDivider: {
    height: 1,
    backgroundColor: Colors.neutral.gray200,
  },
  footer: {
    height: Spacing.lg,
  },
});
