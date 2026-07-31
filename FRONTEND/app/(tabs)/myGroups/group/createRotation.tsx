import CustomWalletHeader from '@/components/myWallet/customHeader';
import { RotationData, useCreateRotation } from '@/hooks/useCreateRotation';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useGlobalStorage } from '@/store/useGlobalStorage';
import { GroupRotationCreationStyles } from '@/styles/group_style/create_rotation.styles';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BellIcon, CalendarRange, ChevronDown } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

type Interval = {
  id: string;
  label: string;
  value: string;
};

type OptionItem = {
  id: string;
  label: string;
  value: string;
};

export default function CreateRotation() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => GroupRotationCreationStyles(theme), [theme]);

  const rightAction = () => {};
  const leftAction = () => router.back();

  // Form states
  const [rotationName, setRotationName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedInterval, setSelectedInterval] = useState<Interval | null>(null);
  const [isIntervalModalVisible, setIsIntervalModalVisible] = useState(false);
  const [lowFunds, setLowFunds] = useState<OptionItem | null>(null);
  const [isLowFundsModalVisible, setIsLowFundsModalVisible] = useState(false);
  const [disbursementType, setDisbursementType] = useState<OptionItem | null>(null);
  const [isDisbursementModalVisible, setIsDisbursementModalVisible] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const params = useLocalSearchParams<{ group_member_id: string; group_id: string }>();

  const { data: wallet } = useUserWallet(params.group_id);

  // Data
  const intervals: Interval[] = [{ id: '2', label: 'monthly', value: 'monthly' }];

  const lowFundsOptions: OptionItem[] = [
    { id: '1', label: 'Allow partial contributions', value: 'partial' },
    { id: '2', label: 'Skip turn if funds are low', value: 'skip' },
    { id: '3', label: 'Notify and allow manual override', value: 'notify' },
  ];

  const disbursementOptions: OptionItem[] = [
    { id: '1', label: 'Equal shares', value: 'equal' },
    { id: '2', label: 'Random', value: 'random' },
    { id: '3', label: 'By contribution order', value: 'order' },
  ];

  const mutation = useCreateRotation();

  // Handlers
  const handleSelectInterval = (item: Interval) => {
    setSelectedInterval(item);
    setIsIntervalModalVisible(false);
  };

  const handleSelectLowFunds = (item: OptionItem) => {
    setLowFunds(item);
    setIsLowFundsModalVisible(false);
  };

  const handleSelectDisbursement = (item: OptionItem) => {
    setDisbursementType(item);
    setIsDisbursementModalVisible(false);
  };

  const handleCreate = async () => {
    if (!rotationName.trim()) {
      Alert.alert('Validation Error', 'Please enter a rotation name.');
      return;
    }
    if (!selectedInterval) {
      Alert.alert('Validation Error', 'Please select an interval.');
      return;
    }
    if (!startDate) {
      Alert.alert('Validation Error', 'Please choose a start date.');
      return;
    }
    if (!contributionAmount.trim() || isNaN(Number(contributionAmount))) {
      Alert.alert('Validation Error', 'Please enter a valid contribution amount.');
      return;
    }

    const formData: RotationData = {
      amount_collectable: Number(contributionAmount),
      created_by_id: params.group_member_id,
      group_id: params.group_id,
      plan_name: rotationName,
      rotation_description: description,
      wallet_id: wallet?.wallet_id ?? '',
    };

    try {
      await mutation.mutateAsync(formData);
      toast.success('Rotation created successfully!');
      router.push({ pathname: '/(tabs)/myGroups/group/MyRotations' });
    } catch (error: any) {
      console.error('Creation Failed:', error.message);
      toast.error(error.message || 'Creation failed. Please try again.');
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel', 'Are you sure you want to discard changes?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => router.back() },
    ]);
  };

  // Reusable dropdown modal
  const renderDropdownModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    onSelect: (item: any) => void,
    isSelected: (item: any) => boolean,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionItem, isSelected(item) && styles.selectedOption]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.optionText, isSelected(item) && styles.selectedOptionText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Subtle gradient background */}
      <LinearGradient
        colors={[theme.background, theme.background, `${theme.primary}26`]}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <CustomWalletHeader
          subTitle="Create Rotation"
          leftAction={{ icon: ArrowLeft, action: leftAction }}
          rightAction={{ icon: BellIcon, action: rightAction }}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Form card */}
          <View style={styles.container}>
            {/* Rotation name */}
            <View style={styles.inputgroup}>
              <Text style={styles.label}>Rotation name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Saving Stars"
                placeholderTextColor={theme.textSecondary}
                value={rotationName}
                onChangeText={setRotationName}
              />
            </View>

            {/* Description */}
            <View style={styles.inputgroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the purpose..."
                placeholderTextColor={theme.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Interval */}
            <View style={styles.inputgroup}>
              <Text style={styles.label}>Interval *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsIntervalModalVisible(true)}
              >
                <Text style={[styles.dropdownButtonText, !selectedInterval && styles.placeholderText]}>
                  {selectedInterval ? selectedInterval.label : 'Select interval...'}
                </Text>
                <ChevronDown size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Start date */}
            <View style={styles.inputgroup}>
              <Text style={styles.label}>Start date *</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <CalendarRange size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Contribution amount */}
            <View style={styles.inputgroup}>
              <Text style={styles.label}>Amount to contribute *</Text>
              <TextInput
                style={styles.input}
                placeholder="KES 1,000"
                placeholderTextColor={theme.textSecondary}
                value={contributionAmount}
                onChangeText={setContributionAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Additional Settings */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>Additional Settings</Text>

              {/* Low funds */}
              <View style={styles.inputgroup}>
                <Text style={styles.label}>Low funds option</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsLowFundsModalVisible(true)}
                >
                  <Text style={[styles.dropdownButtonText, !lowFunds && styles.placeholderText]}>
                    {lowFunds ? lowFunds.label : 'Select an option...'}
                  </Text>
                  <ChevronDown size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Disbursement Type */}
              <View style={styles.inputgroup}>
                <Text style={styles.label}>Disbursement Type</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDisbursementModalVisible(true)}
                >
                  <Text style={[styles.dropdownButtonText, !disbursementType && styles.placeholderText]}>
                    {disbursementType ? disbursementType.label : 'Select type...'}
                  </Text>
                  <ChevronDown size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Penalty */}
              <View style={styles.inputgroup}>
                <Text style={styles.label}>Penalty amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="KES 0"
                  placeholderTextColor={theme.textSecondary}
                  value={penaltyAmount}
                  onChangeText={setPenaltyAmount}
                  keyboardType="numeric"
                />
              </View>

              {/* Grace period */}
              <View style={styles.inputgroup}>
                <Text style={styles.label}>Grace Period (days)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 3"
                  placeholderTextColor={theme.textSecondary}
                  value={gracePeriod}
                  onChangeText={setGracePeriod}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable onPress={handleCreate} style={{ flex: 1 }}>
              <LinearGradient
                colors={[theme.primary, '#0f4a0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </LinearGradient>
            </Pressable>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      {renderDropdownModal(
        isIntervalModalVisible,
        () => setIsIntervalModalVisible(false),
        'Select Interval',
        intervals,
        handleSelectInterval,
        (item) => selectedInterval?.id === item.id,
      )}
      {renderDropdownModal(
        isLowFundsModalVisible,
        () => setIsLowFundsModalVisible(false),
        'Low funds option',
        lowFundsOptions,
        handleSelectLowFunds,
        (item) => lowFunds?.id === item.id,
      )}
      {renderDropdownModal(
        isDisbursementModalVisible,
        () => setIsDisbursementModalVisible(false),
        'Disbursement Type',
        disbursementOptions,
        handleSelectDisbursement,
        (item) => disbursementType?.id === item.id,
      )}
    </View>
  );
}