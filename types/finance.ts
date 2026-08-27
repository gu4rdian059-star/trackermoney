import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '../constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  bgColor: string;
  type: TransactionType;
}

export type WalletType = 'cash' | 'bank' | 'ewallet';

export interface WalletOption {
  id: string;
  name: string;
  type: WalletType;
  icon: IconName;
  color: string;
  bgColor: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryIcon: IconName;
  categoryColor: string;
  walletId?: string;
  walletName?: string;
  walletType?: WalletType;
  receiptUri?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  note?: string;
  createdAt: number;
}

export interface CashflowSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  // Perhitungan Otomatis Berdasarkan Periode
  todayIncome: number;
  todayExpense: number;
  todayBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  thisMonthBalance: number;
  dailyAverageExpense: number;
  daysInMonth: number;
  currentDay: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: IconName;
  color: string;
  amount: number;
  count: number;
  percentage: number;
}

export const EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Makan & Minum',
    icon: 'restaurant-outline',
    color: Palette.amber,
    bgColor: Palette.amberMuted,
    type: 'expense',
  },
  {
    id: 'transport',
    name: 'Transportasi',
    icon: 'car-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
    type: 'expense',
  },
  {
    id: 'shopping',
    name: 'Belanja',
    icon: 'bag-handle-outline',
    color: Palette.purple,
    bgColor: Palette.purpleMuted,
    type: 'expense',
  },
  {
    id: 'bills',
    name: 'Tagihan & Listrik',
    icon: 'receipt-outline',
    color: Palette.rose,
    bgColor: Palette.roseMuted,
    type: 'expense',
  },
  {
    id: 'entertainment',
    name: 'Hiburan',
    icon: 'film-outline',
    color: Palette.indigo,
    bgColor: Palette.indigoMuted,
    type: 'expense',
  },
  {
    id: 'health',
    name: 'Kesehatan',
    icon: 'fitness-outline',
    color: Palette.emerald,
    bgColor: Palette.emeraldMuted,
    type: 'expense',
  },
  {
    id: 'education',
    name: 'Edukasi & Belajar',
    icon: 'school-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
    type: 'expense',
  },
  {
    id: 'other_exp',
    name: 'Lain-lain',
    icon: 'shapes-outline',
    color: Palette.textSecondary,
    bgColor: Palette.surfaceElevated,
    type: 'expense',
  },
];

export const INCOME_CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Gaji Pokok',
    icon: 'wallet-outline',
    color: Palette.emerald,
    bgColor: Palette.emeraldMuted,
    type: 'income',
  },
  {
    id: 'freelance',
    name: 'Usaha & Proyek',
    icon: 'briefcase-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
    type: 'income',
  },
  {
    id: 'investment',
    name: 'Investasi & Dividen',
    icon: 'trending-up-outline',
    color: Palette.indigo,
    bgColor: Palette.indigoMuted,
    type: 'income',
  },
  {
    id: 'bonus',
    name: 'Hadiah & Bonus',
    icon: 'gift-outline',
    color: Palette.amber,
    bgColor: Palette.amberMuted,
    type: 'income',
  },
  {
    id: 'other_inc',
    name: 'Pemasukan Lain',
    icon: 'cash-outline',
    color: Palette.textSecondary,
    bgColor: Palette.surfaceElevated,
    type: 'income',
  },
];

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const WALLET_OPTIONS: WalletOption[] = [
  // Tunai / Dompet
  {
    id: 'cash',
    name: 'Tunai / Dompet',
    type: 'cash',
    icon: 'cash-outline',
    color: Palette.emerald,
    bgColor: Palette.emeraldMuted,
  },
  // Rekening Bank
  {
    id: 'bca',
    name: 'Bank BCA',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
  },
  {
    id: 'mandiri',
    name: 'Bank Mandiri',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.indigo,
    bgColor: Palette.indigoMuted,
  },
  {
    id: 'bri',
    name: 'Bank BRI',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
  },
  {
    id: 'bni',
    name: 'Bank BNI',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.amber,
    bgColor: Palette.amberMuted,
  },
  {
    id: 'jago',
    name: 'Bank Jago',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.purple,
    bgColor: Palette.purpleMuted,
  },
  {
    id: 'seabank',
    name: 'SeaBank',
    type: 'bank',
    icon: 'card-outline',
    color: Palette.amber,
    bgColor: Palette.amberMuted,
  },
  // E-Wallet
  {
    id: 'gopay',
    name: 'GoPay',
    type: 'ewallet',
    icon: 'phone-portrait-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
  },
  {
    id: 'ovo',
    name: 'OVO',
    type: 'ewallet',
    icon: 'phone-portrait-outline',
    color: Palette.purple,
    bgColor: Palette.purpleMuted,
  },
  {
    id: 'dana',
    name: 'DANA',
    type: 'ewallet',
    icon: 'phone-portrait-outline',
    color: Palette.cyan,
    bgColor: Palette.cyanMuted,
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    type: 'ewallet',
    icon: 'phone-portrait-outline',
    color: Palette.rose,
    bgColor: Palette.roseMuted,
  },
  {
    id: 'other_wallet',
    name: 'Lainnya',
    type: 'ewallet',
    icon: 'wallet-outline',
    color: Palette.textSecondary,
    bgColor: Palette.surfaceElevated,
  },
];

export const DEFAULT_WALLET: WalletOption = WALLET_OPTIONS[0];

