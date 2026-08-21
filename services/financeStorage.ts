import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, CashflowSummary, CategorySpending, EXPENSE_CATEGORIES } from '../types/finance';
import { getLocalDateString, getLocalTimeString } from '../constants/theme';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = '@catatkas_transactions_clean_v3';

// Empty starter state - no dummy data
const INITIAL_TRANSACTIONS: Transaction[] = [];

// In-memory fallback cache
let memoryCache: Transaction[] = [...INITIAL_TRANSACTIONS];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
};

const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item) return item;
    }
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return await AsyncStorage.getItem(key);
    }
  } catch {
    // Fallback to memory
  }
  return null;
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    // Fallback to memory
  }
};

// Helper to map Supabase database row to Transaction interface
const mapRowToTx = (row: any): Transaction => {
  return {
    id: row.id,
    title: row.title || 'Transaksi',
    amount: Number(row.amount) || 0,
    type: row.type || 'expense',
    categoryId: row.category_id || 'other_exp',
    categoryName: row.category_name || 'Lain-lain',
    categoryIcon: row.category_icon || 'receipt-outline',
    categoryColor: row.category_color || '#64748B',
    date: row.date || getLocalDateString(),
    time: row.time || undefined,
    note: row.note || undefined,
    createdAt: Number(row.created_at) || Date.now(),
  };
};

export const financeStorage = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      // 1. First load from local storage/memory for instant render
      const localData = await safeGetItem(STORAGE_KEY);
      if (localData) {
        const parsed: Transaction[] = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          memoryCache = parsed;
        }
      }

      // 2. Fetch latest data from Supabase in background
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const cloudTxList: Transaction[] = data.map(mapRowToTx);
          memoryCache = cloudTxList;
          await safeSetItem(STORAGE_KEY, JSON.stringify(cloudTxList));
          return memoryCache;
        }
      } catch (cloudErr) {
        // Supabase offline or table not yet created: gracefully use local cache
      }

      return memoryCache.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return memoryCache;
    }
  },

  async addTransaction(payload: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const list = await this.getTransactions();
    const newTx: Transaction = {
      ...payload,
      date: payload.date || getLocalDateString(),
      time: payload.time || getLocalTimeString(),
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      createdAt: Date.now(),
    };

    // Update local cache immediately
    const updated = [newTx, ...list];
    memoryCache = updated;
    await safeSetItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();

    // Sync to Supabase Cloud
    try {
      await supabase.from('transactions').insert({
        id: newTx.id,
        title: newTx.title,
        amount: newTx.amount,
        type: newTx.type,
        category_id: newTx.categoryId,
        category_name: newTx.categoryName,
        category_icon: newTx.categoryIcon,
        category_color: newTx.categoryColor,
        date: newTx.date,
        time: newTx.time || null,
        note: newTx.note || null,
        created_at: newTx.createdAt,
      });
    } catch (e) {
      // Offline fallback: data already saved locally
    }

    return newTx;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const list = await this.getTransactions();
    const filtered = list.filter((t) => t.id !== id);
    memoryCache = filtered;
    await safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
    notifyListeners();

    // Delete from Supabase Cloud
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (e) {
      // Offline fallback
    }

    return true;
  },

  async getCashflowSummary(): Promise<CashflowSummary> {
    const list = await this.getTransactions();
    
    const now = new Date();
    const todayStr = getLocalDateString(now); // YYYY-MM-DD in local time
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let totalIncome = 0;
    let totalExpense = 0;
    let todayIncome = 0;
    let todayExpense = 0;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;

    list.forEach((t) => {
      const amount = Number(t.amount) || 0;
      const isIncome = t.type === 'income';

      // Total keseluruhan
      if (isIncome) {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      // Hari ini
      if (t.date === todayStr) {
        if (isIncome) {
          todayIncome += amount;
        } else {
          todayExpense += amount;
        }
      }

      // Bulan ini
      if (t.date && t.date.startsWith(currentMonthStr)) {
        if (isIncome) {
          thisMonthIncome += amount;
        } else {
          thisMonthExpense += amount;
        }
      }
    });

    const netSavings = totalIncome - totalExpense;
    const totalBalance = netSavings;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const todayBalance = todayIncome - todayExpense;
    const thisMonthBalance = thisMonthIncome - thisMonthExpense;
    const dailyAverageExpense = Math.round(thisMonthExpense / Math.max(1, currentDay));

    return {
      totalBalance,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      todayIncome,
      todayExpense,
      todayBalance,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthBalance,
      dailyAverageExpense,
      daysInMonth,
      currentDay,
    };
  },

  async getCategorySpending(): Promise<CategorySpending[]> {
    const list = await this.getTransactions();
    const expenseList = list.filter((t) => t.type === 'expense');

    let totalExpenseAmount = 0;
    const map = new Map<string, { amount: number; count: number; name: string; icon: any; color: string }>();

    EXPENSE_CATEGORIES.forEach((cat) => {
      map.set(cat.id, {
        amount: 0,
        count: 0,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      });
    });

    expenseList.forEach((t) => {
      const amount = Number(t.amount) || 0;
      totalExpenseAmount += amount;

      const existing = map.get(t.categoryId) || {
        amount: 0,
        count: 0,
        name: t.categoryName,
        icon: t.categoryIcon,
        color: t.categoryColor,
      };

      map.set(t.categoryId, {
        ...existing,
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    });

    const result: CategorySpending[] = [];
    map.forEach((value, key) => {
      if (value.amount > 0) {
        result.push({
          categoryId: key,
          categoryName: value.name,
          categoryIcon: value.icon,
          color: value.color,
          amount: value.amount,
          count: value.count,
          percentage: totalExpenseAmount > 0 ? Math.round((value.amount / totalExpenseAmount) * 100) : 0,
        });
      }
    });

    return result.sort((a, b) => b.amount - a.amount);
  },

  async resetData(): Promise<void> {
    memoryCache = [];
    await safeSetItem(STORAGE_KEY, JSON.stringify([]));
    notifyListeners();
  },
};
