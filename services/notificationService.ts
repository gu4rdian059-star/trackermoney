import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/finance';
import { formatIDR, formatTimeID } from '../constants/theme';

const NOTIF_SETTINGS_KEY = '@catatkas_notification_settings_v1';
const DAILY_REMINDER_ID = 'catatkas_daily_reminder';

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  reminderHour: number; // 0 - 23 (default 20 = 20:00 WIB)
  reminderMinute: number; // 0 - 59
  instantNotifEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  instantNotifEnabled: true,
};

// Set foreground notification presentation handler for Expo SDK 54
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const notificationService = {
  /**
   * Request notification permissions for iOS and Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Get current notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const data = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Save notification settings and apply scheduling
   */
  async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
      if (settings.dailyReminderEnabled) {
        await this.scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
      } else {
        await this.cancelDailyReminder();
      }
    } catch {
      // ignore
    }
  },

  /**
   * Schedule daily recurring reminder at specified hour and minute
   */
  async scheduleDailyReminder(hour: number = 20, minute: number = 0): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Cancel previous reminder first
      await this.cancelDailyReminder();

      // Schedule new daily reminder
      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_REMINDER_ID,
        content: {
          title: '🔔 Pengingat CatatKas',
          body: 'Sudahkah Anda mencatat pengeluaran & pemasukan hari ini? Yuk luangkan 1 menit untuk catat kas Anda!',
          sound: 'default',
          data: { type: 'daily_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } catch (e) {
      console.warn('Failed to schedule daily reminder:', e);
    }
  },

  /**
   * Cancel daily reminder
   */
  async cancelDailyReminder(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    } catch {
      // ignore
    }
  },

  /**
   * Trigger instant notification when transaction is saved
   */
  async sendTransactionNotification(tx: Transaction): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const settings = await this.getSettings();
      if (!settings.instantNotifEnabled) return;

      const isIncome = tx.type === 'income';
      const title = isIncome
        ? '💰 Pemasukan Berhasil Dicatat'
        : '💸 Pengeluaran Berhasil Dicatat';

      const amountFormatted = (isIncome ? '+' : '-') + ' ' + formatIDR(tx.amount);
      const timeFormatted = tx.time ? ` (${formatTimeID(tx.time)})` : '';
      const body = `${amountFormatted} • ${tx.title} [${tx.categoryName}]${timeFormatted}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { txId: tx.id },
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.warn('Failed to send transaction notification:', e);
    }
  },

  /**
   * Send a test notification immediately
   */
  async sendTestNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ CatatKas Notifikasi Aktif!',
          body: 'Notifikasi pengingat dan catatan kas Anda sudah siap & berfungsi dengan normal.',
          sound: 'default',
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to send test notification:', e);
    }
  },
};
