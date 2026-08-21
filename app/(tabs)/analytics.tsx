import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Palette, Spacing, Radius, formatIDR } from '../../constants/theme';
import { financeStorage } from '../../services/financeStorage';
import { CategorySpending, CashflowSummary } from '../../types/finance';

export default function AnalyticsScreen() {
  const [categories, setCategories] = useState<CategorySpending[]>([]);
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
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [catSpend, sum] = await Promise.all([
      financeStorage.getCategorySpending(),
      financeStorage.getCashflowSummary(),
    ]);
    setCategories(catSpend);
    setSummary(sum);
  }, []);

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

  const topCategory = categories.length > 0 ? categories[0] : null;
  const totalExpenseTransactions = categories.reduce((acc, c) => acc + c.count, 0);
  const avgExpense =
    totalExpenseTransactions > 0
      ? Math.round(summary.totalExpense / totalExpenseTransactions)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Analisis Pengeluaran</Text>
        <Text style={styles.screenSubtitle}>Distribusi dan evaluasi pengeluaran bulanan</Text>
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
        {/* Total Pengeluaran Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Pengeluaran Bulan Ini</Text>
            <View style={styles.periodBadge}>
              <Text style={styles.periodBadgeText}>Bulan Ini</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>{formatIDR(summary.totalExpense)}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Jumlah Transaksi</Text>
              <Text style={styles.heroStatValue}>{totalExpenseTransactions} Transaksi</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Rata-rata / Catatan</Text>
              <Text style={styles.heroStatValue}>{formatIDR(avgExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Insight Quick Cards */}
        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <View style={styles.insightIconWrap}>
              <Ionicons name="pie-chart-outline" size={16} color={Palette.indigo} />
            </View>
            <Text style={styles.insightLabel}>Kategori Terbesar</Text>
            <Text style={styles.insightValue} numberOfLines={1}>
              {topCategory ? topCategory.categoryName : '-'}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIconWrapSavings}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Palette.emerald} />
            </View>
            <Text style={styles.insightLabel}>Rasio Tabungan</Text>
            <Text style={styles.insightValueSavings}>{summary.savingsRate}%</Text>
          </View>
        </View>

        {/* Distribusi Kategori */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Distribusi Kategori</Text>
          <Text style={styles.sectionSubtitle}>
            {categories.length > 0 ? `${categories.length} Kategori Aktif` : '0 Kategori'}
          </Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="pie-chart-outline" size={32} color={Palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Data Pengeluaran</Text>
            <Text style={styles.emptySubtitle}>
              Setelah Anda mencatat pengeluaran, grafik rincian kategori dan persentase akan otomatis muncul di sini.
            </Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((item) => (
              <View key={item.categoryId} style={styles.categoryCard}>
                <View style={styles.categoryTop}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.catIconWrap,
                        { backgroundColor: Palette.surfaceElevated },
                      ]}
                    >
                      <Ionicons name={item.categoryIcon} size={18} color={item.color} />
                    </View>
                    <View>
                      <Text style={styles.catName}>{item.categoryName}</Text>
                      <Text style={styles.catCount}>{item.count} transaksi</Text>
                    </View>
                  </View>

                  <View style={styles.categoryRight}>
                    <Text style={styles.catAmount}>{formatIDR(item.amount)}</Text>
                    <Text style={styles.catPercentage}>{item.percentage}%</Text>
                  </View>
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(5, item.percentage)}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: Spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    color: Palette.textTertiary,
    marginTop: 2,
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
  heroCard: {
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
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodBadge: {
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.rose,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.lg,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  heroStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.border,
    marginHorizontal: Spacing.md,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  insightCard: {
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
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    backgroundColor: Palette.indigoMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIconWrapSavings: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    backgroundColor: Palette.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  insightValueSavings: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.emerald,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Palette.textTertiary,
  },
  categoryList: {
    gap: Spacing.sm,
  },
  categoryCard: {
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
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  catCount: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 1,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  catPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 1,
  },
  progressTrack: {
    height: 5,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    maxWidth: 280,
    lineHeight: 18,
  },
});
