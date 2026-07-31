import CustomWalletHeader from '@/components/myWallet/customHeader';
import { useCreateGroup } from '@/hooks/Usecreategroup';
import { useGlobalStorage } from '@/store/useGlobalStorage';
import { GroupCreationStyles } from '@/styles/group_style/createGroup.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, BellIcon, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function CreateGroup() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => GroupCreationStyles(theme), [theme]);

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

  const currencies: Currency[] = [
    { id: '1', label: 'Kenyan Shilling', symbol: 'KES', code: 'KES' },
    { id: '2', label: 'US Dollar', symbol: '$', code: 'USD' },
    { id: '3', label: 'Euro', symbol: '€', code: 'EUR' },
    { id: '4', label: 'British Pound', symbol: '£', code: 'GBP' },
    { id: '5', label: 'Nigerian Naira', symbol: '₦', code: 'NGN' },
  ];

  const visibilityOptions: Visibility[] = [
    { id: '1', label: 'Public', value: 'public' },
    { id: '2', label: 'Private', value: 'private' },
  ];

  useEffect(() => {
    const defaultCurrency = currencies.find(c => c.code === 'KES') ?? currencies[0];
    setCurrency(defaultCurrency);
  }, []);

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
      Alert.alert('Validation Error', 'Maximum members must be greater than or equal to minimum members.');
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
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel', 'Are you sure you want to discard changes?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => router.back() },
    ]);
  };

  const renderDropdownModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    onSelect: (item: any) => void,
    isSelected: (item: any) => boolean,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={data}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionItem, isSelected(item) && styles.selectedOption]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.optionText, isSelected(item) && styles.selectedOptionText]}>
                  {item.label} {item.symbol ? `(${item.symbol})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, 
    backgroundColor: theme.background
     }}>
      <CustomWalletHeader
        subTitle="Create Your Group"
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{ icon: BellIcon, action: rightAction }}
      />

      <ScrollView
        // contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingBottom: 30 }}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Group Details</Text>
          </View>

          {/* Group name */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Group name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Saving Stars"
              placeholderTextColor={theme.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
              editable={!loading}
            />
          </View>

          {/* Description */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the purpose of this group"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Additional Settings section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Additional Settings</Text>
          </View>

          {/* Currency */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Currency *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => !loading && setIsCurrencyModalVisible(true)}
            >
              <Text style={[styles.dropdownButtonText, !currency && styles.placeholderText]}>
                {currency ? `${currency.label} (${currency.symbol})` : 'Select currency...'}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {renderDropdownModal(
            isCurrencyModalVisible,
            () => setIsCurrencyModalVisible(false),
            'Select Currency',
            currencies,
            handleSelectCurrency,
            item => currency?.id === item.id,
          )}

          {/* Min members */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Minimum members</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={minMembers}
              onChangeText={setMinMembers}
              editable={!loading}
            />
          </View>

          {/* Max members */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Maximum members</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 20"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={maxMembers}
              onChangeText={setMaxMembers}
              editable={!loading}
            />
          </View>

          {/* Visibility */}
          <View style={styles.inputgroup}>
            <Text style={styles.label}>Visibility *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => !loading && setIsVisibilityModalVisible(true)}
            >
              <Text style={[styles.dropdownButtonText, !visibility && styles.placeholderText]}>
                {visibility ? visibility.label : 'Select visibility...'}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {renderDropdownModal(
            isVisibilityModalVisible,
            () => setIsVisibilityModalVisible(false),
            'Select Visibility',
            visibilityOptions,
            handleSelectVisibility,
            item => visibility?.id === item.id,
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCreate}
            disabled={loading}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[theme.primary, '#0f4a0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.createButtonGradient, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, loading && { opacity: 0.5 }]}
            activeOpacity={0.8}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}