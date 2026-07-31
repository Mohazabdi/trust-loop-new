export const mockWallets = [
  {
    id: '1',
    name: 'Primary Wallet',
    totalBalance: 125000,
    bookBalance: 125000,
    availableBalance: 120000,
    walletNumber: 'WLT-01-123-456',
    isActive: true,
  },
  {
    id: '2',
    name: 'Business Wallet',
    totalBalance: 450000,
    bookBalance: 450000,
    availableBalance: 445000,
    walletNumber: 'WLT-01-789-012',
    isActive: false,
  },
];

export const mockAccounts = [
  {
    id: '1',
    walletId: '1',
    name: 'Personal Account',
    number: 'TL-01-123-456',
    availableBalance: 80000,
    status: 'Active',
    type: 'Personal Account',
    icon: 'user' as const,
  },
  {
    id: '2',
    walletId: '1',
    name: 'Savings Account',
    number: 'TL-01-456-789',
    availableBalance: 30000,
    status: 'Active',
    type: 'Savings',
    icon: 'piggybank' as const,
  },
  {
    id: '3',
    walletId: '1',
    name: 'Overdraft Account',
    number: 'TL-01-987-654',
    availableBalance: 15000,
    status: 'Active',
    type: 'Overdraft',
    icon: 'creditcard' as const,
  },
];

export const mockTransactions = [
  {
    id: '1',
    type: 'deposit' as const,
    title: 'M-Pesa Deposit',
    reference: 'TRX-202312-1000001',
    amount: 25000,
    date: 'Dec 10',
    timestamp: '2023-12-10T10:30:00Z',
  },
  {
    id: '2',
    type: 'transfer' as const,
    title: 'Transfer to John',
    reference: 'TRX-202312-1000002',
    amount: -5000,
    date: 'Dec 9',
    timestamp: '2023-12-09T14:15:00Z',
  },
  {
    id: '3',
    type: 'withdrawal' as const,
    title: 'ATM Withdrawal',
    reference: 'TRX-202312-1000003',
    amount: -10000,
    date: 'Dec 8',
    timestamp: '2023-12-08T09:20:00Z',
  },
];
