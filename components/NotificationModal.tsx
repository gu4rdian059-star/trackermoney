import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Palette, Spacing, Radius } from '../constants/theme';
import { notificationService, NotificationSettings } from '../services/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_HOURS = [
  { label: '19:00 WIB', hour: 19, minute: 0 },
  { label: '20:00 WIB (Saran)', hour: 20, minute: 0 },
  { label: '21:00 WIB', hour: 21, minute: 0 },
  { label: '22:00 WIB', hour: 22, minute: 0 },
];

export default function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminderEnabled: true,
    reminderHour: 20,
    reminderMinute: 0,
    instantNotifEnabled: true,
  });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      notificationService.getSettings().then(setSettings);
    }
  }, [visible]);

  const handleToggleDaily = async (val: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const updated = { ...settings, dailyReminderEnabled: val };
    setSettings(updated);
    await notificationService.saveSettings(updated);
  };

  const handleToggleInstant = async (val: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const updated = { ...settings, instantNotifEnabled: val };
    setSettings(updated);
    await notificationService.saveSettings(updated);
  };

  const handleSelectHour = async (hour: number, minute: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const updated = { ...settings, reminderHour: hour, reminderMinute: minute };
    setSettings(updated);
    await notificationService.saveSettings(updated);
  };

  const handleTestNotification = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsTesting(true);
    await notificationService.sendTestNotification();
    setTimeout(() => {
      setIsTesting(false);
      Alert.alert('Sukses', 'Notifikasi uji coba telah dikirim!');
    }, 400);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="notifications" size={20} color={Palette.emerald} />
            </View>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.modalTitle}>Pengaturan Notifikasi</Text>
              <Text style={styles.modalSubtitle}>Kelola pengingat & pemberitahuan kas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Section: Pengingat Harian */}
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Pengingat Harian</Text>
                <Text style={styles.switchDesc}>
                  Ingatkan setiap malam untuk mencatat pemasukan dan pengeluaran.
                </Text>
              </View>
              <Switch
                value={settings.dailyReminderEnabled}
                onValueChange={handleToggleDaily}
                trackColor={{ false: Palette.border, true: Palette.emerald }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.dailyReminderEnabled && (
              <View style={styles.hoursContainer}>
                <Text style={styles.hoursLabel}>PILIH JAM PENGINGAT</Text>
                <View style={styles.hoursGrid}>
                  {PRESET_HOURS.map((preset) => {
                    const isSelected =
                      settings.reminderHour === preset.hour &&
                      settings.reminderMinute === preset.minute;
                    return (
                      <TouchableOpacity
                        key={preset.hour}
                        style={[
                          styles.hourChip,
                          isSelected && styles.hourChipActive,
                        ]}
                        onPress={() => handleSelectHour(preset.hour, preset.minute)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.hourChipText,
                            isSelected && styles.hourChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Section: Notifikasi Instan Transaksi */}
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Pemberitahuan Transaksi</Text>
                <Text style={styles.switchDesc}>
                  Munculkan notifikasi saat berhasil menyimpan transaksi baru.
                </Text>
              </View>
              <Switch
                value={settings.instantNotifEnabled}
                onValueChange={handleToggleInstant}
                trackColor={{ false: Palette.border, true: Palette.emerald }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Button: Test Notification */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestNotification}
            disabled={isTesting}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={16} color={Palette.emerald} />
            <Text style={styles.testBtnText}>
              {isTesting ? 'Mengirim...' : 'Tes Kirim Notifikasi Sekarang'}
            </Text>
          </TouchableOpacity>

          {/* Button: Tutup */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Palette.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceElevated,
  },
  sectionCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  switchDesc: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 2,
    lineHeight: 15,
  },
  hoursContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  hoursLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hourChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  hourChipActive: {
    backgroundColor: Palette.emerald,
    borderColor: Palette.emerald,
  },
  hourChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  hourChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.emeraldMuted,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  saveBtn: {
    backgroundColor: Palette.emerald,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
