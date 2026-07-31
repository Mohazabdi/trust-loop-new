export const mockPaymentMethods = {
  mpesa: [
    {
      id: '1',
      number: '0712 345 678',
      verified: true,
      isDefault: true,
      dailyLimit: 150000,
    },
    {
      id: '2',
      number: '0744 555 666',
      verified: false,
      isDefault: false,
      dailyLimit: 150000,
    },
  ],
  banks: [
    {
      id: '1',
      name: 'Equity Bank',
      accountName: 'John Doe',
      accountNumber: '•••• 7890',
      verified: true,
    },
    {
      id: '2',
      name: 'KCB Bank',
      accountName: 'John Kamau',
      accountNumber: '•••• 1234',
      verified: true,
    },
  ],
  cards: [
    {
      id: '1',
      type: 'Visa',
      last4: '1234',
      expiryDate: '12/25',
      cardholderName: 'John Doe',
    },
  ],
  wallets: [
    {
      id: '1',
      name: 'Airtel Money',
      number: '0723 456 789',
      verified: true,
    },
  ],
};

export const mockTransactionLimits = [
  { type: 'M-Pesa Daily', limit: 150000 },
  { type: 'Bank Transfer Daily', limit: 500000 },
  { type: 'Card Payment Daily', limit: 100000 },
];

export const mockTotalBalance = 625000;
