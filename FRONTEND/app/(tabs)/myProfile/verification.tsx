/**
 * Verification Screen with Horizontal Navigation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Home,
  Briefcase,
  Building,
  FileText,
  Award,
  CheckCircle,
  Save,
  AlertCircle,
  LucideIcon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, BorderRadius } from '@/lib/constants/colors';
import { Card } from '@/components/myProfile/Card';
import { Badge } from '@/components/myProfile/Badge';

// Import new verification components
import { VerificationStatus, VerificationStatusType, VerificationLevel } from '@/components/myProfile/profile/verification/VerificationStatus';
import { VerificationForm, FormStep } from '@/components/myProfile/profile/verification/VerificationForm';
//import { DocumentUploader } from '@/components/myProfile/profile/verification/DocumentUploader';

// Storage keys
const STORAGE_KEYS = {
  VERIFICATION_DATA: '@verification_data',
  CURRENT_STEP: '@current_step',
  AUTO_SAVE_TIMESTAMP: '@auto_save_timestamp',
};

// Updated verification steps interface
interface VerificationStepData {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  level: VerificationLevel;
  icon?: LucideIcon;
  order: number;
  required?: boolean;
  estimatedTime?: string;
}

// Sample verification steps data
const verificationSteps: VerificationStepData[] = [
  {
    id: 'personal',
    title: 'Personal',
    description: 'Basic details',
    status: 'completed',
    level: 1,
    icon: User,
    order: 1,
    required: true,
    estimatedTime: '2-3 min',
  },
  {
    id: 'identity',
    title: 'Identity',
    description: 'ID Verification',
    status: 'completed',
    level: 1,
    icon: FileText,
    order: 2,
    required: true,
    estimatedTime: '5-10 min',
  },
  {
    id: 'address',
    title: 'Address',
    description: 'Proof of address',
    status: 'current',
    level: 2,
    icon: Home,
    order: 3,
    required: true,
    estimatedTime: '5-7 min',
  },
  {
    id: 'financial',
    title: 'Financial',
    description: 'Income & bank',
    status: 'pending',
    level: 2,
    icon: Briefcase,
    order: 4,
    required: true,
    estimatedTime: '3-5 min',
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Optional details',
    status: 'pending',
    level: 3,
    icon: Building,
    order: 5,
    required: false,
    estimatedTime: '10-15 min',
  },
];

// Helper function to convert string array to option objects
const createOptions = (options: string[]) => 
  options.map(option => ({
    label: option,
    value: option.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  }));

// Form steps configuration
const formSteps: FormStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Enter your basic personal details',
    fields: [
      {
        id: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        validation: { minLength: 2, maxLength: 50 },
        placeholder: 'Enter your first name',
      },
      {
        id: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        validation: { minLength: 2, maxLength: 50 },
        placeholder: 'Enter your last name',
      },
      {
        id: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        placeholder: 'Enter your email address',
      },
      {
        id: 'phone',
        label: 'Phone Number',
        type: 'phone',
        required: true,
        validation: { minLength: 10, maxLength: 15 },
        placeholder: 'Enter your phone number',
      },
      {
        id: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        placeholder: 'Select your date of birth',
      },
    ],
  },
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Verify your identity with official documents',
    requiredDocuments: ['id_front', 'id_back', 'selfie'],
    fields: [
      {
        id: 'idType',
        label: 'ID Type',
        type: 'select',
        required: true,
        options: createOptions(['National ID', 'Passport', 'Driver\'s License']),
        placeholder: 'Select ID type',
      },
      {
        id: 'idNumber',
        label: 'ID Number',
        type: 'text',
        required: true,
        validation: { minLength: 5, maxLength: 20 },
        placeholder: 'Enter your ID number',
      },
      {
        id: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: false,
        placeholder: 'Select expiry date (if any)',
      },
    ],
  },
  {
    id: 'address',
    title: 'Address Proof',
    description: 'Provide proof of your current address',
    requiredDocuments: ['utility_bill', 'bank_statement'],
    fields: [
      {
        id: 'address',
        label: 'Full Address',
        type: 'textarea',
        required: true,
        validation: { minLength: 10, maxLength: 200 },
        placeholder: 'Enter your full address',
      },
      {
        id: 'city',
        label: 'City/Town',
        type: 'text',
        required: true,
        validation: { minLength: 2, maxLength: 50 },
        placeholder: 'Enter your city or town',
      },
      {
        id: 'postalCode',
        label: 'Postal Code',
        type: 'text',
        required: true,
        validation: { minLength: 3, maxLength: 10 },
        placeholder: 'Enter your postal code',
      },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Information',
    description: 'Provide your income and bank details',
    fields: [
      {
        id: 'occupation',
        label: 'Occupation',
        type: 'text',
        required: true,
        validation: { minLength: 2, maxLength: 50 },
        placeholder: 'Enter your occupation',
      },
      {
        id: 'monthlyIncome',
        label: 'Monthly Income (KES)',
        type: 'number',
        required: true,
        placeholder: 'Enter your monthly income',
        prefix: 'KES ',
      },
      {
        id: 'incomeSource',
        label: 'Source of Income',
        type: 'select',
        required: true,
        options: createOptions(['Employment', 'Business', 'Investments', 'Other']),
        placeholder: 'Select income source',
      },
      {
        id: 'bankName',
        label: 'Bank Name',
        type: 'text',
        required: true,
        validation: { minLength: 2, maxLength: 50 },
        placeholder: 'Enter your bank name',
      },
      {
        id: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        validation: { minLength: 5, maxLength: 20 },
        placeholder: 'Enter your account number',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Details',
    description: 'Business registration information (Optional)',
    fields: [
      {
        id: 'businessName',
        label: 'Business Name',
        type: 'text',
        required: false,
        validation: { maxLength: 100 },
        placeholder: 'Enter business name',
      },
      {
        id: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: false,
        options: createOptions(['Sole Proprietorship', 'Partnership', 'Limited Company', 'Other']),
        placeholder: 'Select business type',
      },
      {
        id: 'registrationNumber',
        label: 'Registration Number',
        type: 'text',
        required: false,
        validation: { maxLength: 20 },
        placeholder: 'Enter registration number',
      },
      {
        id: 'businessAddress',
        label: 'Business Address',
        type: 'textarea',
        required: false,
        validation: { maxLength: 200 },
        placeholder: 'Enter business address',
      },
    ],
  },
];

// Custom VerificationForm component with horizontal steps
interface CustomVerificationFormProps {
  steps: FormStep[];
  initialData: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<{ success: boolean; message: string; }>;
  onSaveDraft: (data: Record<string, any>) => Promise<void>;
  showProgress: boolean;
  verificationSteps: VerificationStepData[];
  currentStepIndex: number;
  onStepPress: (index: number) => void;
}

const CustomVerificationForm: React.FC<CustomVerificationFormProps> = ({
  steps,
  initialData,
  onSubmit,
  onSaveDraft,
  showProgress,
  verificationSteps,
  currentStepIndex,
  onStepPress,
}) => {
  const [formData] = useState(initialData);

  // Check if all required fields in current step are filled
  const isStepComplete = () => {
    const currentFormStep = steps[0]; // We only show one step at a time
    if (!currentFormStep) return false;

    const requiredFields = currentFormStep.fields.filter(field => field.required);
    
    return requiredFields.every(field => {
      const value = formData[field.id];
      if (value === undefined || value === null || value === '') return false;
      
      // Additional validation
      if (field.validation) {
        if (field.validation.minLength && String(value).length < field.validation.minLength) return false;
        if (field.validation.maxLength && String(value).length > field.validation.maxLength) return false;
        if (field.validation.pattern && !field.validation.pattern.test(String(value))) return false;
      }
      
      return true;
    });
  };

  const renderStepIndicator = (step: VerificationStepData, index: number) => {
    const isActive = index === currentStepIndex;
    const isCompleted = step.status === 'completed';
    const isPending = step.status === 'pending';
    const isCurrentStepComplete = index === currentStepIndex ? isStepComplete() : false;
    
    return (
      <TouchableOpacity
        key={step.id}
        style={[
          styles.formStepIndicator,
          isActive && styles.formStepIndicatorActive,
          isCompleted && styles.formStepIndicatorCompleted,
          isPending && styles.formStepIndicatorPending,
        ]}
        onPress={() => onStepPress(index)}
        disabled={isPending}
        activeOpacity={0.7}
      >
        <View style={styles.formStepIconContainer}>
          {isCompleted || (isActive && isCurrentStepComplete) ? (
            <CheckCircle size={16} color={Colors.neutral.white} />
          ) : step.icon ? (
            <step.icon 
              size={16} 
              color={
                isCompleted ? Colors.neutral.white :
                isActive ? Colors.primary.blue :
                Colors.neutral.gray400
              } 
            />
          ) : (
            <Text style={[
              styles.formStepNumber,
              (isCompleted || (isActive && isCurrentStepComplete)) && styles.formStepNumberCompleted,
              isActive && styles.formStepNumberActive,
            ]}>
              {step.order}
            </Text>
          )}
        </View>
        
        <Text style={[
          styles.formStepTitle,
          isActive && styles.formStepTitleActive,
          isCompleted && styles.formStepTitleCompleted,
          isPending && styles.formStepTitlePending,
        ]}>
          {step.title}
        </Text>
        
        {isActive && (
          <View style={styles.formActiveIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.formContainer}>
      {/* Horizontal Steps for Form */}
      <View style={styles.formStepsHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.formStepsScrollView}
          contentContainerStyle={styles.formStepsContent}
        >
          {verificationSteps.map(renderStepIndicator)}
        </ScrollView>
        
        {/* Progress Bar */}
        <View style={styles.formProgressContainer}>
          <View style={styles.formProgressBarBg}>
            <Animated.View
              style={[
                styles.formProgressBarFill,
                {
                  width: `${(currentStepIndex + 1) / verificationSteps.length * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.formProgressText}>
            Step {currentStepIndex + 1} of {verificationSteps.length}
          </Text>
        </View>
      </View>

      {/* Original VerificationForm */}
      <VerificationForm
        steps={steps}
        initialData={formData}
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
        showProgress={showProgress}
      />
    </View>
  );
};

export default function VerificationScreen() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(2);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const currentStep = verificationSteps[currentStepIndex];
  const completedSteps = verificationSteps.filter(s => s.status === 'completed').length;
  const totalSteps = verificationSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const nextLevelUnlockAt = 4;

  // Calculate current verification level
  const currentLevel: VerificationLevel = completedSteps >= 5 ? 3 : completedSteps >= 3 ? 2 : 1;
  
  // Determine overall verification status
  const getOverallStatus = (): VerificationStatusType => {
    if (completedSteps === totalSteps) return 'verified';
    if (completedSteps > 0) return 'in_progress';
    return 'not_started';
  };

  // Auto-save form data with useCallback to prevent recreation
  const autoSaveData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.VERIFICATION_DATA, JSON.stringify(formData)),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStepIndex.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.AUTO_SAVE_TIMESTAMP, timestamp.toString()),
      ]);
      
      setHasUnsavedChanges(false);
    } catch {
      // Silent fail for auto-save
    }
  }, [formData, currentStepIndex]);

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        setIsLoading(true);
        const [savedData, savedStep] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_DATA),
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STEP),
        ]);

        if (savedData) {
          setFormData(JSON.parse(savedData));
        }
        if (savedStep) {
          const stepIndex = parseInt(savedStep);
          if (!isNaN(stepIndex) && stepIndex < verificationSteps.length) {
            setCurrentStepIndex(stepIndex);
          }
        }
      } catch {
        // Silent fail for loading
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, []);

  // Auto-save when form data changes
  useEffect(() => {
    if (!isLoading && Object.keys(formData).length > 0) {
      const timer = setTimeout(() => {
        autoSaveData();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [formData, isLoading, autoSaveData]);

  // Animate on step change
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Scroll to top when changing steps
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentStepIndex, fadeAnim, slideAnim]);

  // Manual save
  const handleManualSave = async () => {
    try {
      await autoSaveData();
      Alert.alert('Success', 'Your progress has been saved!');
    } catch {
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    }
  };

  // Handle step navigation
  const handleStepPress = (index: number) => {
    const step = verificationSteps[index];
    
    // Allow navigation to any completed or current step
    if (step.status !== 'pending') {
      setCurrentStepIndex(index);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: Record<string, any>) => {
    try {
      const updatedData = { ...formData, ...data };
      setFormData(updatedData);
      
      // Mark step as completed
      const updatedSteps = [...verificationSteps];
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        status: 'completed' as const,
      };
      
      // Move to next step if available
      if (currentStepIndex < verificationSteps.length - 1) {
        const nextStepIndex = currentStepIndex + 1;
        updatedSteps[nextStepIndex] = {
          ...updatedSteps[nextStepIndex],
          status: 'current' as const,
        };
        setCurrentStepIndex(nextStepIndex);
      }
      
      // Save to storage
      await autoSaveData();
      
      return { success: true, message: 'Step completed successfully!' };
    } catch {
      return { success: false, message: 'Failed to submit. Please try again.' };
    }
  };

  // Handle draft save - returns void to match VerificationForm props
  const handleSaveDraft = async (data: Record<string, any>) => {
    try {
      const updatedData = { ...formData, ...data };
      setFormData(updatedData);
      await autoSaveData();
      // Return void to match VerificationForm props
    } catch {
      // Silent fail for draft save
    }
  };

  // Handle document upload
  const handleDocumentUpload = () => {
    console.log('Document uploaded');
    setHasUnsavedChanges(true);
  };

  // Handle level press
  const handleLevelPress = (level: VerificationLevel) => {
    console.log('Level pressed:', level);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your verification progress...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Verification',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.neutral.gray900} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {hasUnsavedChanges && (
                <View style={styles.unsavedBadge}>
                  <AlertCircle size={12} color={Colors.primary.red} />
                </View>
              )}
              <TouchableOpacity onPress={handleManualSave} style={styles.saveButton}>
                <Save size={20} color={Colors.primary.blue} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Verification Status Overview (without benefits) */}
          <VerificationStatus
            currentLevel={currentLevel}
            progressPercentage={progressPercentage}
            status={getOverallStatus()}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            nextLevelUnlockAt={nextLevelUnlockAt}
            onLevelPress={handleLevelPress}
          />

          {/* Current Step Form with Horizontal Navigation */}
          <Card style={styles.currentStepCard}>
            <View style={styles.currentStepHeader}>
              <View style={styles.currentStepIcon}>
                {currentStep.icon && (
                  <currentStep.icon size={24} color={Colors.primary.blue} />
                )}
              </View>
              <View style={styles.currentStepTitles}>
                <Text style={styles.currentStepTitle}>
                  {verificationSteps[currentStepIndex].title}
                </Text>
                <Text style={styles.currentStepDescription}>
                  {verificationSteps[currentStepIndex].description}
                </Text>
              </View>
              <Badge
                text={`Level ${currentStep.level}`}
                variant={currentStep.level === 1 ? 'success' : currentStep.level === 2 ? 'info' : 'premium'}
              />
            </View>

            {/* Custom Form with Horizontal Steps */}
            {currentStep.status !== 'pending' && (
              <CustomVerificationForm
                steps={[formSteps[currentStepIndex]]}
                initialData={formData}
                onSubmit={handleFormSubmit}
                onSaveDraft={handleSaveDraft}
                showProgress={false}
                verificationSteps={verificationSteps}
                currentStepIndex={currentStepIndex}
                onStepPress={handleStepPress}
              />
            )}

            {currentStep.status === 'pending' && (
              <View style={styles.pendingMessage}>
                <Award size={20} color={Colors.neutral.gray700} />
                <Text style={styles.pendingMessageText}>
                  Complete previous steps to unlock this verification level
                </Text>
              </View>
            )}
          </Card>

          {/* Document Uploader Section (for address step) */}
          {currentStep.id === 'address' && currentStep.status === 'current' && (
            <View style={styles.documentUploaderSection}>
              <Text style={styles.sectionTitle}>Upload Required Documents</Text>
              {/* <DocumentUploader
                title="Utility Bill"
                description="Recent utility bill (electricity, water, gas)"
                documentType="utility_bill"
                required={true}
                maxSizeMB={5}
                onUploadComplete={handleDocumentUpload}
                onUploadError={() => console.error('Upload error')}
              />
              <DocumentUploader
                title="Bank Statement"
                description="Recent bank statement showing your address"
                documentType="bank_statement"
                required={true}
                maxSizeMB={5}
                onUploadComplete={handleDocumentUpload}
                onUploadError={() => console.error('Upload error')}
              /> */}
            </View>
          )}

          {/* Benefits Section - Moved to bottom */}
          <Card style={styles.benefitsCard}>
            <View style={styles.benefitsHeader}>
              <Award size={24} color={Colors.primary.blue} />
              <Text style={styles.benefitsTitle}>Verification Benefits</Text>
            </View>
            
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitLevelBadge, { backgroundColor: Colors.status.verifiedGreen }]}>
                  <Text style={styles.benefitLevelText}>L1</Text>
                </View>
                <Text style={styles.benefitItemText}>KES 50,000 daily limit</Text>
                <CheckCircle size={16} color={Colors.status.verifiedGreen} />
              </View>
              
              <View style={styles.benefitItem}>
                <View style={[styles.benefitLevelBadge, { backgroundColor: Colors.primary.blue }]}>
                  <Text style={styles.benefitLevelText}>L2</Text>
                </View>
                <Text style={styles.benefitItemText}>KES 150,000 daily limit</Text>
                {currentLevel >= 2 ? (
                  <CheckCircle size={16} color={Colors.status.verifiedGreen} />
                ) : (
                  <Text style={styles.benefitLockedText}>Locked</Text>
                )}
              </View>
              
              <View style={styles.benefitItem}>
                <View style={[styles.benefitLevelBadge, { backgroundColor: Colors.status.premiumPurple }]}>
                  <Text style={styles.benefitLevelText}>L3</Text>
                </View>
                <Text style={styles.benefitItemText}>Unlimited transactions</Text>
                {currentLevel >= 3 ? (
                  <CheckCircle size={16} color={Colors.status.verifiedGreen} />
                ) : (
                  <Text style={styles.benefitLockedText}>Locked</Text>
                )}
              </View>
            </View>
            
            <TouchableOpacity style={styles.viewAllBenefitsButton}>
              <Text style={styles.viewAllBenefitsText}>View All Benefits</Text>
              <ArrowLeft size={16} color={Colors.primary.blue} style={styles.arrowIcon} />
            </TouchableOpacity>
          </Card>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            {currentStepIndex > 0 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => handleStepPress(currentStepIndex - 1)}
              >
                <ArrowLeft size={20} color={Colors.primary.blue} />
                <Text style={styles.navButtonText}>Previous Step</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.navSpacer} />
            
            {currentStepIndex < verificationSteps.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => handleStepPress(currentStepIndex + 1)}
              >
                <Text style={[styles.navButtonText, styles.nextButtonText]}>Next Step</Text>
                <ArrowLeft size={20} color={Colors.neutral.white} style={styles.nextIcon} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray50,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray700,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginRight: Spacing.sm,
  },
  unsavedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary.red + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  currentStepCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  currentStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  currentStepIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  currentStepTitles: {
    flex: 1,
  },
  currentStepTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: 2,
  },
  currentStepDescription: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
  },
  // Form Container Styles
  formContainer: {
    marginTop: Spacing.md,
  },
  formStepsHeader: {
    marginBottom: Spacing.lg,
  },
  formStepsScrollView: {
    height: 60,
  },
  formStepsContent: {
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  formStepIndicator: {
    width: 80,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    position: 'relative',
  },
  formStepIndicatorActive: {
    backgroundColor: Colors.primary.blue + '10',
    borderWidth: 1,
    borderColor: Colors.primary.blue,
  },
  formStepIndicatorCompleted: {
    backgroundColor: Colors.status.verifiedGreen + '10',
    borderWidth: 1,
    borderColor: Colors.status.verifiedGreen,
  },
  formStepIndicatorPending: {
    opacity: 0.6,
  },
  formStepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  formStepNumber: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    fontWeight: '600',
  },
  formStepNumberCompleted: {
    color: Colors.neutral.white,
  },
  formStepNumberActive: {
    color: Colors.primary.blue,
  },
  formStepTitle: {
    ...Typography.caption,
    color: Colors.neutral.gray900,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
  },
  formStepTitleActive: {
    color: Colors.primary.blue,
  },
  formStepTitleCompleted: {
    color: Colors.status.verifiedGreen,
  },
  formStepTitlePending: {
    color: Colors.neutral.gray500,
  },
  formActiveIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.blue,
  },
  formProgressContainer: {
    marginTop: Spacing.sm,
  },
  formProgressBarBg: {
    height: 6,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  formProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary.blue,
    borderRadius: BorderRadius.xs,
  },
  formProgressText: {
    ...Typography.caption,
    color: Colors.neutral.gray600,
    textAlign: 'center',
  },
  pendingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray200,
  },
  pendingMessageText: {
    ...Typography.bodySmall,
    color: Colors.neutral.gray700,
    flex: 1,
  },
  documentUploaderSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.md,
  },
  // Benefits Section
  benefitsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  benefitsTitle: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
  },
  benefitsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
  },
  benefitLevelBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitLevelText: {
    ...Typography.bodySmall,
    color: Colors.neutral.white,
    fontWeight: '700',
  },
  benefitItemText: {
    ...Typography.bodyMedium,
    color: Colors.neutral.gray900,
    flex: 1,
  },
  benefitLockedText: {
    ...Typography.caption,
    color: Colors.neutral.gray500,
    fontStyle: 'italic',
  },
  viewAllBenefitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  viewAllBenefitsText: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  arrowIcon: {
    transform: [{ rotate: '180deg' }],
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.gray300,
    backgroundColor: Colors.neutral.white,
  },
  nextButton: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  navButtonText: {
    ...Typography.bodyMedium,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  nextButtonText: {
    color: Colors.neutral.white,
  },
  nextIcon: {
    transform: [{ rotate: '180deg' }],
  },
  navSpacer: {
    flex: 1,
  },
  footer: {
    height: Spacing.xl,
  },
});