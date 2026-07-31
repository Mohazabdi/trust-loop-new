import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  BookOpen,
  Shield,
  CreditCard,
  Users,
  Settings,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { SectionHeader } from '@/components/myProfile/SectionHeader';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'To create an account, tap the "Sign Up" button on the welcome screen. Fill in your details, verify your phone number, and you\'re all set!',
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'How do I verify my identity?',
    answer: 'Go to Profile > Verification Status and follow the step-by-step process. You\'ll need your national ID and a recent utility bill or bank statement.',
  },
  {
    id: '3',
    category: 'Payments',
    question: 'What payment methods are supported?',
    answer: 'We support M-Pesa, bank transfers, debit/credit cards, and other mobile money services like Airtel Money.',
  },
  {
    id: '4',
    category: 'Payments',
    question: 'Are there transaction limits?',
    answer: 'Transaction limits depend on your verification level. Level 1: KES 50,000 daily, Level 2: KES 150,000 daily, Level 3: Unlimited.',
  },
  {
    id: '5',
    category: 'Groups',
    question: 'How do I join a group?',
    answer: 'You can join a group by accepting an invitation link from a group admin or by searching for public groups in the Groups tab.',
  },
  {
    id: '6',
    category: 'Groups',
    question: 'Can I create my own group?',
    answer: 'Yes! You need Level 2 verification or higher. Go to Groups > Create New Group and follow the setup wizard.',
  },
  {
    id: '7',
    category: 'Security',
    question: 'How is my money protected?',
    answer: 'All funds are held in segregated accounts, encrypted with bank-level 256-bit SSL encryption. We also use 2FA and biometric authentication.',
  },
  {
    id: '8',
    category: 'Security',
    question: 'What is a Trust Score?',
    answer: 'Trust Score measures your reliability based on payment history, group participation, and peer feedback. A higher score unlocks better features.',
  },
  {
    id: '9',
    category: 'Account',
    question: 'How do I reset my PIN?',
    answer: 'Go to Profile > Security > PIN Protection > Change PIN. You\'ll need to verify your identity via OTP.',
  },
  {
    id: '10',
    category: 'Account',
    question: 'Can I have multiple wallets?',
    answer: 'Yes! You can create multiple wallets for different purposes like personal, business, or savings.',
  },
];

const categories = Array.from(new Set(faqs.map(faq => faq.category)));

export default function HelpCenterScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Help Center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.searchCard}>
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.neutral.gray700} />
            <Text style={styles.searchInput}>
              {searchQuery || 'Search for help...'}
            </Text>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('tel:+254700000000')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Phone size={24} color={Colors.status.securityBlue} />
              </View>
              <Text style={styles.quickActionText}>Call Support</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('mailto:support@trustloop.com')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Mail size={24} color={Colors.primary.yellow} />
              </View>
              <Text style={styles.quickActionText}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
                <MessageCircle size={24} color={Colors.status.verifiedGreen} />
              </View>
              <Text style={styles.quickActionText}>Live Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('https://trustloop.com/docs')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
                <BookOpen size={24} color={Colors.status.premiumPurple} />
              </View>
              <Text style={styles.quickActionText}>Documentation</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Categories" />
          <View style={styles.categoriesContainer}>
            <TouchableOpacity 
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Frequently Asked Questions" />
          {filteredFAQs.map((faq, index) => (
            <FAQItem 
              key={faq.id}
              faq={faq}
              isExpanded={expandedFAQ === faq.id}
              onToggle={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              delay={index * 50}
            />
          ))}
          
          {filteredFAQs.length === 0 && (
            <Card style={styles.emptyState}>
              <HelpCircle size={48} color={Colors.neutral.gray300} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or browse all categories
              </Text>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Popular Guides" />
          <GuideCard 
            icon={Shield}
            title="Security Best Practices"
            description="Learn how to keep your account secure"
            onPress={() => {}}
          />
          <GuideCard 
            icon={CreditCard}
            title="Understanding Transaction Limits"
            description="Learn about limits and how to increase them"
            onPress={() => {}}
          />
          <GuideCard 
            icon={Users}
            title="Managing Your Groups"
            description="Complete guide to group features"
            onPress={() => {}}
          />
          <GuideCard 
            icon={Settings}
            title="Account Settings Guide"
            description="Customize your account preferences"
            onPress={() => {}}
          />
        </View>

        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is available 24/7 to assist you
          </Text>
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function FAQItem({ 
  faq, 
  isExpanded, 
  onToggle,
  delay 
}: { 
  faq: FAQ; 
  isExpanded: boolean; 
  onToggle: () => void;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  useEffect(() => {
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
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <Card style={styles.faqCard}>
          <View style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <ChevronDown size={20} color={Colors.neutral.gray700} />
            </Animated.View>
          </View>
          
          {isExpanded && (
            <View style={styles.faqAnswer}>
              <Text style={styles.faqAnswerText}>{faq.answer}</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GuideCard({ 
  icon: Icon, 
  title, 
  description, 
  onPress 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.guideCard}>
        <View style={styles.guideIcon}>
          <Icon size={24} color={Colors.primary.blue} />
        </View>
        <View style={styles.guideContent}>
          <Text style={styles.guideTitle}>{title}</Text>
          <Text style={styles.guideDescription}>{description}</Text>
        </View>
        <ExternalLink size={20} color={Colors.neutral.gray700} />
      </Card>
    </TouchableOpacity>
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
  searchCard: {
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  searchInput: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickAction: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quickActionText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  categoryChipText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.neutral.white,
  },
  faqCard: {
    marginBottom: Spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.md,
  },
  faqAnswer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
  },
  faqAnswerText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  guideIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  guideDescription: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  contactCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary.blue,
  },
  contactTitle: {
    ...Typography.heading2,
    color: Colors.neutral.white,
    marginBottom: Spacing.xs,
  },
  contactSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: Spacing.lg,
  },
  contactButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
  },
  contactButtonText: {
    ...Typography.bodyLarge,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  footer: {
    height: Spacing.lg,
  },
});
