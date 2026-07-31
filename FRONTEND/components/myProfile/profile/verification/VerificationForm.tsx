import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Home,
  Briefcase,
  Building,
  Mail,
  Phone,
  Calendar,
  Globe,
  MapPin,
  CreditCard,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  HelpCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Custom Theme Colors
const AppColors = {
  // Primary Colors
  primary: {
    blue: '#4361EE',
    purple: '#7209B7',
    teal: '#3A86FF',
    gradient: ['#4361EE', '#3A86FF', '#7209B7'] as [string, string, string],
  },
  
  // Secondary Colors
  secondary: {
    success: '#06D6A0',
    warning: '#FFD166',
    error: '#EF476F',
    info: '#118AB2',
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    gray50: '#F8F9FA',
    gray100: '#E9ECEF',
    gray200: '#DEE2E6',
    gray300: '#CED4DA',
    gray400: '#ADB5BD',
    gray500: '#6C757D',
    gray600: '#495057',
    gray700: '#343A40',
    gray800: '#212529',
    black: '#000000',
  },
  
  // Background Colors
  background: {
    light: '#F8F9FA',
    dark: '#121212',
    card: '#FFFFFF',
    cardDark: '#1E1E1E',
  },
  
  // Special Colors
  special: {
    glow: 'rgba(67, 97, 238, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  }
};

// Spacing Scale
const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

// Typography
const Typography = {
  display: {
    fontSize: 32,
    fontWeight: '700' as '700',
    lineHeight: 40,
  },
  heading1: {
    fontSize: 28,
    fontWeight: '700' as '700',
    lineHeight: 36,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '600' as '600',
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600' as '600',
    lineHeight: 28,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as '400',
    lineHeight: 26,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400' as '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as '400',
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as '500',
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as '600',
    lineHeight: 24,
  },
};

// Types
export type FormStep = {
  id: string;
  title: string;
  description: string;
  icon?: string;
  fields: FormField[];
  requiredDocuments?: string[];
  completionMessage?: string;
};

export type FormField = {
  id: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'number' | 'password' | 'file';
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: string) => string | null;
  };
  options?: { label: string; value: string; icon?: string }[];
  value?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
};

export interface VerificationFormProps {
  steps: FormStep[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<{ success: boolean; message?: string }>;
  onSaveDraft?: (data: Record<string, any>) => Promise<void>;
  onStepChange?: (stepIndex: number) => void;
  autoSaveInterval?: number;
  showProgress?: boolean;
  showStepIndicator?: boolean;
  enableHaptics?: boolean;
  theme?: 'light' | 'dark';
  submitButtonText?: string;
  saveButtonText?: string;
  maxWidth?: number;
}

// Icon mapping function
const getFieldIcon = (type: string, customIcon?: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    text: User,
    email: Mail,
    phone: Phone,
    date: Calendar,
    select: ChevronRight,
    textarea: FileText,
    number: CreditCard,
    password: Eye,
    file: Upload,
    name: User,
    address: Home,
    city: MapPin,
    country: Globe,
    occupation: Briefcase,
    company: Building,
    income: CreditCard,
  };

  if (customIcon && iconMap[customIcon]) {
    return iconMap[customIcon];
  }
  
  return iconMap[type] || FileText;
};

export function VerificationForm({
  steps,
  initialData = {},
  onSubmit,
  onSaveDraft,
  onStepChange,
  autoSaveInterval = 30000,
  showProgress = true,
  showStepIndicator = true,
  enableHaptics = true,
  theme = 'light',
  submitButtonText = 'Complete Verification',
  saveButtonText = 'Save Progress',
  maxWidth = 800,
}: VerificationFormProps) {
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [activeSelectField, setActiveSelectField] = useState<string | null>(null);

  // Refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<Record<string, TextInput>>({});

  // Constants
  const currentStepData = steps[currentStep];
  const totalSteps = steps.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const isDark = theme === 'dark';

  // Styles based on theme
  const themeStyles = useMemo(() => ({
    background: isDark ? AppColors.background.dark : AppColors.background.light,
    card: isDark ? AppColors.background.cardDark : AppColors.background.card,
    text: {
      primary: isDark ? AppColors.neutral.white : AppColors.neutral.gray800,
      secondary: isDark ? AppColors.neutral.gray400 : AppColors.neutral.gray600,
      muted: isDark ? AppColors.neutral.gray500 : AppColors.neutral.gray400,
      error: AppColors.secondary.error,
      success: AppColors.secondary.success,
    },
    border: isDark ? AppColors.neutral.gray700 : AppColors.neutral.gray200,
    input: {
      background: isDark ? AppColors.neutral.gray800 : AppColors.neutral.white,
      border: isDark ? AppColors.neutral.gray600 : AppColors.neutral.gray300,
      placeholder: isDark ? AppColors.neutral.gray500 : AppColors.neutral.gray400,
    }
  }), [isDark]);

  // Check for changes
  const hasChanges = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft || !hasChanges()) return;

    setIsSaving(true);
    try {
      await onSaveDraft({
        ...formData,
        lastStep: currentStep,
        savedAt: new Date().toISOString(),
      });
      
      if (enableHaptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Save Failed', 'Unable to save your progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [onSaveDraft, hasChanges, formData, currentStep, enableHaptics]);

  // Auto-save functionality
  useEffect(() => {
    if (!onSaveDraft) return;

    const saveInterval = setInterval(async () => {
      if (hasChanges()) {
        await handleSaveDraft();
      }
    }, autoSaveInterval);

    return () => clearInterval(saveInterval);
  }, [autoSaveInterval, onSaveDraft, hasChanges, handleSaveDraft]);

  // Progress animation - FIXED: Use simple timing animation
  useEffect(() => {
    // Use Animated.timing for simple progress animation
    Animated.timing(progressAnim, {
      toValue: progressPercentage / 100, // Convert to 0-1 range
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [progressPercentage, progressAnim]);

  // Slide animation on step change - FIXED: Use proper spring configuration
  useEffect(() => {
    if (enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    slideAnim.setValue(currentStep > 0 ? -50 : 50);
    // Use only tension/friction parameters
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, enableHaptics, onStepChange, slideAnim]);

  // Validation
  const validateField = useCallback((field: FormField, value: string): string | null => {
    if (field.required && !value?.toString().trim()) {
      return 'This field is required';
    }

    if (field.validation) {
      const { pattern, minLength, maxLength, min, max, custom } = field.validation;
      const stringValue = value?.toString() || '';

      if (pattern && !pattern.test(stringValue)) {
        return 'Invalid format';
      }

      if (minLength && stringValue.length < minLength) {
        return `Minimum ${minLength} characters required`;
      }

      if (maxLength && stringValue.length > maxLength) {
        return `Maximum ${maxLength} characters allowed`;
      }

      if (min !== undefined && Number(value) < min) {
        return `Minimum value is ${min}`;
      }

      if (max !== undefined && Number(value) > max) {
        return `Maximum value is ${max}`;
      }

      if (custom) {
        return custom(stringValue);
      }
    }

    return null;
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    currentStepData.fields.forEach((field) => {
      const value = formData[field.id] || '';
      const error = validateField(field, value);

      if (error) {
        errors[field.id] = error;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  }, [currentStepData, formData, validateField]);

  // Handlers
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error for this field
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        ...formData,
        submittedAt: new Date().toISOString(),
        verificationId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      setSubmissionResult(result);
      
      if (result.success) {
        if (enableHaptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // FIXED: Use proper spring configuration for success animation
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
        setShowSuccess(true);
        
        // Auto-hide success modal after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        Alert.alert('Submission Failed', result.message || 'An error occurred during submission.');
      }
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [validateCurrentStep, onSubmit, formData, enableHaptics, successAnim]);

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('Validation Error', 'Please fix all errors before continuing.');
      if (enableHaptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [validateCurrentStep, currentStep, totalSteps, handleSubmit, enableHaptics]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const togglePasswordVisibility = useCallback((fieldId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  }, []);

  const handleSelectOption = useCallback((fieldId: string, value: string) => {
    handleFieldChange(fieldId, value);
    setSelectModalVisible(false);
    setActiveSelectField(null);
  }, [handleFieldChange]);

  // Render field icon
  const renderFieldIcon = useCallback((field: FormField) => {
    const Icon = getFieldIcon(field.type, field.id);
    return <Icon size={20} color={themeStyles.text.muted} />;
  }, [themeStyles]);

  // Render step indicator icon
  const renderStepIndicatorIcon = useCallback((step: FormStep, index: number) => {
    if (step.icon) {
      const Icon = getFieldIcon(step.icon);
      return <Icon size={16} color={AppColors.neutral.white} />;
    }
    return <Text style={styles.stepIndicatorNumber as any}>{index + 1}</Text>;
  }, []);

  // Render select field options
  const renderSelectOptions = () => {
    if (!activeSelectField) return null;
    
    const field = currentStepData.fields.find(f => f.id === activeSelectField);
    if (!field?.options) return null;

    return (
      <Modal
        visible={selectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectModalVisible(false);
          setActiveSelectField(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeStyles.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeStyles.text.primary }]}>
                Select {field.label}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectModalVisible(false);
                  setActiveSelectField(null);
                }}
                style={styles.modalCloseButton}
              >
                <XCircle size={24} color={themeStyles.text.muted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={field.options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const OptionIcon = item.icon ? getFieldIcon(item.icon) : null;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      formData[field.id] === item.value && styles.optionItemSelected,
                      { borderBottomColor: themeStyles.border }
                    ]}
                    onPress={() => handleSelectOption(field.id, item.value)}
                  >
                    {OptionIcon && (
                      <OptionIcon 
                        size={18} 
                        color={formData[field.id] === item.value ? 
                          AppColors.primary.blue : themeStyles.text.secondary} 
                      />
                    )}
                    <Text style={[
                      styles.optionText,
                      { color: themeStyles.text.primary },
                      formData[field.id] === item.value && styles.optionTextSelected
                    ]}>
                      {item.label}
                    </Text>
                    {formData[field.id] === item.value && (
                      <CheckCircle size={18} color={AppColors.secondary.success} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Animated values - FIXED: Use transform scale instead of width percentage
  const progressScale = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeStyles.background, maxWidth }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Progress Section */}
      {showProgress && (
        <LinearGradient
          colors={isDark ? ['#1E1E1E', '#2D2D2D'] : AppColors.primary.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.progressContainer as any}
        >
          <View style={styles.progressHeader}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>
                STEP {currentStep + 1}/{totalSteps}
              </Text>
            </View>
            <View style={styles.progressStats}>
              <Clock size={14} color={AppColors.neutral.white} />
              <Text style={styles.progressStatsText}>
                {Math.round(progressPercentage)}% Complete
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  {
                    transform: [{ scaleX: progressScale }],
                    width: '100%',
                  }
                ]} 
              />
            </View>
            <View style={styles.progressDots}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index <= currentStep && styles.progressDotActive,
                    index === currentStep && styles.progressDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle as any}>{currentStepData.title}</Text>
            <Text style={styles.stepDescription as any}>{currentStepData.description}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Step Indicator */}
      {showStepIndicator && (
        <View style={[styles.stepIndicatorContainer, { backgroundColor: themeStyles.card }]}>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepIndicatorItem,
                index === currentStep && styles.stepIndicatorItemActive,
              ]}
              onPress={() => index <= currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
            >
              <View style={[
                styles.stepIndicatorIcon,
                index <= currentStep && styles.stepIndicatorIconActive,
              ]}>
                {renderStepIndicatorIcon(step, index)}
              </View>
              <Text style={[
                styles.stepIndicatorLabel as any,
                { color: themeStyles.text.secondary },
                index === currentStep && styles.stepIndicatorLabelActive,
              ]}>
                {step.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Form Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content as any}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.formContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {currentStepData.fields.map((field) => (
            <View key={field.id} style={styles.fieldContainer}>
              {/* Field Header */}
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelContainer}>
                  {renderFieldIcon(field)}
                  <Text style={[styles.fieldLabel as any, { color: themeStyles.text.primary }]}>
                    {field.label}
                    {field.required && <Text style={styles.requiredStar}> *</Text>}
                </Text>
                </View>
                
                {field.helperText && (
                  <TouchableOpacity style={styles.helperButton}>
                    <HelpCircle size={16} color={themeStyles.text.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Helper Text */}
              {field.helperText && (
                <Text style={[styles.helperText, { color: themeStyles.text.secondary }]}>
                  {field.helperText}
                </Text>
              )}

              {/* Input Container */}
              {field.type === 'select' ? (
                <TouchableOpacity
                  style={[
                    styles.selectContainer,
                    { 
                      backgroundColor: themeStyles.input.background,
                      borderColor: formErrors[field.id] ? 
                        AppColors.secondary.error : themeStyles.input.border,
                    }
                  ]}
                  onPress={() => {
                    setActiveSelectField(field.id);
                    setSelectModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.selectText as any,
                    { color: formData[field.id] ? themeStyles.text.primary : themeStyles.input.placeholder }
                  ]}>
                    {formData[field.id] ? 
                      field.options?.find(opt => opt.value === formData[field.id])?.label || formData[field.id] :
                      field.placeholder || `Select ${field.label.toLowerCase()}`
                    }
                  </Text>
                  <ChevronRight size={20} color={themeStyles.text.muted} style={styles.selectArrow} />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.inputWrapper,
                    formErrors[field.id] && styles.inputWrapperError,
                  ]}
                >
                  {field.prefix && (
                    <Text style={[styles.prefix as any, { color: themeStyles.text.secondary }]}>
                      {field.prefix}
                    </Text>
                  )}

                  <TextInput
                    ref={(ref) => {
                      if (ref) {
                        inputRefs.current[field.id] = ref;
                      }
                    }}
                    style={[
                      styles.input as any,
                      { 
                        color: themeStyles.text.primary,
                        backgroundColor: themeStyles.input.background,
                        minHeight: field.multiline ? (field.rows || 4) * 24 : 56,
                      }
                    ]}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={themeStyles.input.placeholder}
                    value={formData[field.id]?.toString() || ''}
                    onChangeText={(value) => handleFieldChange(field.id, value)}
                    editable={!isSubmitting}
                    multiline={field.multiline || field.type === 'textarea'}
                    numberOfLines={field.multiline ? field.rows || 4 : 1}
                    secureTextEntry={field.type === 'password' && !showPassword[field.id]}
                    keyboardType={
                      field.type === 'email' ? 'email-address' :
                      field.type === 'phone' ? 'phone-pad' :
                      field.type === 'number' ? 'numeric' : 'default'
                    }
                    autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                    autoComplete={field.autoComplete as any}
                    textAlignVertical={field.multiline ? 'top' : 'center'}
                  />

                  {field.type === 'password' && (
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => togglePasswordVisibility(field.id)}
                    >
                      {showPassword[field.id] ? (
                        <EyeOff size={20} color={themeStyles.text.muted} />
                      ) : (
                        <Eye size={20} color={themeStyles.text.muted} />
                      )}
                    </TouchableOpacity>
                  )}

                  {field.suffix && (
                    <Text style={[styles.suffix as any, { color: themeStyles.text.secondary }]}>
                      {field.suffix}
                    </Text>
                  )}
                </View>
              )}

              {/* Error Message */}
              {formErrors[field.id] && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color={AppColors.secondary.error} />
                  <Text style={styles.errorText}>{formErrors[field.id]}</Text>
                </View>
              )}
            </View>
          ))}
        </Animated.View>

        {/* Auto-save Indicator */}
        {onSaveDraft && hasChanges() && (
          <View style={styles.autoSaveIndicator}>
            <Clock size={14} color={themeStyles.text.muted} />
            <Text style={[styles.autoSaveText, { color: themeStyles.text.muted }]}>
              Auto-save {autoSaveInterval / 1000}s
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: themeStyles.card, borderTopColor: themeStyles.border }]}>
        <View style={styles.navigationButtons}>
          {/* Back Button */}
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: themeStyles.border }]}
              onPress={handlePrevious}
              disabled={isSubmitting}
            >
              <ChevronLeft size={20} color={AppColors.primary.blue} />
              <Text style={[styles.secondaryButtonText as any, { color: AppColors.primary.blue }]}>
                Previous
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.spacer} />

          {/* Save Draft Button */}
          {onSaveDraft && hasChanges() && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: themeStyles.text.muted }]}
              onPress={handleSaveDraft}
              disabled={isSaving || isSubmitting}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={AppColors.neutral.white} />
              ) : (
                <Save size={20} color={AppColors.neutral.white} />
              )}
              <Text style={styles.saveButtonText as any}>
                {isSaving ? 'Saving...' : saveButtonText}
              </Text>
            </TouchableOpacity>
          )}

          {/* Next/Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitting && styles.primaryButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={AppColors.neutral.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText as any}>
                  {currentStep === totalSteps - 1 ? submitButtonText : 'Continue'}
                </Text>
                <ChevronRight size={20} color={AppColors.neutral.white} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Step Counter */}
        <View style={styles.stepCounter}>
          <Text style={[styles.stepCounterText as any, { color: themeStyles.text.secondary }]}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View 
            style={[
              styles.successModal,
              {
                opacity: successAnim,
                transform: [{
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={[AppColors.secondary.success, '#06C693']}
              style={styles.successIconContainer as any}
            >
              <CheckCircle size={48} color={AppColors.neutral.white} />
            </LinearGradient>
            
            <Text style={styles.successTitle as any}>Verification Submitted!</Text>
            <Text style={styles.successMessage as any}>
              {submissionResult?.message || 'Your information has been successfully submitted for verification.'}
            </Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successButtonText as any}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Select Options Modal */}
      {renderSelectOptions()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center' as 'center',
    width: '100%',
    maxWidth: 800,
  },
  
  // Progress Section
  progressContainer: {
    padding: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  progressHeader: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    marginBottom: Spacing.md,
  },
  stepIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  stepIndicatorText: {
    ...Typography.caption,
    color: AppColors.neutral.white,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressStats: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.xs,
  },
  progressStatsText: {
    ...Typography.caption,
    color: AppColors.neutral.white,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.xs,
    overflow: 'hidden' as 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.neutral.white,
    borderRadius: BorderRadius.xs,
    transformOrigin: 'left' as 'left',
  },
  progressDots: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: AppColors.neutral.white,
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepInfo: {
    alignItems: 'center' as 'center',
  },
  stepTitle: {
    ...Typography.heading2,
    color: AppColors.neutral.white,
    textAlign: 'center' as 'center',
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center' as 'center',
    lineHeight: 22,
  },

  // Step Indicator
  stepIndicatorContainer: {
    flexDirection: 'row' as 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.neutral.gray200,
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIndicatorItem: {
    flex: 1,
    alignItems: 'center' as 'center',
    opacity: 0.5,
  },
  stepIndicatorItemActive: {
    opacity: 1,
  },
  stepIndicatorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.neutral.gray300,
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    marginBottom: Spacing.xs,
  },
  stepIndicatorIconActive: {
    backgroundColor: AppColors.primary.blue,
  },
  stepIndicatorNumber: {
    ...Typography.caption,
    color: AppColors.neutral.white,
    fontWeight: '600',
  },
  stepIndicatorLabel: {
    ...Typography.caption,
    textAlign: 'center' as 'center',
    fontSize: 10,
  },
  stepIndicatorLabelActive: {
    color: AppColors.primary.blue,
    fontWeight: '600',
  },

  // Form Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldHeader: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    marginBottom: Spacing.xs,
  },
  fieldLabelContainer: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.label,
    fontSize: 15,
    fontWeight: '600',
  },
  requiredStar: {
    color: AppColors.secondary.error,
  },
  helperButton: {
    padding: Spacing.xs,
  },
  helperText: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },

  // Input Styles
  inputWrapper: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    borderWidth: 1,
    borderColor: AppColors.neutral.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.neutral.white,
    overflow: 'hidden' as 'hidden',
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: AppColors.secondary.error,
    backgroundColor: '#FEE2E220',
    shadowColor: AppColors.secondary.error,
    shadowOpacity: 0.1,
  },
  selectContainer: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'space-between' as 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  selectArrow: {
    transform: [{ rotate: '90deg' }],
  },
  prefix: {
    ...Typography.bodyMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  suffix: {
    ...Typography.bodyMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  input: {
    flex: 1,
    padding: Spacing.md,
    ...Typography.bodyMedium,
    minHeight: 56,
  },
  passwordToggle: {
    padding: Spacing.md,
  },

  // Error Styles
  errorContainer: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    color: AppColors.secondary.error,
    flex: 1,
  },

  // Auto-save Indicator
  autoSaveIndicator: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(67, 97, 238, 0.05)',
  },
  autoSaveText: {
    ...Typography.caption,
    fontWeight: '500',
  },

  // Footer Navigation
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationButtons: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    marginBottom: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minWidth: 120,
  },
  secondaryButtonText: {
    ...Typography.button,
  },
  saveButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    minWidth: 140,
  },
  saveButtonText: {
    ...Typography.button,
    color: AppColors.neutral.white,
  },
  primaryButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.primary.blue,
    borderRadius: BorderRadius.md,
    minWidth: 160,
    shadowColor: AppColors.primary.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.button,
    color: AppColors.neutral.white,
  },
  stepCounter: {
    alignItems: 'center' as 'center',
  },
  stepCounterText: {
    ...Typography.caption,
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    padding: Spacing.xl,
  },
  successModal: {
    backgroundColor: AppColors.neutral.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center' as 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: AppColors.special.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.heading2,
    color: AppColors.neutral.gray800,
    textAlign: 'center' as 'center',
    marginBottom: Spacing.sm,
  },
  successMessage: {
    ...Typography.bodyMedium,
    color: AppColors.neutral.gray600,
    textAlign: 'center' as 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  successButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.primary.blue,
    borderRadius: BorderRadius.md,
    minWidth: 120,
  },
  successButtonText: {
    ...Typography.button,
    color: AppColors.neutral.white,
  },

  // Select Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.neutral.gray200,
  },
  modalTitle: {
    ...Typography.heading3,
    flex: 1,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  optionItem: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(67, 97, 238, 0.05)',
  },
  optionText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  optionTextSelected: {
    color: AppColors.primary.blue,
    fontWeight: '600',
  },
});