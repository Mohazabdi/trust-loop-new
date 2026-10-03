export const mockSecuritySessions = [
  {
    id: '1',
    deviceType: 'smartphone' as const,
    deviceName: 'iPhone 14 Pro',
    location: 'Nairobi',
    browser: 'Safari',
    lastActive: 'Now active',
    isCurrent: true,
  },
  {
    id: '2',
    deviceType: 'laptop' as const,
    deviceName: 'MacBook Air',
    location: 'London',
    browser: 'Safari',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
  {
    id: '3',
    deviceType: 'smartphone' as const,
    deviceName: 'Samsung Galaxy S21',
    location: 'Mombasa',
    browser: 'Chrome',
    lastActive: '1 day ago',
    isCurrent: false,
  },
];

export const mockSecurityFeatures = [
  {
    id: '1',
    title: 'PIN Protection',
    enabled: true,
    subtitle: 'Change',
  },
  {
    id: '2',
    title: 'Biometric Login',
    enabled: true,
    subtitle: 'Face ID enabled',
  },
  {
    id: '3',
    title: '2FA',
    enabled: false,
    subtitle: 'Set Up',
  },
  {
    id: '4',
    title: 'Login Alerts',
    enabled: true,
    subtitle: 'Email & SMS',
  },
];

export const mockSecurityTips = [
  'Use a strong PIN (6+ digits)',
  'Enable biometric login',
  'Review active sessions monthly',
  'Set up login alerts',
];
