import React, { useState, useRef, useEffect } from 'react';
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
  Bell,
  BellOff,
  DollarSign,
  Users,
  Shield,
  TrendingUp,
  MessageCircle,
  Clock,
  Check,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';
import { SectionHeader } from '@/components/myProfile/SectionHeader';

interface Notification {
  id: string;
  type: 'payment' | 'group' | 'security' | 'update' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received KES 25,000 from John Doe',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'group',
    title: 'Group Contribution Reminder',
    message: 'Monthly contribution of KES 10,000 is due tomorrow',
    timestamp: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'security',
    title: 'New Login Detected',
    message: 'Your account was accessed from a new device',
    timestamp: '1 day ago',
    read: false,
  },
  {
    id: '4',
    type: 'update',
    title: 'Trust Score Increased',
    message: 'Your trust score increased by 4 points to 85',
    timestamp: '2 days ago',
    read: true,
  },
  {
    id: '5',
    type: 'message',
    title: 'New Group Message',
    message: 'Jane posted in Family Investment Group',
    timestamp: '3 days ago',
    read: true,
  },
];

interface NotificationSetting {
  id: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  type: 'push' | 'email' | 'sms';
}

const mockSettings: NotificationSetting[] = [
  {
    id: '1',
    title: 'Payment Notifications',
    subtitle: 'Deposits, withdrawals, transfers',
    enabled: true,
    type: 'push',
  },
  {
    id: '2',
    title: 'Group Updates',
    subtitle: 'Contributions, meetings, votes',
    enabled: true,
    type: 'push',
  },
  {
    id: '3',
    title: 'Security Alerts',
    subtitle: 'Login attempts, password changes',
    enabled: true,
    type: 'push',
  },
  {
    id: '4',
    title: 'Trust Score Updates',
    subtitle: 'Score changes and milestones',
    enabled: true,
    type: 'push',
  },
  {
    id: '5',
    title: 'Marketing Updates',
    subtitle: 'Features, offers, promotions',
    enabled: false,
    type: 'email',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState(mockNotifications);
  const [settings, setSettings] = useState(mockSettings);
  const [showSettings, setShowSettings] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  };

  const displayedNotifications = selectedTab === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setShowSettings(!showSettings)} 
              style={styles.headerButton}
            >
              <Bell size={24} color={Colors.primary.blue} />
            </TouchableOpacity>
          ),
        }}
      />

      {!showSettings ? (
        <>
          <View style={styles.header}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
                onPress={() => setSelectedTab('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, selectedTab === 'unread' && styles.tabActive]}
                onPress={() => setSelectedTab('unread')}
                activeOpacity={0.7}
              >
                <View style={styles.tabWithBadge}>
                  <Text style={[styles.tabText, selectedTab === 'unread' && styles.tabTextActive]}>
                    Unread
                  </Text>
                  {unreadCount > 0 && (
                    <Badge text={unreadCount.toString()} variant="error" />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7}>
                <Text style={styles.markAllButton}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {displayedNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <BellOff size={48} color={Colors.neutral.gray300} />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedTab === 'unread' 
                    ? "You're all caught up!" 
                    : "You'll see notifications here when you have them"}
                </Text>
              </View>
            ) : (
              displayedNotifications.map((notification, index) => (
                <NotificationCard 
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                  delay={index * 50}
                />
              ))
            )}

            <View style={styles.footer} />
          </ScrollView>
        </>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <SectionHeader title="Notification Preferences" />
            <Text style={styles.sectionDescription}>
              Choose what notifications you want to receive
            </Text>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Push Notifications" />
            {settings.filter(s => s.type === 'push').map((setting, index) => (
              <SettingCard 
                key={setting.id}
                setting={setting}
                onToggle={toggleSetting}
                delay={index * 50}
              />
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Email Notifications" />
            {settings.filter(s => s.type === 'email').map((setting, index) => (
              <SettingCard 
                key={setting.id}
                setting={setting}
                onToggle={toggleSetting}
                delay={index * 50}
              />
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Quiet Hours" />
            <Card>
              <View style={styles.quietHoursRow}>
                <View style={styles.quietHoursInfo}>
                  <Text style={styles.quietHoursTitle}>Enable Quiet Hours</Text>
                  <Text style={styles.quietHoursSubtitle}>
                    Mute notifications during specific times
                  </Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: Colors.neutral.gray300, true: Colors.primary.blue }}
                  thumbColor={Colors.neutral.white}
                />
              </View>
            </Card>
          </View>

          <View style={styles.footer} />
        </ScrollView>
      )}
    </View>
  );
}

function NotificationCard({ 
  notification, 
  onMarkRead, 
  onDelete,
  delay 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  const getIcon = () => {
    switch (notification.type) {
      case 'payment':
        return DollarSign;
      case 'group':
        return Users;
      case 'security':
        return Shield;
      case 'update':
        return TrendingUp;
      case 'message':
        return MessageCircle;
      default:
        return Bell;
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'payment':
        return Colors.status.verifiedGreen;
      case 'group':
        return Colors.status.premiumPurple;
      case 'security':
        return Colors.primary.red;
      case 'update':
        return Colors.primary.blue;
      case 'message':
        return Colors.primary.yellow;
      default:
        return Colors.neutral.gray700;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'payment':
        return '#D1FAE5';
      case 'group':
        return '#EDE9FE';
      case 'security':
        return '#FEE2E2';
      case 'update':
        return '#DBEAFE';
      case 'message':
        return '#FEF3C7';
      default:
        return Colors.neutral.gray100;
    }
  };

  const Icon = getIcon();

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        onPress={() => setShowActions(!showActions)}
        onLongPress={() => setShowActions(true)}
        activeOpacity={0.7}
      >
        <Card style={[styles.notificationCard, !notification.read && styles.notificationUnread]}>
          <View style={styles.notificationContent}>
            <View style={[styles.notificationIcon, { backgroundColor: getIconBg() }]}>
              <Icon size={20} color={getIconColor()} />
            </View>
            
            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <View style={styles.notificationFooter}>
                <Clock size={12} color={Colors.neutral.gray700} />
                <Text style={styles.notificationTime}>{notification.timestamp}</Text>
              </View>
            </View>
          </View>

          {showActions && (
            <View style={styles.notificationActions}>
              {!notification.read && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    onMarkRead(notification.id);
                    setShowActions(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Check size={16} color={Colors.status.verifiedGreen} />
                  <Text style={styles.actionButtonText}>Mark as read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonDelete]}
                onPress={() => onDelete(notification.id)}
                activeOpacity={0.7}
              >
                <X size={16} color={Colors.primary.red} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SettingCard({ 
  setting, 
  onToggle,
  delay 
}: { 
  setting: NotificationSetting; 
  onToggle: (id: string) => void;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.settingCard}>
        <View style={styles.settingContent}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
          </View>
          <Switch
            value={setting.enabled}
            onValueChange={() => onToggle(setting.id)}
            trackColor={{ false: Colors.neutral.gray300, true: Colors.primary.blue }}
            thumbColor={Colors.neutral.white}
          />
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
  header: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
  },
  tabActive: {
    backgroundColor: Colors.primary.blue,
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.neutral.white,
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  markAllButton: {
    ...Typography.bodySmall,
    color: Colors.primary.blue,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
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
    maxWidth: 250,
  },
  notificationCard: {
    marginBottom: Spacing.md,
  },
  notificationUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.blue,
  },
  notificationContent: {
    flexDirection: 'row',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.blue,
    marginLeft: Spacing.sm,
  },
  notificationMessage: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    marginBottom: Spacing.xs,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.neutral.gray100,
  },
  actionButtonDelete: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray900,
    fontWeight: '600',
  },
  actionButtonTextDelete: {
    color: Colors.primary.red,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionDescription: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
    marginTop: Spacing.xs,
  },
  settingCard: {
    marginBottom: Spacing.md,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quietHoursInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  quietHoursTitle: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    marginBottom: 2,
  },
  quietHoursSubtitle: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  footer: {
    height: Spacing.lg,
  },
});
