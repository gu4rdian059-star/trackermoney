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

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryIcon: IconName;
  categoryColor: string;
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
