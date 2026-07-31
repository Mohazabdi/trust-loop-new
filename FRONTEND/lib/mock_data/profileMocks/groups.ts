export const mockGroups = [
  {
    id: '1',
    name: 'Family Investment Group',
    groupNumber: 'GRP-01-123-456',
    role: 'TREASURER',
    totalBalance: 1250000,
    memberCount: 12,
    monthlyContribution: 10000,
    image: 'FIG',
    isPending: false,
  },
  {
    id: '2',
    name: 'Kikuyu Chama',
    groupNumber: 'GRP-01-789-012',
    role: 'MEMBER',
    totalBalance: 850000,
    memberCount: 8,
    monthlyContribution: 5000,
    image: 'KC',
    isPending: true,
  },
];

export const mockGroupAccounts = [
  {
    id: '1',
    groupId: '1',
    name: 'Group Shared Account',
    number: 'TL-G1-001-001',
    balance: 750000,
    type: 'GROUP SHARED',
  },
  {
    id: '2',
    groupId: '1',
    name: 'Investment Account',
    number: 'TL-G1-001-002',
    balance: 400000,
    type: 'INVESTMENT',
  },
  {
    id: '3',
    groupId: '1',
    name: 'Emergency Fund',
    number: 'TL-G1-001-003',
    balance: 100000,
    type: 'SAVINGS',
  },
];

export const mockGroupActivities = [
  {
    id: '1',
    type: 'contribution' as const,
    title: 'Monthly contribution',
    member: 'You',
    date: 'Dec 1',
    amount: 10000,
  },
  {
    id: '2',
    type: 'withdrawal' as const,
    title: 'Withdrawal request',
    member: 'John Doe',
    date: 'Nov 28',
    amount: -50000,
  },
  {
    id: '3',
    type: 'contribution' as const,
    title: 'Monthly contribution',
    member: 'Jane Smith',
    date: 'Nov 25',
    amount: 10000,
  },
];

export const mockPendingActions = [
  {
    id: '1',
    type: 'withdrawal',
    title: 'Withdrawal request from John Doe',
    member: 'John Doe',
    date: 'Dec 8',
    amount: 50000,
    votesReceived: 1,
    votesRequired: 2,
  },
  {
    id: '2',
    type: 'loan',
    title: 'Loan request from Jane Smith',
    member: 'Jane Smith',
    date: 'Dec 5',
    amount: 100000,
    votesReceived: 0,
    votesRequired: 3,
  },
];

export const mockGroupMembers = [
  { id: '1', name: 'Member 1', role: 'TREASURER', status: 'Active', avatar: 'M1' },
  { id: '2', name: 'Member 2', role: 'ADMIN', status: 'Active', avatar: 'M2' },
  { id: '3', name: 'Member 3', role: 'MEMBER', status: 'Active', avatar: 'M3' },
  { id: '4', name: 'Member 4', role: 'MEMBER', status: 'Active', avatar: 'M4' },
  { id: '5', name: 'Member 5', role: 'MEMBER', status: 'Active', avatar: 'M5' },
  { id: '6', name: 'Member 6', role: 'MEMBER', status: 'Active', avatar: 'M6' },
  { id: '7', name: 'Member 7', role: 'MEMBER', status: 'Active', avatar: 'M7' },
  { id: '8', name: 'Member 8', role: 'MEMBER', status: 'Active', avatar: 'M8' },
  { id: '9', name: 'Member 9', role: 'MEMBER', status: 'Active', avatar: 'M9' },
  { id: '10', name: 'Member 10', role: 'MEMBER', status: 'Active', avatar: 'M10' },
  { id: '11', name: 'Member 11', role: 'MEMBER', status: 'Active', avatar: 'M11' },
  { id: '12', name: 'Member 12', role: 'MEMBER', status: 'Active', avatar: 'M12' },
];
