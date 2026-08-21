import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Palette,
  Spacing,
  Radius,
  formatIDR,
  formatDateID,
  getLocalDateString,
  getLocalTimeString,
} from '../constants/theme';
import { financeStorage } from '../services/financeStorage';
import { notificationService } from '../services/notificationService';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Category, TransactionType } from '../types/finance';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ defaultType?: string }>();

  const initialType: TransactionType = params.defaultType === 'income' ? 'income' : 'expense';
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [calcExpression, setCalcExpression] = useState('');
  const [showCalcPad, setShowCalcPad] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  // Real-Time & Date State
  const [nowDate, setNowDate] = useState(() => new Date());
  const [useRealTime, setUseRealTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [customTime, setCustomTime] = useState(() => getLocalTimeString());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Live ticking clock for real-time accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [type]);

  const [selectedCategory, setSelectedCategory] = useState<Category>(() =>
    initialType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
  );

  const handleTypeChange = (newType: TransactionType) => {
    if (newType !== type) {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setType(newType);
      const newCategories = newType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      setSelectedCategory(newCategories[0]);
    }
  };

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/[^0-9+\-*/.]/g, '');
    setAmountStr(clean);

    if (/[+\-*/]/.test(clean)) {
      try {
        const sanitized = clean.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result) && result >= 0) {
          setCalcExpression(`= ${formatIDR(Math.round(result))}`);
        } else {
          setCalcExpression('');
        }
      } catch {
        setCalcExpression('');
      }
    } else {
      setCalcExpression('');
    }
  };

  const evaluateCalculator = () => {
    if (!amountStr) return;
    try {
      const sanitized = amountStr.replace(/[^0-9+\-*/.]/g, '');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const finalNum = Math.max(0, Math.round(result));
        setAmountStr(finalNum.toString());
        setCalcExpression('');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      // ignore
    }
  };

  const appendOperator = (op: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (!amountStr) {
      setAmountStr('0' + op);
    } else {
      const lastChar = amountStr.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        setAmountStr(amountStr.slice(0, -1) + op);
      } else {
        setAmountStr(amountStr + op);
      }
    }
  };

  const addPresetAmount = (addValue: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    let current = 0;
    try {
      const sanitized = (amountStr || '0').replace(/[^0-9+\-*/.]/g, '');
      // eslint-disable-next-line no-eval
      const res = Function(`'use strict'; return (${sanitized})`)();
      if (typeof res === 'number' && !isNaN(res)) {
        current = res;
      }
    } catch {
      current = parseInt(amountStr || '0', 10) || 0;
    }

    const nextVal = Math.round(current + addValue);
    setAmountStr(nextVal.toString());
    setCalcExpression('');
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setAmountStr('');
    setCalcExpression('');
  };

  const handleSelectCategory = (cat: Category) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedCategory(cat);
  };

  // Date Quick Pickers
  const setQuickDate = (typeOption: 'today' | 'yesterday' | 'two_days_ago') => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const d = new Date();
    if (typeOption === 'yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (typeOption === 'two_days_ago') {
      d.setDate(d.getDate() - 2);
    }
    setSelectedDate(getLocalDateString(d));
  };

  // Adjust Custom Time
  const adjustCustomMinutes = (deltaMinutes: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const parts = customTime.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;

    let total = h * 60 + m + deltaMinutes;
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);

    const newH = String(Math.floor(total / 60)).padStart(2, '0');
    const newM = String(total % 60).padStart(2, '0');
    setCustomTime(`${newH}:${newM}`);
  };

  const getComputedAmount = (): number => {
    if (!amountStr) return 0;
    try {
      const sanitized = amountStr.replace(/[^0-9+\-*/.]/g, '');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.max(0, Math.round(result));
      }
    } catch {
      // fallback
    }
    const cleanNum = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    return isNaN(cleanNum) ? 0 : cleanNum;
  };

  const handleSave = async () => {
    const numericAmount = getComputedAmount();

    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Perhatian', 'Harap masukkan nominal transaksi yang valid.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Perhatian', 'Harap isi keterangan atau nama transaksi.');
      return;
    }

    const finalDate = selectedDate || getLocalDateString();
    const finalTime = useRealTime ? getLocalTimeString(nowDate) : customTime;

    try {
      const savedTx = await financeStorage.addTransaction({
        title: title.trim(),
        amount: numericAmount,
        type,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        categoryColor: selectedCategory.color,
        date: finalDate,
        time: finalTime,
        note: note.trim() || undefined,
      });

      // Send local notification alert
      await notificationService.sendTransactionNotification(savedTx);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch {
      Alert.alert('Kesalahan', 'Gagal menyimpan transaksi. Silakan coba lagi.');
    }
  };

  const computedAmount = getComputedAmount();
  const isFormValid = computedAmount > 0 && title.trim().length > 0;

  // Formatted strings for real-time display
  const liveHours = String(nowDate.getHours()).padStart(2, '0');
  const liveMinutes = String(nowDate.getMinutes()).padStart(2, '0');
  const liveSeconds = String(nowDate.getSeconds()).padStart(2, '0');
  const liveTimeString = `${liveHours}:${liveMinutes}:${liveSeconds} WIB`;

  const isTodaySelected = selectedDate === getLocalDateString();
  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateString(y);
  })();
  const isYesterdaySelected = selectedDate === yesterdayStr;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={Palette.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Catat Transaksi</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Switcher Tipe Transaksi */}
          <View style={styles.typeSegment}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === 'expense' && styles.typeBtnActiveExpense,
              ]}
              onPress={() => handleTypeChange('expense')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={16}
                color={type === 'expense' ? Palette.rose : Palette.textTertiary}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'expense' && styles.typeBtnTextActiveExpense,
                ]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === 'income' && styles.typeBtnActiveIncome,
              ]}
              onPress={() => handleTypeChange('income')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={16}
                color={type === 'income' ? Palette.emerald : Palette.textTertiary}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'income' && styles.typeBtnTextActiveIncome,
                ]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Widget Waktu Real-Time & Tanggal Otomatis */}
          <View style={styles.realtimeCard}>
            <View style={styles.realtimeHeader}>
              <View style={styles.realtimeTitleRow}>
                <View
                  style={[
                    styles.pulsingDot,
                    { backgroundColor: useRealTime ? Palette.emerald : Palette.textTertiary },
                  ]}
                />
                <Text style={styles.realtimeTitle}>
                  {useRealTime ? 'Waktu Transaksi Real-Time' : 'Waktu Transaksi Kustom'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modeToggleBtn, !useRealTime && styles.modeToggleBtnActive]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  setUseRealTime(!useRealTime);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={useRealTime ? 'time-outline' : 'checkmark-circle-outline'}
                  size={13}
                  color={!useRealTime ? Palette.indigo : Palette.textTertiary}
                />
                <Text style={[styles.modeToggleText, !useRealTime && styles.modeToggleTextActive]}>
                  {useRealTime ? 'Ubah Waktu' : 'Pakai Real-Time'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Display Waktu & Tanggal Aktif */}
            <View style={styles.timeDisplayRow}>
              <View style={styles.timeMainCol}>
                <Text style={styles.timeValueText}>
                  {useRealTime ? liveTimeString : `${customTime} WIB`}
                </Text>
                <Text style={styles.dateValueText}>
                  {formatDateID(selectedDate)}
                </Text>
              </View>

              <View style={styles.timeBadgeWrap}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={Palette.emerald}
                />
                <Text style={styles.timeBadgeText}>
                  {isTodaySelected ? 'Hari Ini' : isYesterdaySelected ? 'Kemarin' : 'Kustom'}
                </Text>
              </View>
            </View>

            {/* Kontrol Selector Tanggal & Jam jika ingin disesuaikan */}
            <View style={styles.dateSelectorRow}>
              <TouchableOpacity
                style={[styles.dateChip, isTodaySelected && styles.dateChipActive]}
                onPress={() => setQuickDate('today')}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, isTodaySelected && styles.dateChipTextActive]}>
                  Hari Ini
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateChip, isYesterdaySelected && styles.dateChipActive]}
                onPress={() => setQuickDate('yesterday')}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, isYesterdaySelected && styles.dateChipTextActive]}>
                  Kemarin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateChip,
                  !isTodaySelected && !isYesterdaySelected && styles.dateChipActive,
                ]}
                onPress={() => setQuickDate('two_days_ago')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    !isTodaySelected && !isYesterdaySelected && styles.dateChipTextActive,
                  ]}
                >
                  2 Hari Lalu
                </Text>
              </TouchableOpacity>

              {!useRealTime && (
                <TouchableOpacity
                  style={[styles.dateChip, styles.adjustTimeChip]}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={13} color={Palette.indigo} />
                  <Text style={[styles.dateChipText, { color: Palette.indigo, fontWeight: '700' }]}>
                    Set Jam
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Panel Pengaturan Jam Manual jika diaktifkan */}
            {!useRealTime && showTimePicker && (
              <View style={styles.customTimePanel}>
                <Text style={styles.customTimePanelLabel}>SESUAIKAN JAM TRANSAKSI:</Text>
                <View style={styles.timeAdjustRow}>
                  <TouchableOpacity
                    style={styles.timeAdjustBtn}
                    onPress={() => adjustCustomMinutes(-60)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeAdjustBtnText}>-1 Jam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeAdjustBtn}
                    onPress={() => adjustCustomMinutes(-15)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeAdjustBtnText}>-15 Mnt</Text>
                  </TouchableOpacity>
                  <View style={styles.timeCurrentBox}>
                    <Text style={styles.timeCurrentText}>{customTime}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timeAdjustBtn}
                    onPress={() => adjustCustomMinutes(15)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeAdjustBtnText}>+15 Mnt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeAdjustBtn}
                    onPress={() => adjustCustomMinutes(60)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeAdjustBtnText}>+1 Jam</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Kartu Input Nominal dengan Kalkulator Otomatis */}
          <View style={styles.amountCard}>
            <View style={styles.amountHeaderRow}>
              <Text style={styles.amountLabel}>
                Nominal ({type === 'expense' ? 'Pengeluaran' : 'Pemasukan'})
              </Text>

              <TouchableOpacity
                style={[styles.calcToggleBtn, showCalcPad && styles.calcToggleBtnActive]}
                onPress={() => setShowCalcPad(!showCalcPad)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calculator-outline"
                  size={14}
                  color={showCalcPad ? Palette.emerald : Palette.textTertiary}
                />
                <Text
                  style={[
                    styles.calcToggleText,
                    showCalcPad && styles.calcToggleTextActive,
                  ]}
                >
                  {showCalcPad ? 'Tutup Kalkulator' : 'Hitung Otomatis'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  type === 'income' ? styles.amountInputIncome : styles.amountInputExpense,
                ]}
                placeholder="0"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={handleAmountChange}
                autoFocus={true}
                underlineColorAndroid="transparent"
              />
              {amountStr.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearInputBtn}>
                  <Ionicons name="close-circle" size={20} color={Palette.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Hasil Perhitungan Live */}
            {calcExpression ? (
              <View style={styles.liveCalcRow}>
                <Ionicons name="calculator" size={14} color={Palette.emerald} />
                <Text style={styles.liveCalcText}>Hasil Otomatis: {calcExpression}</Text>
                <TouchableOpacity onPress={evaluateCalculator} style={styles.applyCalcBtn}>
                  <Text style={styles.applyCalcBtnText}>Gunakan</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Tombol Mini Kalkulator (Operator Matematika) */}
            {showCalcPad && (
              <View style={styles.calcPadGrid}>
                <TouchableOpacity
                  style={styles.calcOpBtn}
                  onPress={() => appendOperator('+')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calcOpText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calcOpBtn}
                  onPress={() => appendOperator('-')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calcOpText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calcOpBtn}
                  onPress={() => appendOperator('*')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calcOpText}>×</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calcOpBtn}
                  onPress={() => appendOperator('/')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calcOpText}>÷</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calcEqualsBtn}
                  onPress={evaluateCalculator}
                  activeOpacity={0.8}
                >
                  <Text style={styles.calcEqualsText}>=</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Amount Chips */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => addPresetAmount(10000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>+10rb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => addPresetAmount(20000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>+20rb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => addPresetAmount(50000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>+50rb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => addPresetAmount(100000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>+100rb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => addPresetAmount(500000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>+500rb</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Keterangan / Nama */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Keterangan Transaksi</Text>
            <View style={styles.inputBox}>
              <Ionicons name="document-text-outline" size={18} color={Palette.textTertiary} />
              <TextInput
                style={styles.textInput}
                placeholder={
                  type === 'expense'
                    ? 'Contoh: Kopi, Makan Siang, Bensin, Belanja'
                    : 'Contoh: Gaji, Hasil Proyek, Dividen'
                }
                placeholderTextColor={Palette.textMuted}
                value={title}
                onChangeText={setTitle}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>

          {/* Banner Indikator Kategori Terpilih */}
          <View style={styles.fieldGroup}>
            <View style={styles.categoryHeaderRow}>
              <Text style={styles.fieldLabel}>Pilih Kategori</Text>
              <View style={styles.selectedCategoryBadge}>
                <Ionicons name={selectedCategory.icon} size={14} color={selectedCategory.color} />
                <Text style={styles.selectedCategoryBadgeText}>
                  Terpilih: {selectedCategory.name}
                </Text>
              </View>
            </View>

            {/* Grid Kategori Interaktif */}
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategory.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        borderColor: cat.color,
                        backgroundColor: cat.bgColor,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleSelectCategory(cat)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.categoryIconWrap,
                        {
                          backgroundColor: isSelected ? '#FFFFFF' : Palette.surfaceElevated,
                        },
                      ]}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={18}
                        color={isSelected ? cat.color : Palette.textSecondary}
                      />
                    </View>

                    <Text
                      style={[
                        styles.categoryCardText,
                        isSelected && { color: Palette.textPrimary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={cat.color}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Input Catatan */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Catatan Tambahan (Opsional)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="pencil-outline" size={18} color={Palette.textTertiary} />
              <TextInput
                style={styles.textInput}
                placeholder="Tambahkan catatan khusus..."
                placeholderTextColor={Palette.textMuted}
                value={note}
                onChangeText={setNote}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>

          {/* Tombol Simpan */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              type === 'income' ? styles.saveBtnIncome : styles.saveBtnExpense,
              !isFormValid && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!isFormValid}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              Simpan {formatIDR(computedAmount)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
    width: '100%',
  },
  flex: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: Spacing.md,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  headerPlaceholder: {
    width: 34,
  },
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  typeSegment: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.md,
    width: '100%',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 6,
  },
  typeBtnActiveExpense: {
    backgroundColor: '#FFF1F2',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#ECFDF5',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  typeBtnTextActiveExpense: {
    color: Palette.rose,
  },
  typeBtnTextActiveIncome: {
    color: Palette.emerald,
  },
  realtimeCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.md,
  },
  realtimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  realtimeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  realtimeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modeToggleBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  modeToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  modeToggleTextActive: {
    color: Palette.indigo,
    fontWeight: '700',
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  timeMainCol: {
    flex: 1,
  },
  timeValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: 0.2,
  },
  dateValueText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  timeBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.emeraldMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emerald,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  dateChipActive: {
    backgroundColor: Palette.emerald,
    borderColor: Palette.emerald,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adjustTimeChip: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  customTimePanel: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  customTimePanelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timeAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  timeAdjustBtn: {
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  timeAdjustBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  timeCurrentBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.indigo,
  },
  timeCurrentText: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.indigo,
  },
  amountCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.md,
    width: '100%',
    overflow: 'hidden',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  calcToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  calcToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  calcToggleTextActive: {
    color: Palette.emerald,
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    padding: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
          outlineStyle: 'none',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  amountInputIncome: {
    color: Palette.emerald,
  },
  amountInputExpense: {
    color: Palette.rose,
  },
  clearInputBtn: {
    padding: 4,
  },
  liveCalcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveCalcText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  applyCalcBtn: {
    backgroundColor: Palette.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  applyCalcBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  calcPadGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  calcOpBtn: {
    flex: 1,
    height: 38,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  calcOpText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  calcEqualsBtn: {
    flex: 1,
    height: 38,
    backgroundColor: Palette.emerald,
    borderRadius: Radius.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcEqualsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.textPrimary,
    padding: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
          outlineStyle: 'none',
        } as any)
      : {}),
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '23%',
    flexGrow: 1,
    minWidth: 70,
    backgroundColor: Palette.surface,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    position: 'relative',
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryCardText: {
    fontSize: 10,
    fontWeight: '500',
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
    marginTop: Spacing.sm,
    shadowColor: Palette.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnIncome: {
    backgroundColor: Palette.emerald,
  },
  saveBtnExpense: {
    backgroundColor: Palette.rose,
  },
  saveBtnDisabled: {
    backgroundColor: Palette.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
