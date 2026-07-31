import { useColorScheme } from 'react-native';

const lightColors = {
  primary: {
    blue: '#3B82F6',
    green: '#10B981',
    red: '#EF4444',
    yellow: '#F59E0B',
    indigo: '#6366F1',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  neutral: {
    white: '#FFFFFF',
    gray25: '#FCFCFD',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#000000',
  },
  status: {
    verifiedGreen: '#059669',
    verifiedLightGreen: '#D1FAE5',
    pendingOrange: '#EA580C',
    pendingLightOrange: '#FFEDD5',
    securityBlue: '#2563EB',
    securityLightBlue: '#DBEAFE',
    premiumPurple: '#7C3AED',
    premiumLightPurple: '#EDE9FE',
    warningYellow: '#F59E0B',
    warningLightYellow: '#FEF3C7',
    errorRed: '#DC2626',
    errorLightRed: '#FEE2E2',
    successGreen: '#10B981',
    successLightGreen: '#D1FAE5',
    infoBlue: '#0EA5E9',
    infoLightBlue: '#E0F2FE',
  },
  verification: {
    level1: '#059669',
    level1Light: '#D1FAE5',
    level2: '#2563EB',
    level2Light: '#DBEAFE',
    level3: '#7C3AED',
    level3Light: '#EDE9FE',
    level4: '#F59E0B',
    level4Light: '#FEF3C7',
    level5: '#EC4899',
    level5Light: '#FCE7F3',
  },
  semantic: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      inverse: '#111827',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      tertiary: '#6B7280',
      disabled: '#9CA3AF',
      inverse: '#FFFFFF',
      link: '#3B82F6',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
    },
    border: {
      default: '#E5E7EB',
      strong: '#D1D5DB',
      focus: '#3B82F6',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
    },
    icon: {
      default: '#6B7280',
      active: '#3B82F6',
      disabled: '#9CA3AF',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
    },
  },
};

const darkColors = {
  primary: {
    blue: '#60A5FA',
    green: '#34D399',
    red: '#F87171',
    yellow: '#FBBF24',
    indigo: '#818CF8',
    purple: '#A78BFA',
    pink: '#F472B6',
  },
  neutral: {
    white: '#111827',
    gray25: '#1F2937',
    gray50: '#111827',
    gray100: '#1F2937',
    gray200: '#374151',
    gray300: '#4B5563',
    gray400: '#6B7280',
    gray500: '#9CA3AF',
    gray600: '#D1D5DB',
    gray700: '#E5E7EB',
    gray800: '#F3F4F6',
    gray900: '#F9FAFB',
    black: '#FFFFFF',
  },
  status: {
    verifiedGreen: '#34D399',
    verifiedLightGreen: '#065F46',
    pendingOrange: '#FB923C',
    pendingLightOrange: '#7C2D12',
    securityBlue: '#60A5FA',
    securityLightBlue: '#1E40AF',
    premiumPurple: '#A78BFA',
    premiumLightPurple: '#5B21B6',
    warningYellow: '#FBBF24',
    warningLightYellow: '#92400E',
    errorRed: '#F87171',
    errorLightRed: '#7F1D1D',
    successGreen: '#34D399',
    successLightGreen: '#065F46',
    infoBlue: '#38BDF8',
    infoLightBlue: '#0C4A6E',
  },
  verification: {
    level1: '#34D399',
    level1Light: '#065F46',
    level2: '#60A5FA',
    level2Light: '#1E40AF',
    level3: '#A78BFA',
    level3Light: '#5B21B6',
    level4: '#FBBF24',
    level4Light: '#92400E',
    level5: '#F472B6',
    level5Light: '#831843',
  },
  semantic: {
    background: {
      primary: '#111827',
      secondary: '#1F2937',
      tertiary: '#374151',
      inverse: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#E5E7EB',
      tertiary: '#D1D5DB',
      disabled: '#6B7280',
      inverse: '#111827',
      link: '#60A5FA',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
    },
    border: {
      default: '#374151',
      strong: '#4B5563',
      focus: '#60A5FA',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
    },
    icon: {
      default: '#9CA3AF',
      active: '#60A5FA',
      disabled: '#4B5563',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
    },
  },
};

export function useThemeColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

export const Colors = lightColors;

export function getThemedColor(colorScheme: 'light' | 'dark' | null) {
  return colorScheme === 'dark' ? darkColors : lightColors;
}

export const Typography = {
  displayLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.02,
  },
  displayMedium: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.01,
  },
  heading1: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.01,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  heading4: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyLargeBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMediumBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  bodySmallBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 13,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  micro: {
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 12,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  buttonLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  buttonMedium: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
};

export const Spacing = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  // Semantic spacing
  container: 20,
  section: 32,
  component: 16,
  element: 12,
  icon: 8,
  // Layout spacing
  safeArea: 20,
  screenPadding: 16,
  cardPadding: 16,
  buttonPadding: 12,
};

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
  // Semantic radii
  button: 8,
  card: 12,
  input: 8,
  badge: 4,
  avatar: 999,
  modal: 16,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level0: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Specific shadows
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
};

// Design system animation tokens (durations in ms)
export const MotionDuration = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  deliberate: 700,
  // Semantic durations
  transitionFast: 200,
  transitionNormal: 300,
  transitionSlow: 500,
  animationShort: 150,
  animationMedium: 300,
  animationLong: 500,
};

// Easing tokens (cubic-bezier values)
export const MotionEasing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  deceleration: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  acceleration: 'cubic-bezier(0.4, 0.0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Animation values for React Native Animated
export const MotionValues = {
  tension: {
    low: 40,
    normal: 50,
    high: 70,
  },
  friction: {
    low: 3,
    normal: 7,
    high: 15,
  },
};

// Verification specific constants
export const Verification = {
  statusColors: {
    completed: {
      background: lightColors.status.verifiedLightGreen,
      text: lightColors.status.verifiedGreen,
      border: lightColors.status.verifiedGreen,
      icon: lightColors.status.verifiedGreen,
    },
    current: {
      background: lightColors.status.securityLightBlue,
      text: lightColors.primary.blue,
      border: lightColors.primary.blue,
      icon: lightColors.primary.blue,
    },
    pending: {
      background: lightColors.neutral.gray100,
      text: lightColors.neutral.gray600,
      border: lightColors.neutral.gray300,
      icon: lightColors.neutral.gray400,
    },
    failed: {
      background: lightColors.status.errorLightRed,
      text: lightColors.primary.red,
      border: lightColors.primary.red,
      icon: lightColors.primary.red,
    },
  },
  levelColors: {
    1: {
      primary: lightColors.verification.level1,
      secondary: lightColors.verification.level1Light,
      text: lightColors.neutral.white,
    },
    2: {
      primary: lightColors.verification.level2,
      secondary: lightColors.verification.level2Light,
      text: lightColors.neutral.white,
    },
    3: {
      primary: lightColors.verification.level3,
      secondary: lightColors.verification.level3Light,
      text: lightColors.neutral.white,
    },
    4: {
      primary: lightColors.verification.level4,
      secondary: lightColors.verification.level4Light,
      text: lightColors.neutral.gray900,
    },
    5: {
      primary: lightColors.verification.level5,
      secondary: lightColors.verification.level5Light,
      text: lightColors.neutral.white,
    },
  },
  progress: {
    height: {
      small: 4,
      medium: 6,
      large: 8,
      xlarge: 12,
    },
    borderRadius: BorderRadius.xs,
  },
};

// Form specific constants
export const Form = {
  input: {
    height: {
      small: 36,
      medium: 44,
      large: 52,
    },
    padding: {
      horizontal: Spacing.md,
      vertical: Spacing.sm,
    },
    borderRadius: BorderRadius.input,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  error: {
    marginTop: Spacing.xs,
  },
};

// Document uploader specific constants
export const DocumentUploader = {
  maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
  allowedTypes: {
    images: ['image/jpeg', 'image/png', 'image/jpg'],
    pdf: ['application/pdf'],
    all: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  },
  requirements: {
    maxSize: '5MB',
    formats: 'JPG, PNG, PDF',
  },
};

// Badge specific constants
export const Badge = {
  variants: {
    success: {
      background: lightColors.status.successLightGreen,
      text: lightColors.status.successGreen,
    },
    warning: {
      background: lightColors.status.warningLightYellow,
      text: lightColors.status.warningYellow,
    },
    error: {
      background: lightColors.status.errorLightRed,
      text: lightColors.status.errorRed,
    },
    info: {
      background: lightColors.status.infoLightBlue,
      text: lightColors.status.infoBlue,
    },
    neutral: {
      background: lightColors.neutral.gray100,
      text: lightColors.neutral.gray700,
    },
    premium: {
      background: lightColors.status.premiumLightPurple,
      text: lightColors.status.premiumPurple,
    },
  },
  sizes: {
    small: {
      paddingVertical: Spacing.xxs,
      paddingHorizontal: Spacing.xs,
      fontSize: Typography.micro.fontSize,
    },
    medium: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      fontSize: Typography.caption.fontSize,
    },
    large: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: Typography.bodySmall.fontSize,
    },
  },
};

// Card specific constants
export const Card = {
  variants: {
    elevated: Shadows.card,
    outline: {
      borderWidth: 1,
      borderColor: lightColors.semantic.border.default,
    },
    filled: {
      backgroundColor: lightColors.semantic.background.secondary,
    },
  },
  padding: {
    small: Spacing.md,
    medium: Spacing.lg,
    large: Spacing.xl,
  },
};

// Layout constants
export const Layout = {
  screen: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.safeArea,
  },
  container: {
    maxWidth: 768,
    padding: Spacing.container,
  },
  grid: {
    columnGap: Spacing.md,
    rowGap: Spacing.lg,
  },
  flex: {
    gap: {
      small: Spacing.xs,
      medium: Spacing.md,
      large: Spacing.lg,
    },
  },
};

// Z-index constants
export const ZIndex = {
  base: 0,
  elevated: 10,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
};

// Icon sizes
export const IconSize = {
  xxs: 12,
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  xxxl: 64,
};

// Avatar sizes
export const AvatarSize = {
  xxs: 24,
  xs: 32,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  xxl: 96,
};

// Breakpoints (for responsive design)
export const Breakpoints = {
  xs: 320,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1440,
};

// Opacity values
export const Opacity = {
  0: 0,
  10: 0.1,
  20: 0.2,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  80: 0.8,
  90: 0.9,
  100: 1,
  disabled: 0.5,
  hover: 0.8,
  pressed: 0.6,
};

// Helper functions
export const ColorUtils = {
  // Convert hex to rgba
  hexToRgba: (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  // Get status color based on verification level
  getVerificationColor: (level: number, theme: 'light' | 'dark' = 'light') => {
    const colors = theme === 'dark' ? darkColors : lightColors;
    switch (level) {
      case 1: return colors.verification.level1;
      case 2: return colors.verification.level2;
      case 3: return colors.verification.level3;
      case 4: return colors.verification.level4;
      case 5: return colors.verification.level5;
      default: return colors.primary.blue;
    }
  },

  // Get status color based on verification status
  getStatusColor: (status: string, theme: 'light' | 'dark' = 'light') => {
    const colors = theme === 'dark' ? darkColors : lightColors;
    switch (status) {
      case 'completed': return colors.status.verifiedGreen;
      case 'current': return colors.primary.blue;
      case 'pending': return colors.neutral.gray500;
      case 'failed': return colors.primary.red;
      default: return colors.neutral.gray500;
    }
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  MotionDuration,
  MotionEasing,
  MotionValues,
  Verification,
  Form,
  DocumentUploader,
  Badge,
  Card,
  Layout,
  ZIndex,
  IconSize,
  AvatarSize,
  Breakpoints,
  Opacity,
  ColorUtils,
  useThemeColors,
  getThemedColor,
};