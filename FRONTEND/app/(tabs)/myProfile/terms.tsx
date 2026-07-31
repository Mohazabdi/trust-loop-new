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
  FileText,
  Shield,
  Lock,
  Eye,
  CheckCircle,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';

const termsContent = `
Last Updated: December 2024

1. ACCEPTANCE OF TERMS
By accessing and using TrustLoop, you accept and agree to be bound by the terms and provision of this agreement.

2. USE LICENSE
Permission is granted to temporarily download one copy of the materials on TrustLoop's mobile application for personal, non-commercial transitory viewing only.

3. DISCLAIMER
The materials on TrustLoop's application are provided on an 'as is' basis. TrustLoop makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

4. LIMITATIONS
In no event shall TrustLoop or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TrustLoop's application.

5. ACCURACY OF MATERIALS
The materials appearing on TrustLoop's application could include technical, typographical, or photographic errors. TrustLoop does not warrant that any of the materials on its application are accurate, complete or current.

6. FINANCIAL TRANSACTIONS
All financial transactions conducted through TrustLoop are subject to verification and approval. TrustLoop reserves the right to refuse or cancel any transaction at its discretion.

7. USER CONDUCT
You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.

8. MODIFICATIONS
TrustLoop may revise these terms of service at any time without notice. By using this application you are agreeing to be bound by the then current version of these terms of service.
`;

const privacyContent = `
Last Updated: December 2024

1. INFORMATION WE COLLECT
We collect information you provide directly to us, including:
- Personal identification information (Name, email, phone number)
- Financial information (Bank accounts, transaction history)
- Identity verification documents (National ID, utility bills)
- Device information and usage data

2. HOW WE USE YOUR INFORMATION
We use the information we collect to:
- Provide, maintain, and improve our services
- Process transactions and send related information
- Send technical notices, updates, and support messages
- Respond to your comments, questions, and requests
- Monitor and analyze trends and usage
- Detect, prevent, and address fraud and security issues

3. INFORMATION SHARING
We do not sell your personal information. We may share your information:
- With your consent
- To comply with legal obligations
- With service providers who perform services on our behalf
- In connection with a business transfer or acquisition

4. DATA SECURITY
We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

5. DATA RETENTION
We retain your information for as long as necessary to provide our services and comply with legal obligations.

6. YOUR RIGHTS
You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your information
- Object to processing of your information
- Export your data

7. COOKIES AND TRACKING
We use cookies and similar tracking technologies to collect and track information about your use of our services.

8. THIRD-PARTY LINKS
Our service may contain links to third-party websites. We are not responsible for the privacy practices of these websites.

9. CHILDREN'S PRIVACY
Our service is not directed to individuals under 18. We do not knowingly collect personal information from children.

10. CHANGES TO THIS POLICY
We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.

11. CONTACT US
If you have questions about this privacy policy, please contact us at privacy@trustloop.com
`;

export default function TermsScreen() {
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const handleAccept = () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      return;
    }

    setShowToast(true);
    Animated.sequence([
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
      setTimeout(() => router.back(), 300);
    });
  };

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Terms & Privacy',
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
        <Card style={styles.introCard}>
          <View style={styles.introIcon}>
            <FileText size={32} color={Colors.primary.blue} />
          </View>
          <Text style={styles.introTitle}>Review our Terms & Privacy</Text>
          <Text style={styles.introSubtitle}>
            Please read and accept our terms of service and privacy policy to continue using TrustLoop
          </Text>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={Colors.neutral.gray900} />
            <Text style={styles.sectionTitle}>Terms of Service</Text>
          </View>
          <Card style={styles.contentCard}>
            <ScrollView 
              style={styles.contentScroll} 
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.contentText}>{termsContent}</Text>
            </ScrollView>
          </Card>
          
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <CheckCircle size={20} color={Colors.neutral.white} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and accept the Terms of Service
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color={Colors.neutral.gray900} />
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
          </View>
          <Card style={styles.contentCard}>
            <ScrollView 
              style={styles.contentScroll} 
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.contentText}>{privacyContent}</Text>
            </ScrollView>
          </Card>
          
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxChecked]}>
              {acceptedPrivacy && <CheckCircle size={20} color={Colors.neutral.white} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and accept the Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Eye size={24} color={Colors.primary.blue} />
          </View>
          <Text style={styles.summaryTitle}>Your Privacy Matters</Text>
          <Text style={styles.summaryText}>
            We are committed to protecting your personal information and being transparent about how we use your data.
          </Text>
          <View style={styles.summaryPoints}>
            <Text style={styles.summaryPoint}>✓ We never sell your data</Text>
            <Text style={styles.summaryPoint}>✓ Bank-level encryption</Text>
            <Text style={styles.summaryPoint}>✓ You control your information</Text>
            <Text style={styles.summaryPoint}>✓ Transparent data practices</Text>
          </View>
        </Card>

        <TouchableOpacity 
          style={[
            styles.acceptButton,
            (!acceptedTerms || !acceptedPrivacy) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!acceptedTerms || !acceptedPrivacy}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.acceptButtonText,
            (!acceptedTerms || !acceptedPrivacy) && styles.acceptButtonTextDisabled,
          ]}>
            Accept & Continue
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          By accepting, you agree to be bound by these terms. You can review them anytime in your account settings.
        </Text>

        <View style={styles.footer} />
      </ScrollView>

      {showToast && (
        <Animated.View 
          style={[
            styles.toast,
            { 
              transform: [{ translateY: toastTranslateY }],
              opacity: toastAnim,
            }
          ]}
        >
          <CheckCircle size={24} color={Colors.neutral.white} />
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>Terms Accepted</Text>
            <Text style={styles.toastMessage}>Thank you for accepting our terms and privacy policy</Text>
          </View>
        </Animated.View>
      )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  introCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  introTitle: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  introSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    maxWidth: 300,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  contentCard: {
    padding: 0,
    overflow: 'hidden',
  },
  contentScroll: {
    maxHeight: 300,
    padding: Spacing.md,
  },
  contentText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.status.verifiedGreen,
    borderColor: Colors.status.verifiedGreen,
  },
  checkboxLabel: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    flex: 1,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: '#DBEAFE',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 300,
  },
  summaryPoints: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  summaryPoint: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.xs,
  },
  acceptButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.level2,
  },
  acceptButtonDisabled: {
    backgroundColor: Colors.neutral.gray300,
    ...Shadows.level1,
  },
  acceptButtonText: {
    ...Typography.bodyLarge,
    color: Colors.neutral.white,
    fontWeight: '600',
  },
  acceptButtonTextDisabled: {
    color: Colors.neutral.gray700,
  },
  footerNote: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    height: Spacing.lg,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.status.verifiedGreen,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.level3,
  },
  toastContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  toastTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.white,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastMessage: {
    ...Typography.bodySmall,
    color: Colors.neutral.white,
    opacity: 0.9,
  },
});
