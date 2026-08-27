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
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { processImageToBase64 } from '../utils/imageProcessor';
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
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Category,
  TransactionType,
  WALLET_OPTIONS,
  DEFAULT_WALLET,
  WalletOption,
} from '../types/finance';

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

  // Wallet & Funding Source State
  const [selectedWallet, setSelectedWallet] = useState<WalletOption>(DEFAULT_WALLET);

  // Receipt / Proof of Transfer Photo State
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showPhotoOptionsModal, setShowPhotoOptionsModal] = useState(false);

  // Real-Time & Date State
  const [nowDate, setNowDate] = useState(() => new Date());
  const [useRealTime, setUseRealTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [customTime, setCustomTime] = useState(() => getLocalTimeString());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [type]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleTypeChange = (newType: TransactionType) => {
    if (newType !== type) {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setType(newType);
      setSelectedCategory(null);
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

  // Image Picker Actions
  const handlePickCamera = async () => {
    setShowPhotoOptionsModal(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Izin Kamera Dibutuhkan',
          'Harap berikan izin akses kamera pada pengaturan perangkat Anda.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessingPhoto(true);
        const processed = await processImageToBase64(result.assets[0].uri);
        setReceiptUri(processed);
        setIsProcessingPhoto(false);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      setIsProcessingPhoto(false);
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengakses kamera.');
    }
  };

  const handlePickGallery = async () => {
    setShowPhotoOptionsModal(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Izin Galeri Dibutuhkan',
          'Harap berikan izin akses galeri foto pada pengaturan perangkat Anda.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessingPhoto(true);
        const processed = await processImageToBase64(result.assets[0].uri);
        setReceiptUri(processed);
        setIsProcessingPhoto(false);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      setIsProcessingPhoto(false);
      Alert.alert('Gagal', 'Terjadi kesalahan saat membuka galeri foto.');
    }
  };

  const handleFlipReceipt = async () => {
    if (!receiptUri) return;
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setIsProcessingPhoto(true);
      const processed = await processImageToBase64(receiptUri, { flipH: true });
      setReceiptUri(processed);
      setIsProcessingPhoto(false);
    } catch {
      setIsProcessingPhoto(false);
      Alert.alert('Gagal', 'Terjadi kesalahan saat membalik foto.');
    }
  };

  const handleRotateReceipt = async () => {
    if (!receiptUri) return;
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setIsProcessingPhoto(true);
      const processed = await processImageToBase64(receiptUri, { rotate: 90 });
      setReceiptUri(processed);
      setIsProcessingPhoto(false);
    } catch {
      setIsProcessingPhoto(false);
      Alert.alert('Gagal', 'Terjadi kesalahan saat memutar foto.');
    }
  };

  const handleRemoveReceipt = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setReceiptUri(null);
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

    if (!selectedCategory) {
      Alert.alert('Perhatian', 'Harap pilih kategori transaksi.');
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
        walletId: selectedWallet.id,
        walletName: selectedWallet.name,
        walletType: selectedWallet.type,
        receiptUri: receiptUri || undefined,
        date: finalDate,
        time: finalTime,
        note: note.trim() || undefined,
      });

      notificationService.sendTransactionNotification(savedTx).catch(() => {});

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch {
      Alert.alert('Error', 'Gagal menyimpan transaksi. Coba lagi.');
    }
  };

  const computedAmount = getComputedAmount();
  const isFormValid = computedAmount > 0 && title.trim().length > 0 && selectedCategory !== null;

  const todayStr = getLocalDateString();
  const isTodaySelected = selectedDate === todayStr;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterdaySelected = selectedDate === getLocalDateString(yesterday);

  const displayTime = useRealTime ? getLocalTimeString(nowDate) : customTime;

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
            <Ionicons name="close" size={20} color={Palette.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Catat Transaksi</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Type Switcher Segment (Pengeluaran vs Pemasukan) */}
          <View style={styles.typeSegmentCard}>
            <TouchableOpacity
              style={[
                styles.typeSegmentBtn,
                type === 'expense' && styles.typeSegmentBtnActiveExpense,
              ]}
              onPress={() => handleTypeChange('expense')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={18}
                color={type === 'expense' ? Palette.rose : Palette.textTertiary}
              />
              <Text
                style={[
                  styles.typeSegmentText,
                  type === 'expense' && styles.typeSegmentTextActiveExpense,
                ]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeSegmentBtn,
                type === 'income' && styles.typeSegmentBtnActiveIncome,
              ]}
              onPress={() => handleTypeChange('income')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={18}
                color={type === 'income' ? Palette.emerald : Palette.textTertiary}
              />
              <Text
                style={[
                  styles.typeSegmentText,
                  type === 'income' && styles.typeSegmentTextActiveIncome,
                ]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. Kartu Waktu Transaksi Real-Time */}
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.greenLiveDot} />
                <Text style={styles.cardHeaderTitle}>WAKTU TRANSAKSI REAL-TIME</Text>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderActionBtn}
                onPress={() => {
                  setUseRealTime(!useRealTime);
                  setShowTimePicker(!useRealTime);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={13} color={Palette.textSecondary} />
                <Text style={styles.cardHeaderActionText}>
                  {useRealTime ? 'Ubah Waktu' : 'Pakai Real-Time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeInfoBox}>
              <View style={styles.timeInfoLeft}>
                <Text style={styles.clockLargeText}>{displayTime} WIB</Text>
                <Text style={styles.dateSubText}>{formatDateID(selectedDate)}</Text>
              </View>
              <View style={styles.dateBadgeWrap}>
                <Ionicons name="calendar" size={13} color={Palette.emerald} />
                <Text style={styles.dateBadgeText}>
                  {isTodaySelected ? 'Hari Ini' : isYesterdaySelected ? 'Kemarin' : 'Kustom'}
                </Text>
              </View>
            </View>

            {/* Quick Date Buttons */}
            <View style={styles.dateButtonsRow}>
              <TouchableOpacity
                style={[styles.dateQuickBtn, isTodaySelected && styles.dateQuickBtnActive]}
                onPress={() => setQuickDate('today')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateQuickBtnText,
                    isTodaySelected && styles.dateQuickBtnTextActive,
                  ]}
                >
                  Hari Ini
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateQuickBtn, isYesterdaySelected && styles.dateQuickBtnActive]}
                onPress={() => setQuickDate('yesterday')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateQuickBtnText,
                    isYesterdaySelected && styles.dateQuickBtnTextActive,
                  ]}
                >
                  Kemarin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateQuickBtn,
                  !isTodaySelected && !isYesterdaySelected && styles.dateQuickBtnActive,
                ]}
                onPress={() => setQuickDate('two_days_ago')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateQuickBtnText,
                    !isTodaySelected && !isYesterdaySelected && styles.dateQuickBtnTextActive,
                  ]}
                >
                  2 Hari Lalu
                </Text>
              </TouchableOpacity>
            </View>

            {/* Manual Time Adjuster (if enabled) */}
            {!useRealTime && (
              <View style={styles.timeAdjustWrap}>
                <Text style={styles.timeAdjustTitle}>SESUAIKAN JAM TRANSAKSI:</Text>
                <View style={styles.timeAdjustGrid}>
                  <TouchableOpacity
                    style={styles.timeAdjustGridBtn}
                    onPress={() => adjustCustomMinutes(-60)}
                  >
                    <Text style={styles.timeAdjustGridBtnText}>-1 Jam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeAdjustGridBtn}
                    onPress={() => adjustCustomMinutes(-15)}
                  >
                    <Text style={styles.timeAdjustGridBtnText}>-15 Mnt</Text>
                  </TouchableOpacity>
                  <View style={styles.timeAdjustCenterBox}>
                    <Text style={styles.timeAdjustCenterText}>{customTime}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timeAdjustGridBtn}
                    onPress={() => adjustCustomMinutes(15)}
                  >
                    <Text style={styles.timeAdjustGridBtnText}>+15 Mnt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeAdjustGridBtn}
                    onPress={() => adjustCustomMinutes(60)}
                  >
                    <Text style={styles.timeAdjustGridBtnText}>+1 Jam</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* 3. Kartu Input Nominal */}
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>
                NOMINAL ({type === 'expense' ? 'PENGELUARAN' : 'PEMASUKAN'})
              </Text>

              <TouchableOpacity
                style={[styles.calcTogglePill, showCalcPad && styles.calcTogglePillActive]}
                onPress={() => setShowCalcPad(!showCalcPad)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calculator-outline"
                  size={13}
                  color={showCalcPad ? Palette.emerald : Palette.textSecondary}
                />
                <Text
                  style={[
                    styles.calcTogglePillText,
                    showCalcPad && styles.calcTogglePillTextActive,
                  ]}
                >
                  {showCalcPad ? 'Tutup Kalkulator' : 'Hitung Otomatis'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Nominal Display */}
            <View style={styles.amountInputDisplayRow}>
              <Text
                style={[
                  styles.currencyRpLabel,
                  type === 'income' ? styles.currencyIncome : styles.currencyExpense,
                ]}
              >
                Rp
              </Text>
              <TextInput
                style={[
                  styles.amountValueInput,
                  type === 'income' ? styles.amountValueIncome : styles.amountValueExpense,
                ]}
                placeholder="0"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={handleAmountChange}
                autoFocus={false}
                underlineColorAndroid="transparent"
              />
              {amountStr.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.amountClearBtn}>
                  <Ionicons name="close-circle" size={20} color={Palette.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Kalkulator Live Result */}
            {calcExpression ? (
              <View style={styles.liveCalcResultWrap}>
                <Ionicons name="calculator" size={13} color={Palette.emerald} />
                <Text style={styles.liveCalcResultText}>Hasil Otomatis: {calcExpression}</Text>
                <TouchableOpacity onPress={evaluateCalculator} style={styles.liveCalcUseBtn}>
                  <Text style={styles.liveCalcUseBtnText}>Gunakan</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Mini Calculator Pad */}
            {showCalcPad && (
              <View style={styles.calcOperatorsRow}>
                {['+', '−', '×', '÷'].map((op, idx) => {
                  const actualOp = op === '−' ? '-' : op === '×' ? '*' : op === '÷' ? '/' : '+';
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.calcOperatorBtn}
                      onPress={() => appendOperator(actualOp)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calcOperatorBtnText}>{op}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.calcEqualsButton}
                  onPress={evaluateCalculator}
                  activeOpacity={0.8}
                >
                  <Text style={styles.calcEqualsButtonText}>=</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Amount Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.amountPresetsScroll}
            >
              {[
                { label: '+10rb', val: 10000 },
                { label: '+20rb', val: 20000 },
                { label: '+50rb', val: 50000 },
                { label: '+100rb', val: 100000 },
                { label: '+500rb', val: 500000 },
                { label: '+1jt', val: 1000000 },
              ].map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.amountPresetChip}
                  onPress={() => addPresetAmount(p.val)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.amountPresetChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 4. Keterangan Transaksi */}
          <View style={styles.formGroup}>
            <Text style={styles.formGroupLabel}>Keterangan Transaksi</Text>
            <View style={styles.formInputBox}>
              <Ionicons name="document-text-outline" size={18} color={Palette.textTertiary} />
              <TextInput
                style={styles.formTextInput}
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

          {/* 5. Pilih Kategori */}
          <View style={styles.formGroup}>
            <View style={styles.formGroupHeaderRow}>
              <Text style={styles.formGroupLabel}>Pilih Kategori</Text>
              {selectedCategory ? (
                <View style={styles.categorySelectedTag}>
                  <Ionicons name={selectedCategory.icon} size={13} color={selectedCategory.color} />
                  <Text
                    style={[styles.categorySelectedTagText, { color: selectedCategory.color }]}
                    numberOfLines={1}
                  >
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <View style={[styles.categorySelectedTag, { borderColor: Palette.textMuted }]}>
                  <Text style={[styles.categorySelectedTagText, { color: Palette.textTertiary }]}>
                    Belum dipilih
                  </Text>
                </View>
              )}
            </View>

            {/* Grid Kategori 4-Kolom Rapi dengan Spasi Lega */}
            <View style={styles.categoryCardGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategory !== null && cat.id === selectedCategory.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTile,
                      isSelected && {
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}15`,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleSelectCategory(cat)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.categoryTileIconWrap,
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
                        styles.categoryTileTitle,
                        isSelected && { color: Palette.textPrimary, fontWeight: '700' },
                      ]}
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={cat.color}
                        style={styles.categoryTileCheckIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 6. Sumber Dana / Dompet */}
          <View style={styles.formGroup}>
            <View style={styles.formGroupHeaderRow}>
              <Text style={styles.formGroupLabel}>
                {type === 'income' ? 'Masuk ke Dompet' : 'Sumber Dana / Dompet'}
              </Text>
              <View style={styles.walletSelectedTag}>
                <Ionicons name={selectedWallet.icon} size={13} color={selectedWallet.color} />
                <Text style={styles.walletSelectedTagText}>{selectedWallet.name}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walletHorizontalScroll}
            >
              {WALLET_OPTIONS.map((wallet) => {
                const isSelected = wallet.id === selectedWallet.id;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletPillBtn,
                      isSelected && {
                        backgroundColor: wallet.bgColor,
                        borderColor: wallet.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.selectionAsync();
                      }
                      setSelectedWallet(wallet);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.walletPillIconWrap,
                        {
                          backgroundColor: isSelected ? '#FFFFFF' : Palette.surfaceElevated,
                        },
                      ]}
                    >
                      <Ionicons
                        name={wallet.icon}
                        size={14}
                        color={isSelected ? wallet.color : Palette.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.walletPillText,
                        isSelected && { color: Palette.textPrimary, fontWeight: '700' },
                      ]}
                    >
                      {wallet.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 7. Catatan Tambahan */}
          <View style={styles.formGroup}>
            <Text style={styles.formGroupLabel}>Catatan Tambahan (Opsional)</Text>
            <View style={styles.formInputBox}>
              <Ionicons name="pencil-outline" size={17} color={Palette.textTertiary} />
              <TextInput
                style={styles.formTextInput}
                placeholder="Tambahkan catatan khusus..."
                placeholderTextColor={Palette.textMuted}
                value={note}
                onChangeText={setNote}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>

          {/* 8. Lampiran Foto Struk / Bukti Transfer */}
          <View style={styles.formGroup}>
            <View style={styles.formGroupHeaderRow}>
              <Text style={styles.formGroupLabel}>Lampiran Foto Struk / Bukti Transfer</Text>
              <Text style={styles.optionalTagText}>Opsional</Text>
            </View>

            {isProcessingPhoto ? (
              <View style={styles.receiptProcessingCard}>
                <ActivityIndicator size="small" color={Palette.emerald} />
                <Text style={styles.receiptProcessingText}>Memproses & mengompres foto struk...</Text>
              </View>
            ) : receiptUri ? (
              <View style={styles.receiptPreviewCard}>
                <Image source={{ uri: receiptUri }} style={styles.receiptThumbnail} />
                <View style={styles.receiptDetailsWrap}>
                  <View style={styles.receiptStatusRow}>
                    <Ionicons name="checkmark-circle" size={15} color={Palette.emerald} />
                    <Text style={styles.receiptStatusText}>Foto Terlampir</Text>
                  </View>

                  <View style={styles.receiptActionsRow}>
                    <TouchableOpacity
                      style={styles.receiptActionBtn}
                      onPress={handleFlipReceipt}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="swap-horizontal" size={13} color={Palette.indigo} />
                      <Text style={styles.receiptActionBtnTextIndigo}>Balik</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.receiptActionBtn}
                      onPress={handleRotateReceipt}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh" size={13} color={Palette.textSecondary} />
                      <Text style={styles.receiptActionBtnText}>Putar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.receiptActionBtn}
                      onPress={() => setShowPhotoOptionsModal(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-reverse" size={13} color={Palette.textSecondary} />
                      <Text style={styles.receiptActionBtnText}>Ganti</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.receiptDeleteBtn}
                      onPress={handleRemoveReceipt}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color={Palette.rose} />
                      <Text style={styles.receiptDeleteBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.receiptUploadDashedBox}
                onPress={() => setShowPhotoOptionsModal(true)}
                activeOpacity={0.75}
              >
                <View style={styles.receiptUploadIconCircle}>
                  <Ionicons name="camera-outline" size={22} color={Palette.emerald} />
                </View>
                <View style={styles.receiptUploadTextWrap}>
                  <Text style={styles.receiptUploadTitle}>
                    + Lampirkan Foto Struk / Bukti Transfer
                  </Text>
                  <Text style={styles.receiptUploadSubtitle}>
                    Foto langsung dengan kamera atau ambil dari galeri
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* 9. Tombol Simpan */}
          <TouchableOpacity
            style={[
              styles.saveTransactionBtn,
              type === 'income' ? styles.saveBtnIncome : styles.saveBtnExpense,
              !isFormValid && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveTransactionBtnText}>
              Simpan {formatIDR(computedAmount)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sheet Pilihan Sumber Foto (Kamera Depan / Belakang / Galeri) */}
      {showPhotoOptionsModal && (
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity
            style={styles.photoModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPhotoOptionsModal(false)}
          />
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Lampirkan Bukti / Struk</Text>
              <TouchableOpacity
                style={styles.photoModalCloseBtn}
                onPress={() => setShowPhotoOptionsModal(false)}
              >
                <Ionicons name="close" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.photoModalSubtitle}>
              Pilih metode untuk melampirkan foto bukti pembayaran atau struk:
            </Text>

            <TouchableOpacity
              style={styles.photoOptionBtn}
              onPress={handlePickCamera}
              activeOpacity={0.8}
            >
              <View style={styles.photoOptionIconWrapCamera}>
                <Ionicons name="camera" size={22} color={Palette.emerald} />
              </View>
              <View style={styles.photoOptionTextWrap}>
                <Text style={styles.photoOptionTitle}>Buka Kamera (Foto Langsung)</Text>
                <Text style={styles.photoOptionDesc}>Ambil foto langsung menggunakan kamera perangkat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoOptionBtn}
              onPress={handlePickGallery}
              activeOpacity={0.8}
            >
              <View style={styles.photoOptionIconWrapGallery}>
                <Ionicons name="images" size={22} color={Palette.cyan} />
              </View>
              <View style={styles.photoOptionTextWrap}>
                <Text style={styles.photoOptionTitle}>Pilih dari Galeri</Text>
                <Text style={styles.photoOptionDesc}>Ambil dari file atau screenshot di perangkat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoModalCancelBtn}
              onPress={() => setShowPhotoOptionsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.photoModalCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: Spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
    paddingBottom: 48,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  // 1. Type Switcher Segment
  typeSegmentCard: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.md,
    gap: 6,
  },
  typeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 8,
  },
  typeSegmentBtnActiveExpense: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  typeSegmentBtnActiveIncome: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  typeSegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  typeSegmentTextActiveExpense: {
    color: Palette.rose,
    fontWeight: '700',
  },
  typeSegmentTextActiveIncome: {
    color: Palette.emerald,
    fontWeight: '700',
  },
  // Reusable Card Style
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.emerald,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.textTertiary,
    letterSpacing: 0.5,
  },
  cardHeaderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  cardHeaderActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  // Time Card Details
  timeInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  timeInfoLeft: {
    gap: 2,
  },
  clockLargeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  dateSubText: {
    fontSize: 12,
    color: Palette.textTertiary,
  },
  dateBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emeraldMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  dateButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateQuickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateQuickBtnActive: {
    backgroundColor: Palette.emerald,
    borderColor: Palette.emerald,
  },
  dateQuickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  dateQuickBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeAdjustWrap: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    gap: 8,
  },
  timeAdjustTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.textTertiary,
    letterSpacing: 0.5,
  },
  timeAdjustGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  timeAdjustGridBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  timeAdjustGridBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  timeAdjustCenterBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Palette.indigoMuted,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  timeAdjustCenterText: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.indigo,
  },
  // Nominal Card Details
  calcTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  calcTogglePillActive: {
    backgroundColor: Palette.emeraldMuted,
    borderColor: '#A7F3D0',
  },
  calcTogglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  calcTogglePillTextActive: {
    color: Palette.emerald,
    fontWeight: '700',
  },
  amountInputDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  currencyRpLabel: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 6,
  },
  currencyExpense: {
    color: Palette.rose,
  },
  currencyIncome: {
    color: Palette.emerald,
  },
  amountValueInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  amountValueExpense: {
    color: Palette.textPrimary,
  },
  amountValueIncome: {
    color: Palette.textPrimary,
  },
  amountClearBtn: {
    padding: 4,
  },
  liveCalcResultWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emeraldMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: Spacing.sm,
    gap: 6,
  },
  liveCalcResultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  liveCalcUseBtn: {
    backgroundColor: Palette.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  liveCalcUseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calcOperatorsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  calcOperatorBtn: {
    flex: 1,
    height: 38,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcOperatorBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  calcEqualsButton: {
    flex: 1.2,
    height: 38,
    backgroundColor: Palette.emerald,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcEqualsButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amountPresetsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  amountPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountPresetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  // Form Groups
  formGroup: {
    marginBottom: Spacing.md,
  },
  formGroupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  formInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 10,
  },
  formTextInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.textPrimary,
    padding: 0,
  },
  // Category Grid (4 Kolom Rapi)
  categorySelectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  categorySelectedTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  categoryTile: {
    width: '23%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 76,
    position: 'relative',
  },
  categoryTileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryTileTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  categoryTileCheckIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  // Wallet Horizontal Scroll
  walletSelectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  walletSelectedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  walletHorizontalScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  walletPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 6,
  },
  walletPillIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  // Receipt Attachment Card
  optionalTagText: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  receiptProcessingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.emerald,
    gap: 10,
  },
  receiptProcessingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.emerald,
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  receiptThumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceElevated,
  },
  receiptDetailsWrap: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  receiptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  receiptActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 3,
  },
  receiptActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  receiptActionBtnTextIndigo: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.indigo,
  },
  receiptDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 3,
  },
  receiptDeleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.rose,
  },
  receiptUploadDashedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Palette.borderHighlight,
    borderStyle: 'dashed',
    gap: 10,
  },
  receiptUploadIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.emeraldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptUploadTextWrap: {
    flex: 1,
  },
  receiptUploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 2,
  },
  receiptUploadSubtitle: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  // 9. Save Transaction CTA
  saveTransactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnExpense: {
    backgroundColor: Palette.rose,
    shadowColor: Palette.rose,
  },
  saveBtnIncome: {
    backgroundColor: Palette.emerald,
    shadowColor: Palette.emerald,
  },
  saveBtnDisabled: {
    backgroundColor: Palette.borderHighlight,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveTransactionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Photo Picker Modal Styles
  photoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'flex-end',
  },
  photoModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  photoModalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  photoModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalSubtitle: {
    fontSize: 12,
    color: Palette.textTertiary,
    marginBottom: Spacing.lg,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  photoOptionIconWrapCamera: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Palette.emeraldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionIconWrapCameraFront: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Palette.purpleMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionIconWrapGallery: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Palette.cyanMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionTextWrap: {
    flex: 1,
  },
  photoOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 2,
  },
  photoOptionDesc: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  photoModalCancelBtn: {
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  photoModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
});
