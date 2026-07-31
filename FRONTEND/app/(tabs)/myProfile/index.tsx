// app/(tabs)/index.tsx
import React, { useRef, useEffect, useState } from 'react';
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
  Wallet,
  Settings,
  Bell,
  Shield,
  CreditCard,
  Lock,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Building,
  PieChart,
  History,
  UserCheck,
  HelpCircle,
  FileText,
  Award,
  Trophy,
  LogOut,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { SectionHeader } from '@/components/myProfile/SectionHeader';
import { MenuItem } from '@/components/myProfile/MenuItem';
import { StatCard } from '@/components/myProfile/StatCard';
import { mockUser, mockStats, mockNotifications, mockPendingActions } from '@/lib/mock_data/profileMocks/user';
import { ConfirmationModal } from '@/components/myProfile/profile/modals/logout confirmationmodal';
import { LogoutToast } from '@/components/myProfile/profile/toasts/logout toast';
import { onSignOutButtonPress } from '@/utils/signOut';
import { useMemberData } from '@/hooks/useMemberData';
import { useUserWallet } from '@/hooks/useUserWallet';
// import { ConfirmationModal } from '@/components/profile/modals/logoutconfirmationmodal';
// import { LogoutToast } from '@/components/profile/toasts/LogoutToast'; 

export default function ProfileScreen() {
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
   const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
    refetch:memberRefetch
  } = useMemberData();
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: mockUser.trustScore,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const handleLogout = async() => {
    // Close modal
    setShowLogoutModal(false);
     try {
      await onSignOutButtonPress();
      //router.replace("/login");
      setShowToast(true);
    } catch (e) {
      console.log(`Error Signing out ${e}`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Profile',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/myProfile/settings')}
              style={styles.editButtonTouchable}
            >
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{`${member?.first_name[0]} ${member?.last_name[0]}`}</Text>
            </View>
          </View>
          
          <View style={styles.nameRow}>
            <Text style={styles.name}>{`${member?.first_name} ${member?.last_name}`}</Text>
            {mockUser.isVerified && (
              <View style={styles.verifiedBadge}>
                <UserCheck size={16} color={Colors.status.verifiedGreen} />
              </View>
            )}
          </View>
          
          {/* <Text style={styles.email}>{member?.}</Text>
          <Text style={styles.phone}>{mockUser.phone}</Text> */}
          
          <Badge 
            text={mockUser.accountType} 
            variant="info" 
            style={styles.accountTypeBadge}
          />
        </View>

        {/* <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatCard 
              value={`KES ${mockStats.totalBalance.toLocaleString()}`}
              label="Total Balance"
              delay={0}
            />
            <View style={styles.divider} />
            <StatCard 
              value={mockStats.walletsCount.toString()}
              label="Wallets"
              delay={100}
            />
            <View style={styles.divider} />
            <StatCard 
              value={mockStats.groupsCount.toString()}
              label="Groups"
              delay={200}
            />
          </View>
        </Card> */}

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/myProfile/analytics')}
        >
          <Card style={styles.trustScoreCard}>
            <View style={styles.trustScoreHeader}>
              <Trophy size={24} color={Colors.primary.yellow} />
              <Text style={styles.trustScoreTitle}>Trust Score</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View 
                  style={[
                    styles.progressBarFill,
                    { width: progressWidth }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.trustScoreFooter}>
              <Text style={styles.trustScoreValue}>{mockUser.trustScore}/100</Text>
              <Badge text={mockUser.tier} variant="premium" />
            </View>
            <Text style={styles.trustScoreTapHint}>Tap for detailed analytics</Text>
          </Card>
        </TouchableOpacity>

        <View style={styles.section}>
          <SectionHeader title="Financial Overview" />
          <MenuItem
            icon={Wallet}
            title="My Wallets"
            subtitle="Manage accounts"
            onPress={() => router.push('/(tabs)')}
          />
          <MenuItem
            icon={Building}
            title="Group Accounts"
            subtitle="Chama, investments"
            onPress={() => router.push('/(tabs)/myGroups')}
          />
          <MenuItem
            icon={PieChart}
            title="Analytics & Reports"
            subtitle="Spending insights"
            onPress={() => router.push('/(tabs)/myProfile/analytics')}
          />
          <MenuItem
            icon={History}
            title="Transaction History"
            subtitle="View all transactions"
            onPress={() => router.push('/(tabs)/myProfile/transactions')}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Account Settings" />
          <MenuItem
            icon={Settings}
            title="Account Settings"
            subtitle="Personal information"
            onPress={() => router.push('/(tabs)/myProfile/settings')}
          />
          <MenuItem
            icon={Bell}
            title="Notifications"
            subtitle="3 unread notifications"
            badge={{ text: mockNotifications.unread.toString(), variant: 'error' }}
            onPress={() => router.push('/(tabs)/myProfile/notifications')}
          />
          <MenuItem
            icon={Shield}
            title="Security"
            subtitle="2FA, biometrics"
            onPress={() => router.push('/(tabs)/myProfile/security')}
          />
          <MenuItem
            icon={CreditCard}
            title="Payment Methods"
            subtitle="M-Pesa, bank accounts"
            onPress={() => router.push('/(tabs)/myProfile/payment-methods')}
          />
          <MenuItem
            icon={Lock}
            title="Privacy Controls"
            subtitle="Data sharing"
            onPress={() => router.push('/(tabs)/myProfile/privacy')}
          />
          <MenuItem
            icon={UserCheck}
            title="Verification Status"
            badge={{ text: 'Verified', variant: 'success' }}
            onPress={() => router.push('/(tabs)/myProfile/verification')}
          />
        </View>

        {/* <View style={styles.section}>
          <SectionHeader title="Group Management" />
          <MenuItem
            icon={Users}
            title="My Groups"
            subtitle="Manage group memberships"
            onPress={() => router.push('/(tabs)/myProfile/groups')}
          />
          <MenuItem
            icon={Target}
            title="Group Contributions"
            subtitle="Track payments"
            onPress={() => router.push('/(tabs)/myProfile/groups/contributions')}
          />
          <MenuItem
            icon={DollarSign}
            title="Withdrawal Requests"
            subtitle="1 pending"
            onPress={() => router.push('/(tabs)/myProfile/groups/withdrawals')}
          />
          <MenuItem
            icon={TrendingUp}
            title="Group Investments"
            subtitle="View portfolio"
            onPress={() => router.push('/(tabs)/myProfile/groups/investments')}
          />
        </View> */}

        <View style={styles.section}>
          <SectionHeader title="Support" />
          <MenuItem
            icon={HelpCircle}
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => router.push('/(tabs)/myProfile/help')}
          />
          <MenuItem
            icon={FileText}
            title="Terms & Privacy"
            onPress={() => router.push('/(tabs)/myProfile/terms')}
          />
          <MenuItem
            icon={Award}
            title="Upgrade Plan"
            subtitle="Get premium features"
            onPress={() => router.push('/(tabs)/myProfile/upgrade')}
          />
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={20} color={Colors.primary.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout from your account? This action cannot be undone."
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Toast Notification */}
      {showToast && (
        <LogoutToast
          message="You have been logged out successfully"
          type="success"
          duration={3000}
          onHide={() => setShowToast(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  scrollView: {
    paddingTop:20,
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  editButtonTouchable: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editButton: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.level2,
  },
  avatarText: {
    ...Typography.displayMedium,
    color: Colors.neutral.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginTop: Spacing.xs,
  },
  phone: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginTop: 2,
  },
  accountTypeBadge: {
    marginTop: Spacing.sm,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.neutral.gray200,
  },
  trustScoreCard: {
    marginBottom: Spacing.lg,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trustScoreTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary.yellow,
    borderRadius: BorderRadius.xs,
  },
  trustScoreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trustScoreValue: {
    ...Typography.heading1,
    color: Colors.neutral.gray900,
  },
  trustScoreTapHint: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.neutral.white,
    borderWidth: 1.5,
    borderColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.level1,
  },
  logoutText: {
    ...Typography.bodyLarge,
    color: Colors.primary.red,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  footer: {
    height: Spacing.lg,
  },
});