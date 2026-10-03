import CustomWalletHeader from '@/components/myWallet/customHeader';
import { useCreateGroup } from '@/hooks/Usecreategroup';
import { useGlobalStorage } from '@/store/useGlobalStorage';
import { useRouter } from 'expo-router';
import { BellIcon, Check, ChevronDown, ChevronLeft, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Design tokens — claymorphism system (matches HomeScreen/Groups)   */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: '#E8EDF5',
  surface: '#F3F6FB',
  surfaceRaised: '#F7FAFE',
  sunken: '#DFE6F0',
  highlight: '#FFFFFF',
  shade: 'rgba(148, 163, 184, 0.55)',
  ink: '#1E293B',
  inkSoft: '#64748B',
  inkFaint: '#94A3B8',
  hairline: 'rgba(100, 116, 139, 0.12)',
} as const;

const ACCENT = {
  green: '#3E9B62',
  greenSoft: '#DBEFE1',
  red: '#CF6B6B',
  redSoft: '#FAE3E3',
  navy: '#4B6FA6',
  navySoft: '#E1E9F5',
  amber: '#C08A3E',
  amberSoft: '#F7EAD8',
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Currency = {
  id: string;
  label: string;
  symbol: string;
  code: string;
};

type Visibility = {
  id: string;
  label: string;
  value: 'public' | 'private';
};

/* ------------------------------------------------------------------ */
/*  Clay primitive                                                    */
/* ------------------------------------------------------------------ */

function Clay({
  children,
  color = CLAY.surface,
  radius = RADIUS.lg,
  highlight = CLAY.highlight,
  shade = CLAY.shade,
  depth = 1,
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}) {
  const offset = 4 + depth * 2;
  const drop = offset + 2;

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          shadowColor: shade,
          shadowOffset: { width: drop, height: drop },
          shadowOpacity: 1,
          shadowRadius: drop * 1.9,
          elevation: 3 + depth * 3,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            backgroundColor: color,
            borderRadius: radius,
            shadowColor: highlight,
            shadowOffset: { width: -offset, height: -offset },
            shadowOpacity: 1,
            shadowRadius: offset * 1.5,
          },
          bodyStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function CreateGroup() {
  const router = useRouter();
  const { theme } = useGlobalStorage();

  const { loading, error, createGroup } = useCreateGroup();

  const rightAction = () => {};
  const leftAction = () => router.back();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [minMembers, setMinMembers] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [isVisibilityModalVisible, setIsVisibilityModalVisible] = useState(false);

  const currencies: Currency[] = useMemo(
    () => [
      { id: '1', label: 'Kenyan Shilling', symbol: 'KES', code: 'KES' },
      { id: '2', label: 'US Dollar', symbol: '$', code: 'USD' },
      { id: '3', label: 'Euro', symbol: '€', code: 'EUR' },
      { id: '4', label: 'British Pound', symbol: '£', code: 'GBP' },
      { id: '5', label: 'Nigerian Naira', symbol: '₦', code: 'NGN' },
    ],
    []
  );

  const visibilityOptions: Visibility[] = useMemo(
    () => [
      { id: '1', label: 'Public', value: 'public' },
      { id: '2', label: 'Private', value: 'private' },
    ],
    []
  );

  useEffect(() => {
    const defaultCurrency =
      currencies.find((c) => c.code === 'KES') ?? currencies[0];
    setCurrency(defaultCurrency);
  }, [currencies]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleSelectCurrency = (item: Currency) => {
    setCurrency(item);
    setIsCurrencyModalVisible(false);
  };

  const handleSelectVisibility = (item: Visibility) => {
    setVisibility(item);
    setIsVisibilityModalVisible(false);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Please enter a group name.');
      return;
    }
    if (!currency) {
      Alert.alert('Validation Error', 'Please select a currency.');
      return;
    }
    const min = parseInt(minMembers, 10);
    const max = parseInt(maxMembers, 10);
    if (isNaN(min) || min < 1) {
      Alert.alert('Validation Error', 'Minimum members must be at least 1.');
      return;
    }
    if (isNaN(max) || max < min) {
      Alert.alert(
        'Validation Error',
        'Maximum members must be greater than or equal to minimum members.'
      );
      return;
    }
    if (!visibility) {
      Alert.alert('Validation Error', 'Please select visibility.');
      return;
    }

    const result = await createGroup({
      groupName: groupName.trim(),
      description: description.trim() || undefined,
      currency: currency.code,
      minMembers: min,
      maxMembers: max,
      visibility: visibility.value,
    });

    if (result) {
      Alert.alert(
        'Group Created',
        `"${groupName}" has been created successfully.\nRef: ${result.group_ref}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel', 'Are you sure you want to discard changes?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => router.back() },
    ]);
  };

  /* ── Reusable field ─────────────────────────────────────── */
  const Field = ({
    label,
    required,
    children,
  }: {
    label: string;
    required?: boolean;
    children: ReactNode;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.fieldRequired}> *</Text> : null}
      </Text>
      {children}
    </View>
  );

  /* ── Dropdown modal ─────────────────────────────────────── */
  const renderDropdownModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    onSelect: (item: any) => void,
    isSelected: (item: any) => boolean
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalWrap} pointerEvents="box-none">
          <Clay
            radius={RADIUS.xl}
            depth={2}
            bodyStyle={styles.modalContent}
            style={styles.modalShell}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = isSelected(item);
                return (
                  <TouchableOpacity
                    onPress={() => onSelect(item)}
                    activeOpacity={0.9}
                    style={[
                      styles.optionItem,
                      selected && styles.optionItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                      {item.symbol ? ` (${item.symbol})` : ''}
                    </Text>
                    {selected ? (
                      <View style={styles.optionCheck}>
                        <Check
                          size={13}
                          color="#fff"
                          strokeWidth={3}
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => (
                <View style={styles.optionSeparator} />
              )}
            />
          </Clay>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.root}>
      <CustomWalletHeader
        subTitle="Create your group"
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{ icon: BellIcon, action: rightAction }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBlock}>
          <Text style={styles.introEyebrow}>NEW GROUP</Text>
          <Text style={styles.introTitle}>Set up your group</Text>
          <Text style={styles.introBody}>
            Give your group a name, a currency and the rules for who can join.
            You can change most of this later.
          </Text>
        </View>

        {/* ── Section: Group details ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>Group details</Text>
        </View>

        <Clay style={styles.block} bodyStyle={styles.card}>
          <Field label="Group name" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Saving Stars"
              placeholderTextColor={CLAY.inkFaint}
              value={groupName}
              onChangeText={setGroupName}
              editable={!loading}
              maxLength={60}
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this group for?"
              placeholderTextColor={CLAY.inkFaint}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              maxLength={300}
            />
          </Field>
        </Clay>

        {/* ── Section: Additional settings ───────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>Additional settings</Text>
        </View>

        <Clay style={styles.block} bodyStyle={styles.card}>
          <Field label="Currency" required>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => !loading && setIsCurrencyModalVisible(true)}
              style={styles.dropdownButton}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !currency && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {currency
                  ? `${currency.label} (${currency.symbol})`
                  : 'Select currency...'}
              </Text>
              <ChevronDown
                size={16}
                color={CLAY.inkSoft}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </Field>

          <View style={styles.rowSplit}>
            <View style={{ flex: 1 }}>
              <Field label="Min members">
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor={CLAY.inkFaint}
                  keyboardType="numeric"
                  value={minMembers}
                  onChangeText={setMinMembers}
                  editable={!loading}
                  maxLength={4}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Max members">
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor={CLAY.inkFaint}
                  keyboardType="numeric"
                  value={maxMembers}
                  onChangeText={setMaxMembers}
                  editable={!loading}
                  maxLength={4}
                />
              </Field>
            </View>
          </View>

          <Field label="Visibility" required>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => !loading && setIsVisibilityModalVisible(true)}
              style={styles.dropdownButton}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !visibility && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {visibility ? visibility.label : 'Select visibility...'}
              </Text>
              <ChevronDown
                size={16}
                color={CLAY.inkSoft}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </Field>
        </Clay>

        {/* Helper note — sets expectations for regular users */}
        <View style={styles.helperNote}>
          <Text style={styles.helperText}>
            Public groups appear in Discover and anyone can request to join.
            Private groups are invite-only.
          </Text>
        </View>

        {/* ── Actions ───────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCreate}
            disabled={loading}
            style={{ flex: 1 }}
          >
            <Clay
              color={theme.primary}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.34)"
              shade="rgba(12, 45, 22, 0.42)"
              bodyStyle={[
                styles.createButtonBody,
                loading && { opacity: 0.8 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create group</Text>
              )}
            </Clay>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCancel}
            disabled={loading}
            style={[
              styles.cancelButton,
              loading && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────── */}
      {renderDropdownModal(
        isCurrencyModalVisible,
        () => setIsCurrencyModalVisible(false),
        'Select currency',
        currencies,
        handleSelectCurrency,
        (item) => currency?.id === item.id
      )}

      {renderDropdownModal(
        isVisibilityModalVisible,
        () => setIsVisibilityModalVisible(false),
        'Select visibility',
        visibilityOptions,
        handleSelectVisibility,
        (item) => visibility?.id === item.id
      )}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Intro */
  introBlock: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    gap: 4,
  },
  introEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  introBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 320,
  },

  /* Sections */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionMarker: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CLAY.ink,
    letterSpacing: -0.2,
  },

  block: {
    marginHorizontal: SPACING.xl,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.lg,
  },

  /* Fields */
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: CLAY.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldRequired: { color: ACCENT.red, fontWeight: '800' },

  input: {
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: CLAY.ink,
    fontSize: 14.5,
    fontWeight: '600',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  textArea: {
    minHeight: 96,
    paddingTop: Platform.OS === 'ios' ? 14 : 12,
    lineHeight: 20,
  },
  placeholderText: { color: CLAY.inkFaint, fontWeight: '500' },

  rowSplit: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  /* Dropdown */
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    gap: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  dropdownText: {
    flex: 1,
    color: CLAY.ink,
    fontSize: 14.5,
    fontWeight: '600',
  },

  /* Helper note */
  helperNote: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  helperText: {
    fontSize: 12,
    color: CLAY.inkSoft,
    lineHeight: 17,
    fontWeight: '500',
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  createButtonBody: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  cancelButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: CLAY.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: CLAY.ink,
    fontWeight: '700',
    fontSize: 14.5,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalWrap: {
    width: '100%',
    maxWidth: 420,
  },
  modalShell: { borderRadius: RADIUS.xl },
  modalContent: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CLAY.ink,
    letterSpacing: -0.2,
  },

  optionItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionItemSelected: {
    backgroundColor: CLAY.sunken,
  },
  optionText: {
    fontSize: 14.5,
    color: CLAY.ink,
    fontWeight: '600',
  },
  optionTextSelected: {
    fontWeight: '800',
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
    marginHorizontal: SPACING.md,
  },
});