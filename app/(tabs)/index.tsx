import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Palette,
  Spacing,
  Radius,
  formatIDR,
  formatDateID,
  formatTimeID,
  getLocalDateString,
} from '../../constants/theme';
import { financeStorage } from '../../services/financeStorage';
import { Transaction, CashflowSummary } from '../../types/finance';
import NotificationModal from '../../components/NotificationModal';

type CalculationPeriod = 'today' | 'month' | 'all';

export default function DashboardScreen() {
  const router = useRouter();
  // Default langsung ke 'today' (Hari Ini) sesuai permintaan pengguna
  const [selectedPeriod, setSelectedPeriod] = useState<CalculationPeriod>('today');
  const [summary, setSummary] = useState<CashflowSummary>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    todayIncome: 0,
    todayExpense: 0,
    todayBalance: 0,
    thisMonthIncome: 0,
    thisMonthExpense: 0,
    thisMonthBalance: 0,
    dailyAverageExpense: 0,
    daysInMonth: 30,
    currentDay: 1,
  });
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const loadData = useCallback(async () => {
    const [sum, txList] = await Promise.all([
      financeStorage.getCashflowSummary(),
      financeStorage.getTransactions(),
    ]);
    setSummary(sum);
    setAllTransactions(txList);
  }, []);

  // Filter transaksi sesuai tab yang aktif (Hari ini hanya menampilkan transaksi hari ini)
  const filteredTransactions = useMemo(() => {
    const todayStr = getLocalDateString();
    const currentMonthStr = todayStr.substring(0, 7);

    if (selectedPeriod === 'today') {
      return allTransactions.filter((tx) => tx.date === todayStr);
    } else if (selectedPeriod === 'month') {
      return allTransactions.filter((tx) => tx.date && tx.date.startsWith(currentMonthStr));
    }
    return allTransactions.slice(0, 10);
  }, [allTransactions, selectedPeriod]);

  // Real-time synchronization when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
    const unsubscribe = financeStorage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await loadData();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: CalculationPeriod) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedPeriod(period);
  };

  const handleOpenAdd = (type: 'income' | 'expense') => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push({
      pathname: '/add-transaction',
      params: { defaultType: type },
    });
  };

  const handleOpenDetail = (tx: Transaction) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push({
      pathname: '/transaction-detail',
      params: { id: tx.id },
    });
  };

  // Kalkulasi Otomatis sesuai periode yang dipilih
  const displayBalance =
    selectedPeriod === 'today'
      ? summary.todayBalance
      : selectedPeriod === 'month'
      ? summary.thisMonthBalance
      : summary.totalBalance;

  const displayIncome =
    selectedPeriod === 'today'
      ? summary.todayIncome
      : selectedPeriod === 'month'
      ? summary.thisMonthIncome
      : summary.totalIncome;

  const displayExpense =
    selectedPeriod === 'today'
      ? summary.todayExpense
      : selectedPeriod === 'month'
      ? summary.thisMonthExpense
      : summary.totalExpense;

  const periodLabel =
    selectedPeriod === 'today'
      ? 'Hari Ini'
      : selectedPeriod === 'month'
      ? 'Bulan Ini'
      : 'Semua Waktu';

  const expenseRatio =
    displayIncome > 0 ? Math.min(100, Math.round((displayExpense / displayIncome) * 100)) : 0;

  const estimatedMonthEndExpense = summary.dailyAverageExpense * summary.daysInMonth;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.brandBadge}>
            <Ionicons name="wallet" size={18} color={Palette.emerald} />
          </View>
          <View>
            <Text style={styles.brandTitle}>CatatKas</Text>
            <Text style={styles.brandSubtitle}>Pencatat Keuangan Pribadi</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.notifButton}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
              }
              setShowNotificationModal(true);
            }}
          >
            <Ionicons name="notifications-outline" size={18} color={Palette.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => handleOpenAdd('expense')}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Catat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.emerald}
          />
        }
      >
        {/* Switcher Periode Perhitungan Otomatis */}
        <View style={styles.periodSwitcher}>
          <TouchableOpacity
            style={[
              styles.periodTab,
              selectedPeriod === 'today' && styles.periodTabActive,
            ]}
            onPress={() => handlePeriodChange('today')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodTabText,
                selectedPeriod === 'today' && styles.periodTabTextActive,
              ]}
            >
              Hari Ini
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodTab,
              selectedPeriod === 'month' && styles.periodTabActive,
            ]}
            onPress={() => handlePeriodChange('month')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodTabText,
                selectedPeriod === 'month' && styles.periodTabTextActive,
              ]}
            >
              Bulan Ini
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodTab,
              selectedPeriod === 'all' && styles.periodTabActive,
            ]}
            onPress={() => handlePeriodChange('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodTabText,
                selectedPeriod === 'all' && styles.periodTabTextActive,
              ]}
            >
              Semua
            </Text>
          </TouchableOpacity>
        </View>

        {/* Kartu Saldo Terkalkulasi Otomatis */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceLabelContainer}>
              <View style={styles.activeDot} />
              <Text style={styles.balanceLabel}>Saldo Bersih ({periodLabel})</Text>
            </View>
            <View style={styles.badgeSavings}>
              <Ionicons name="calculator-outline" size={13} color={Palette.emerald} />
              <Text style={styles.badgeSavingsText}>Otomatis</Text>
            </View>
          </View>

          <Text style={styles.balanceAmount}>{formatIDR(displayBalance)}</Text>

          <View style={styles.divider} />

          {/* Tombol Aksi Cepat */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnIncome]}
              activeOpacity={0.75}
              onPress={() => handleOpenAdd('income')}
            >
              <View style={styles.actionIconIncome}>
                <Ionicons name="arrow-down-outline" size={15} color={Palette.emerald} />
              </View>
              <Text style={styles.actionBtnTextIncome}>+ Pemasukan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnExpense]}
              activeOpacity={0.75}
              onPress={() => handleOpenAdd('expense')}
            >
              <View style={styles.actionIconExpense}>
                <Ionicons name="arrow-up-outline" size={15} color={Palette.rose} />
              </View>
              <Text style={styles.actionBtnTextExpense}>- Pengeluaran</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ringkasan Kalkulasi Otomatis Masuk & Keluar */}
        <View style={styles.metricsGrid}>
          {/* Kartu Pemasukan */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrapIncome}>
              <Ionicons name="trending-up" size={18} color={Palette.emerald} />
            </View>
            <Text style={styles.metricLabel}>Pemasukan ({periodLabel})</Text>
            <Text style={styles.metricValueIncome}>+{formatIDR(displayIncome)}</Text>
          </View>

          {/* Kartu Pengeluaran */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrapExpense}>
              <Ionicons name="trending-down" size={18} color={Palette.rose} />
            </View>
            <Text style={styles.metricLabel}>Pengeluaran ({periodLabel})</Text>
            <Text style={styles.metricValueExpense}>-{formatIDR(displayExpense)}</Text>
          </View>
        </View>

        {/* Kartu Kalkulasi Rata-rata & Estimasi Otomatis */}
        <View style={styles.calcSummaryCard}>
          <View style={styles.calcSummaryHeader}>
            <View style={styles.calcSummaryTitleWrap}>
              <Ionicons name="stats-chart-outline" size={16} color={Palette.indigo} />
              <Text style={styles.calcSummaryTitle}>Kalkulasi Rata-rata & Estimasi</Text>
            </View>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                Hari ke-{summary.currentDay}/{summary.daysInMonth}
              </Text>
            </View>
          </View>

          <View style={styles.calcStatsRow}>
            <View style={styles.calcStatCol}>
              <Text style={styles.calcStatLabel}>Rata-rata / Hari</Text>
              <Text style={styles.calcStatValue}>
                {formatIDR(summary.dailyAverageExpense)}
              </Text>
            </View>
            <View style={styles.calcStatDivider} />
            <View style={styles.calcStatCol}>
              <Text style={styles.calcStatLabel}>Estimasi Akhir Bulan</Text>
              <Text style={styles.calcStatValueEstimate}>
                {formatIDR(estimatedMonthEndExpense)}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${expenseRatio}%`,
                  backgroundColor:
                    expenseRatio > 80
                      ? Palette.rose
                      : expenseRatio > 50
                      ? Palette.amber
                      : Palette.emerald,
                },
              ]}
            />
          </View>

          <Text style={styles.healthTip}>
            {displayIncome === 0 && displayExpense === 0
              ? 'Belum ada catatan transaksi pada periode ini. Mulai catat transaksi untuk melihat kalkulasi otomatis.'
              : expenseRatio <= 50
              ? `Pengeluaran terkendali dengan sangat baik (${expenseRatio}% dari pemasukan).`
              : expenseRatio <= 80
              ? `Pengeluaran stabil pada ${expenseRatio}% dari pemasukan.`
              : `Perhatian: Pengeluaran telah mencapai ${expenseRatio}% dari pemasukan.`}
          </Text>
        </View>

        {/* Bagian Transaksi Sesuai Filter */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedPeriod === 'today'
              ? 'Transaksi Hari Ini'
              : selectedPeriod === 'month'
              ? 'Transaksi Bulan Ini'
              : 'Transaksi Terbaru'}
          </Text>
          {filteredTransactions.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/transactions')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={Palette.emerald} />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedPeriod === 'today'
                ? 'Belum Ada Transaksi Hari Ini'
                : selectedPeriod === 'month'
                ? 'Belum Ada Transaksi Bulan Ini'
                : 'Belum Ada Catatan Transaksi'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedPeriod === 'today'
                ? 'Catat pemasukan atau pengeluaran Anda hari ini agar pembukuan tetap rapi & terkontrol.'
                : 'Mulai catat transaksi pertama Anda dengan menekan tombol di bawah.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => handleOpenAdd('expense')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>
                {selectedPeriod === 'today' ? '+ Catat Transaksi Hari Ini' : '+ Tambah Catatan Transaksi'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.transactionItem}
                  activeOpacity={0.75}
                  onPress={() => handleOpenDetail(tx)}
                >
                  <View
                    style={[
                      styles.txIconContainer,
                      {
                        backgroundColor: isIncome
                          ? Palette.emeraldMuted
                          : tx.categoryColor
                          ? `${tx.categoryColor}18`
                          : Palette.roseMuted,
                      },
                    ]}
                  >
                    <Ionicons
                      name={tx.categoryIcon || (isIncome ? 'wallet-outline' : 'receipt-outline')}
                      size={20}
                      color={tx.categoryColor || (isIncome ? Palette.emerald : Palette.rose)}
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <View style={styles.txMetaRow}>
                      <View
                        style={[
                          styles.categoryTag,
                          {
                            borderColor: tx.categoryColor || Palette.border,
                            backgroundColor: tx.categoryColor
                              ? `${tx.categoryColor}12`
                              : Palette.surfaceElevated,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryTagText,
                            { color: tx.categoryColor || Palette.textSecondary },
                          ]}
                        >
                          {tx.categoryName}
                        </Text>
                      </View>
                      <Text style={styles.txDateText}>
                        {formatDateID(tx.date)}
                        {tx.time ? ` • ${formatTimeID(tx.time, tx.createdAt)}` : ''}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      isIncome ? styles.txAmountIncome : styles.txAmountExpense,
                    ]}
                  >
                    {isIncome ? '+' : '-'} {formatIDR(tx.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Pengaturan Notifikasi */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: Spacing.md,
    backgroundColor: Palette.background,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Palette.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emerald,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
    shadowColor: Palette.emerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  periodSwitcher: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: Palette.textPrimary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.emerald,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSavings: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emeraldMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  badgeSavingsText: {
    color: Palette.emerald,
    fontSize: 11,
    fontWeight: '700',
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnIncome: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  actionBtnExpense: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  actionIconIncome: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconExpense: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextIncome: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.emerald,
  },
  actionBtnTextExpense: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.rose,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricIconWrapIncome: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Palette.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconWrapExpense: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Palette.roseMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
    fontWeight: '500',
  },
  metricValueIncome: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.emerald,
    marginTop: 4,
  },
  metricValueExpense: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.rose,
    marginTop: 4,
  },
  calcSummaryCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  calcSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calcSummaryTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calcSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  dayBadge: {
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  calcStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calcStatCol: {
    flex: 1,
  },
  calcStatLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  calcStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  calcStatValueEstimate: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.indigo,
    marginTop: 2,
  },
  calcStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Palette.border,
    marginHorizontal: Spacing.md,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  healthTip: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 8,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: Palette.emerald,
    fontWeight: '600',
  },
  transactionsList: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceElevated,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    marginRight: 12,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 3,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  txDateText: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountIncome: {
    color: Palette.emerald,
  },
  txAmountExpense: {
    color: Palette.rose,
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emerald,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
