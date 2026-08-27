import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  RefreshControl,
  ScrollView,
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
import {
  Transaction,
  ALL_CATEGORIES,
  WALLET_OPTIONS,
} from '../../types/finance';

type FilterType = 'all' | 'expense' | 'income';
type DatePreset = 'all' | 'today' | '7days' | 'month' | 'last_month' | 'custom';
type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

interface AdvancedFilter {
  datePreset: DatePreset;
  customStartDate: string;
  customEndDate: string;
  minAmount: string;
  maxAmount: string;
  selectedCategories: string[];
  selectedWallets: string[];
  hasReceiptOnly: boolean;
  sortBy: SortOption;
}

const DEFAULT_FILTER: AdvancedFilter = {
  datePreset: 'all',
  customStartDate: '',
  customEndDate: '',
  minAmount: '',
  maxAmount: '',
  selectedCategories: [],
  selectedWallets: [],
  hasReceiptOnly: false,
  sortBy: 'date_desc',
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Advanced Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<AdvancedFilter>(DEFAULT_FILTER);
  const [tempFilter, setTempFilter] = useState<AdvancedFilter>(DEFAULT_FILTER);

  const loadData = useCallback(async () => {
    const list = await financeStorage.getTransactions();
    setTransactions(list);
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

  const handleTypeFilterChange = (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setActiveTypeFilter(filter);
  };

  // Open Filter Modal
  const handleOpenFilterModal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTempFilter({ ...appliedFilter });
    setShowFilterModal(true);
  };

  // Apply Filter
  const handleApplyFilter = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setAppliedFilter({ ...tempFilter });
    setShowFilterModal(false);
  };

  // Reset Filters
  const handleResetFilter = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAppliedFilter(DEFAULT_FILTER);
    setTempFilter(DEFAULT_FILTER);
  };

  // Quick remove specific filter
  const handleRemoveDateFilter = () => {
    setAppliedFilter((prev) => ({
      ...prev,
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
    }));
  };

  const handleRemoveAmountFilter = () => {
    setAppliedFilter((prev) => ({
      ...prev,
      minAmount: '',
      maxAmount: '',
    }));
  };

  const handleRemoveCategoryFilter = (catId: string) => {
    setAppliedFilter((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.filter((id) => id !== catId),
    }));
  };

  const handleRemoveWalletFilter = (walletId: string) => {
    setAppliedFilter((prev) => ({
      ...prev,
      selectedWallets: prev.selectedWallets.filter((id) => id !== walletId),
    }));
  };

  const handleRemoveReceiptFilter = () => {
    setAppliedFilter((prev) => ({
      ...prev,
      hasReceiptOnly: false,
    }));
  };

  const handleRemoveSortFilter = () => {
    setAppliedFilter((prev) => ({
      ...prev,
      sortBy: 'date_desc',
    }));
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilter.datePreset !== 'all') count += 1;
    if (appliedFilter.minAmount || appliedFilter.maxAmount) count += 1;
    if (appliedFilter.selectedCategories.length > 0) count += appliedFilter.selectedCategories.length;
    if (appliedFilter.selectedWallets.length > 0) count += appliedFilter.selectedWallets.length;
    if (appliedFilter.hasReceiptOnly) count += 1;
    if (appliedFilter.sortBy !== 'date_desc') count += 1;
    return count;
  }, [appliedFilter]);

  // Date boundaries calculation helper
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);

    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    const d7Str = getLocalDateString(d7);

    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const lastMonthDate = new Date(year, month - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(
      lastMonthDate.getMonth() + 1
    ).padStart(2, '0')}`;

    return {
      todayStr,
      d7Str,
      currentMonthPrefix,
      lastMonthPrefix,
    };
  }, []);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // 1. Transaction Type
        if (activeTypeFilter !== 'all' && tx.type !== activeTypeFilter) {
          return false;
        }

        // 2. Search Query (Title, Category, Note, Wallet)
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchTitle = tx.title.toLowerCase().includes(q);
          const matchCategory = tx.categoryName.toLowerCase().includes(q);
          const matchNote = tx.note ? tx.note.toLowerCase().includes(q) : false;
          const matchWallet = tx.walletName ? tx.walletName.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchCategory && !matchNote && !matchWallet) {
            return false;
          }
        }

        // 3. Date Preset & Custom Range
        const txDate = tx.date;
        if (appliedFilter.datePreset === 'today') {
          if (txDate !== dateBoundaries.todayStr) return false;
        } else if (appliedFilter.datePreset === '7days') {
          if (txDate < dateBoundaries.d7Str || txDate > dateBoundaries.todayStr) return false;
        } else if (appliedFilter.datePreset === 'month') {
          if (!txDate.startsWith(dateBoundaries.currentMonthPrefix)) return false;
        } else if (appliedFilter.datePreset === 'last_month') {
          if (!txDate.startsWith(dateBoundaries.lastMonthPrefix)) return false;
        } else if (appliedFilter.datePreset === 'custom') {
          if (appliedFilter.customStartDate && txDate < appliedFilter.customStartDate) return false;
          if (appliedFilter.customEndDate && txDate > appliedFilter.customEndDate) return false;
        }

        // 4. Amount Range
        if (appliedFilter.minAmount) {
          const minVal = parseFloat(appliedFilter.minAmount.replace(/[^0-9]/g, ''));
          if (!isNaN(minVal) && tx.amount < minVal) return false;
        }
        if (appliedFilter.maxAmount) {
          const maxVal = parseFloat(appliedFilter.maxAmount.replace(/[^0-9]/g, ''));
          if (!isNaN(maxVal) && tx.amount > maxVal) return false;
        }

        // 5. Category Multi-Select
        if (
          appliedFilter.selectedCategories.length > 0 &&
          !appliedFilter.selectedCategories.includes(tx.categoryId)
        ) {
          return false;
        }

        // 6. Wallet Multi-Select
        if (appliedFilter.selectedWallets.length > 0) {
          const txWallet = tx.walletId || 'cash';
          if (!appliedFilter.selectedWallets.includes(txWallet)) {
            return false;
          }
        }

        // 7. Has Receipt Only
        if (appliedFilter.hasReceiptOnly && !tx.receiptUri) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (appliedFilter.sortBy) {
          case 'date_asc':
            return (a.createdAt || 0) - (b.createdAt || 0);
          case 'amount_desc':
            return b.amount - a.amount;
          case 'amount_asc':
            return a.amount - b.amount;
          case 'date_desc':
          default:
            return (b.createdAt || 0) - (a.createdAt || 0);
        }
      });
  }, [transactions, activeTypeFilter, searchQuery, appliedFilter, dateBoundaries]);

  // Financial Summary from Filtered Results
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleOpenDetail = (tx: Transaction) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push({
      pathname: '/transaction-detail',
      params: { id: tx.id },
    });
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        activeOpacity={0.75}
        onPress={() => handleOpenDetail(item)}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isIncome
                ? Palette.emeraldMuted
                : item.categoryColor
                ? `${item.categoryColor}18`
                : Palette.roseMuted,
            },
          ]}
        >
          <Ionicons
            name={item.categoryIcon || (isIncome ? 'wallet-outline' : 'receipt-outline')}
            size={20}
            color={item.categoryColor || (isIncome ? Palette.emerald : Palette.rose)}
          />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  borderColor: item.categoryColor || Palette.border,
                  backgroundColor: item.categoryColor
                    ? `${item.categoryColor}12`
                    : Palette.surfaceElevated,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: item.categoryColor || Palette.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.categoryName}
              </Text>
            </View>

            {item.walletName ? (
              <View style={styles.walletBadge}>
                <Ionicons name="wallet-outline" size={10} color={Palette.textTertiary} />
                <Text style={styles.walletBadgeText} numberOfLines={1}>
                  {item.walletName}
                </Text>
              </View>
            ) : null}

            {item.receiptUri ? (
              <View style={styles.receiptIndicator}>
                <Ionicons name="image" size={10} color={Palette.emerald} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.txAmount,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}
            numberOfLines={1}
          >
            {isIncome ? '+' : '-'} {formatIDR(item.amount)}
          </Text>
          <Text style={styles.dateText} numberOfLines={1}>
            {formatDateID(item.date)}
            {item.time ? ` • ${formatTimeID(item.time, item.createdAt)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isFilterActive = activeFilterCount > 0 || activeTypeFilter !== 'all' || searchQuery.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Riwayat Transaksi</Text>
          <Text style={styles.screenSubtitle}>
            {filteredTransactions.length === 0
              ? 'Belum ada transaksi'
              : `Total ${filteredTransactions.length} transaksi ditemukan`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            router.push('/add-transaction');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Palette.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar with Advanced Filter Trigger */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Palette.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari transaksi, kategori, dompet..."
            placeholderTextColor={Palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Palette.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            activeFilterCount > 0 && styles.filterTriggerBtnActive,
          ]}
          onPress={handleOpenFilterModal}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeFilterCount > 0 ? 'options' : 'options-outline'}
            size={18}
            color={activeFilterCount > 0 ? '#FFFFFF' : Palette.textPrimary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadgeCount}>
              <Text style={styles.filterBadgeCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Type Filter Tabs (Semua, Pengeluaran, Pemasukan) */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, activeTypeFilter === 'all' && styles.filterPillActive]}
          onPress={() => handleTypeFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              activeTypeFilter === 'all' && styles.filterPillTextActive,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeTypeFilter === 'expense' && styles.filterPillActiveExpense,
          ]}
          onPress={() => handleTypeFilterChange('expense')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={14}
            color={activeTypeFilter === 'expense' ? Palette.rose : Palette.textTertiary}
          />
          <Text
            style={[
              styles.filterPillText,
              activeTypeFilter === 'expense' && styles.filterPillTextActiveExpense,
            ]}
          >
            Pengeluaran
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeTypeFilter === 'income' && styles.filterPillActiveIncome,
          ]}
          onPress={() => handleTypeFilterChange('income')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={14}
            color={activeTypeFilter === 'income' ? Palette.emerald : Palette.textTertiary}
          />
          <Text
            style={[
              styles.filterPillText,
              activeTypeFilter === 'income' && styles.filterPillTextActiveIncome,
            ]}
          >
            Pemasukan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <View style={styles.activeChipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeChipsScroll}
          >
            {/* Date Chip */}
            {appliedFilter.datePreset !== 'all' && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={handleRemoveDateFilter}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={12} color={Palette.indigo} />
                <Text style={styles.activeChipText}>
                  {appliedFilter.datePreset === 'today'
                    ? 'Hari Ini'
                    : appliedFilter.datePreset === '7days'
                    ? '7 Hari Terakhir'
                    : appliedFilter.datePreset === 'month'
                    ? 'Bulan Ini'
                    : appliedFilter.datePreset === 'last_month'
                    ? 'Bulan Lalu'
                    : `${appliedFilter.customStartDate || '...'} s/d ${
                        appliedFilter.customEndDate || '...'
                      }`}
                </Text>
                <Ionicons name="close-circle" size={14} color={Palette.indigo} />
              </TouchableOpacity>
            )}

            {/* Amount Chip */}
            {(appliedFilter.minAmount || appliedFilter.maxAmount) && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={handleRemoveAmountFilter}
                activeOpacity={0.7}
              >
                <Ionicons name="cash-outline" size={12} color={Palette.amber} />
                <Text style={styles.activeChipText}>
                  {appliedFilter.minAmount && appliedFilter.maxAmount
                    ? `Rp ${appliedFilter.minAmount} - ${appliedFilter.maxAmount}`
                    : appliedFilter.minAmount
                    ? `Min Rp ${appliedFilter.minAmount}`
                    : `Maks Rp ${appliedFilter.maxAmount}`}
                </Text>
                <Ionicons name="close-circle" size={14} color={Palette.amber} />
              </TouchableOpacity>
            )}

            {/* Category Chips */}
            {appliedFilter.selectedCategories.map((catId) => {
              const catObj = ALL_CATEGORIES.find((c) => c.id === catId);
              return (
                <TouchableOpacity
                  key={catId}
                  style={styles.activeChip}
                  onPress={() => handleRemoveCategoryFilter(catId)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={catObj?.icon || 'pricetag-outline'}
                    size={12}
                    color={catObj?.color || Palette.textSecondary}
                  />
                  <Text style={styles.activeChipText}>{catObj?.name || catId}</Text>
                  <Ionicons name="close-circle" size={14} color={Palette.textTertiary} />
                </TouchableOpacity>
              );
            })}

            {/* Wallet Chips */}
            {appliedFilter.selectedWallets.map((walletId) => {
              const walletObj = WALLET_OPTIONS.find((w) => w.id === walletId);
              return (
                <TouchableOpacity
                  key={walletId}
                  style={styles.activeChip}
                  onPress={() => handleRemoveWalletFilter(walletId)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={walletObj?.icon || 'wallet-outline'}
                    size={12}
                    color={walletObj?.color || Palette.textSecondary}
                  />
                  <Text style={styles.activeChipText}>{walletObj?.name || walletId}</Text>
                  <Ionicons name="close-circle" size={14} color={Palette.textTertiary} />
                </TouchableOpacity>
              );
            })}

            {/* Has Receipt Chip */}
            {appliedFilter.hasReceiptOnly && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={handleRemoveReceiptFilter}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={12} color={Palette.emerald} />
                <Text style={styles.activeChipText}>Ada Foto Struk</Text>
                <Ionicons name="close-circle" size={14} color={Palette.emerald} />
              </TouchableOpacity>
            )}

            {/* Sort Chip */}
            {appliedFilter.sortBy !== 'date_desc' && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={handleRemoveSortFilter}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-vertical" size={12} color={Palette.cyan} />
                <Text style={styles.activeChipText}>
                  {appliedFilter.sortBy === 'date_asc'
                    ? 'Terlama'
                    : appliedFilter.sortBy === 'amount_desc'
                    ? 'Nominal Terbesar'
                    : 'Nominal Terkecil'}
                </Text>
                <Ionicons name="close-circle" size={14} color={Palette.cyan} />
              </TouchableOpacity>
            )}

            {/* Clear All Chip */}
            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={handleResetFilter}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllChipText}>Reset Semua</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Filter Summary Strip (if active filters exist or search) */}
      {isFilterActive && filteredTransactions.length > 0 && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Ditemukan</Text>
            <Text style={styles.summaryValCount}>{summary.count} Transaksi</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Masuk</Text>
            <Text style={styles.summaryValIncome}>+{formatIDR(summary.income)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Keluar</Text>
            <Text style={styles.summaryValExpense}>-{formatIDR(summary.expense)}</Text>
          </View>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.emerald}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="filter-outline" size={32} color={Palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {isFilterActive ? 'Tidak Ada Transaksi yang Cocok' : 'Belum Ada Transaksi'}
            </Text>
            <Text style={styles.emptyText}>
              {isFilterActive
                ? 'Coba sesuaikan kata kunci pencarian atau ubah filter Anda.'
                : 'Catatan pengeluaran atau pemasukan Anda akan muncul di sini.'}
            </Text>
            {isFilterActive && (
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSearchQuery('');
                  setActiveTypeFilter('all');
                  handleResetFilter();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={14} color={Palette.emerald} />
                <Text style={styles.emptyResetBtnText}>Hapus Semua Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Advanced Filter Modal (In-Tree Overlay) */}
      {showFilterModal && (
        <View style={styles.filterModalOverlay}>
          <TouchableOpacity
            style={styles.filterModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />

          <View style={styles.filterModalContent}>
            {/* Modal Header */}
            <View style={styles.filterModalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="options" size={20} color={Palette.emerald} />
                <Text style={styles.filterModalTitle}>Filter Lanjutan</Text>
              </View>

              <TouchableOpacity
                style={styles.filterModalCloseBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Filter Options */}
            <ScrollView
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterModalBodyContent}
            >
              {/* 1. Periode Waktu */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>📅 Rentang Tanggal</Text>
                <View style={styles.chipsWrap}>
                  {[
                    { id: 'all', label: 'Semua Waktu' },
                    { id: 'today', label: 'Hari Ini' },
                    { id: '7days', label: '7 Hari Terakhir' },
                    { id: 'month', label: 'Bulan Ini' },
                    { id: 'last_month', label: 'Bulan Lalu' },
                    { id: 'custom', label: 'Rentang Kustom' },
                  ].map((preset) => {
                    const isSelected = tempFilter.datePreset === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.filterSelectChip,
                          isSelected && styles.filterSelectChipActive,
                        ]}
                        onPress={() =>
                          setTempFilter((prev) => ({
                            ...prev,
                            datePreset: preset.id as DatePreset,
                          }))
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterSelectChipText,
                            isSelected && styles.filterSelectChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {tempFilter.datePreset === 'custom' && (
                  <View style={styles.customDateRow}>
                    <View style={styles.customDateField}>
                      <Text style={styles.customDateLabel}>Dari Tanggal</Text>
                      <TextInput
                        style={styles.customDateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Palette.textMuted}
                        value={tempFilter.customStartDate}
                        onChangeText={(val) =>
                          setTempFilter((prev) => ({ ...prev, customStartDate: val }))
                        }
                      />
                    </View>
                    <View style={styles.customDateField}>
                      <Text style={styles.customDateLabel}>Sampai Tanggal</Text>
                      <TextInput
                        style={styles.customDateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Palette.textMuted}
                        value={tempFilter.customEndDate}
                        onChangeText={(val) =>
                          setTempFilter((prev) => ({ ...prev, customEndDate: val }))
                        }
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* 2. Rentang Nominal */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>💰 Rentang Nominal (Rp)</Text>
                <View style={styles.amountInputsRow}>
                  <View style={styles.amountFieldWrap}>
                    <Text style={styles.amountFieldLabel}>Minimum</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0"
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="numeric"
                      value={tempFilter.minAmount}
                      onChangeText={(val) =>
                        setTempFilter((prev) => ({
                          ...prev,
                          minAmount: val.replace(/[^0-9]/g, ''),
                        }))
                      }
                    />
                  </View>

                  <Text style={styles.amountHyphen}>-</Text>

                  <View style={styles.amountFieldWrap}>
                    <Text style={styles.amountFieldLabel}>Maksimum</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="Tak Terbatas"
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="numeric"
                      value={tempFilter.maxAmount}
                      onChangeText={(val) =>
                        setTempFilter((prev) => ({
                          ...prev,
                          maxAmount: val.replace(/[^0-9]/g, ''),
                        }))
                      }
                    />
                  </View>
                </View>

                {/* Amount Quick Presets */}
                <View style={styles.amountPresetsRow}>
                  {[
                    { label: '< 50rb', min: '', max: '50000' },
                    { label: '50rb - 200rb', min: '50000', max: '200000' },
                    { label: '200rb - 1jt', min: '200000', max: '1000000' },
                    { label: '> 1jt', min: '1000000', max: '' },
                  ].map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.amountPresetBtn}
                      onPress={() =>
                        setTempFilter((prev) => ({
                          ...prev,
                          minAmount: preset.min,
                          maxAmount: preset.max,
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.amountPresetBtnText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. Kategori (Multi-Select) */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>🏷️ Kategori</Text>
                <View style={styles.chipsWrap}>
                  {ALL_CATEGORIES.map((cat) => {
                    const isSelected = tempFilter.selectedCategories.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categorySelectChip,
                          isSelected && {
                            borderColor: cat.color,
                            backgroundColor: `${cat.color}18`,
                          },
                        ]}
                        onPress={() => {
                          setTempFilter((prev) => {
                            const exists = prev.selectedCategories.includes(cat.id);
                            return {
                              ...prev,
                              selectedCategories: exists
                                ? prev.selectedCategories.filter((id) => id !== cat.id)
                                : [...prev.selectedCategories, cat.id],
                            };
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={14}
                          color={isSelected ? cat.color : Palette.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categorySelectChipText,
                            isSelected && { color: cat.color, fontWeight: '700' },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Sumber Dana / Dompet (Multi-Select) */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>🏦 Sumber Dana / Dompet</Text>
                <View style={styles.chipsWrap}>
                  {WALLET_OPTIONS.map((wallet) => {
                    const isSelected = tempFilter.selectedWallets.includes(wallet.id);
                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        style={[
                          styles.walletSelectChip,
                          isSelected && {
                            borderColor: wallet.color,
                            backgroundColor: `${wallet.color}18`,
                          },
                        ]}
                        onPress={() => {
                          setTempFilter((prev) => {
                            const exists = prev.selectedWallets.includes(wallet.id);
                            return {
                              ...prev,
                              selectedWallets: exists
                                ? prev.selectedWallets.filter((id) => id !== wallet.id)
                                : [...prev.selectedWallets, wallet.id],
                            };
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={wallet.icon}
                          size={14}
                          color={isSelected ? wallet.color : Palette.textSecondary}
                        />
                        <Text
                          style={[
                            styles.walletSelectChipText,
                            isSelected && { color: wallet.color, fontWeight: '700' },
                          ]}
                        >
                          {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Lampiran Struk Bukti */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>🧾 Lampiran Foto Bukti</Text>
                <TouchableOpacity
                  style={[
                    styles.receiptToggleCard,
                    tempFilter.hasReceiptOnly && styles.receiptToggleCardActive,
                  ]}
                  onPress={() =>
                    setTempFilter((prev) => ({
                      ...prev,
                      hasReceiptOnly: !prev.hasReceiptOnly,
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.receiptToggleIconWrap}>
                    <Ionicons
                      name="image"
                      size={20}
                      color={tempFilter.hasReceiptOnly ? Palette.emerald : Palette.textTertiary}
                    />
                  </View>
                  <View style={styles.receiptToggleTextWrap}>
                    <Text style={styles.receiptToggleTitle}>Hanya dengan Foto Struk</Text>
                    <Text style={styles.receiptToggleSubtitle}>
                      Tampilkan transaksi yang memiliki foto struk/transfer
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      tempFilter.hasReceiptOnly
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={22}
                    color={tempFilter.hasReceiptOnly ? Palette.emerald : Palette.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {/* 6. Pengurutan */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>🔃 Urutkan Transaksi</Text>
                <View style={styles.chipsWrap}>
                  {[
                    { id: 'date_desc', label: 'Terbaru (Default)' },
                    { id: 'date_asc', label: 'Terlama' },
                    { id: 'amount_desc', label: 'Nominal Terbesar' },
                    { id: 'amount_asc', label: 'Nominal Terkecil' },
                  ].map((sort) => {
                    const isSelected = tempFilter.sortBy === sort.id;
                    return (
                      <TouchableOpacity
                        key={sort.id}
                        style={[
                          styles.filterSelectChip,
                          isSelected && styles.filterSelectChipActive,
                        ]}
                        onPress={() =>
                          setTempFilter((prev) => ({
                            ...prev,
                            sortBy: sort.id as SortOption,
                          }))
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterSelectChipText,
                            isSelected && styles.filterSelectChipTextActive,
                          ]}
                        >
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => setTempFilter(DEFAULT_FILTER)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalResetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyFilter}
                activeOpacity={0.8}
              >
                <Text style={styles.modalApplyBtnText}>Terapkan Filter</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 8,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: Palette.textPrimary,
    fontSize: 14,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
          outlineStyle: 'none',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  filterTriggerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTriggerBtnActive: {
    backgroundColor: Palette.emerald,
    borderColor: Palette.emerald,
  },
  filterBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Palette.rose,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Palette.surface,
  },
  filterBadgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 8,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: Palette.textPrimary,
    borderColor: Palette.textPrimary,
  },
  filterPillActiveExpense: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  filterPillActiveIncome: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextActiveExpense: {
    color: Palette.rose,
  },
  filterPillTextActiveIncome: {
    color: Palette.emerald,
  },
  // Active Filter Chips
  activeChipsContainer: {
    marginBottom: Spacing.sm,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  activeChipsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 6,
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 5,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  clearAllChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.rose,
  },
  // Summary Strip
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.border,
  },
  summaryLabel: {
    fontSize: 10,
    color: Palette.textTertiary,
    marginBottom: 2,
  },
  summaryValCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  summaryValIncome: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  summaryValExpense: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.rose,
  },
  // List Items
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 3,
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Palette.textTertiary,
  },
  receiptIndicator: {
    backgroundColor: Palette.emeraldMuted,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: '48%',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  amountIncome: {
    color: Palette.emerald,
  },
  amountExpense: {
    color: Palette.rose,
  },
  dateText: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginTop: 3,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: Palette.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.emerald,
    gap: 6,
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emerald,
  },
  // Filter Modal Styles
  filterModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'flex-end',
  },
  filterModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  filterModalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  filterModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalBody: {
    flexGrow: 1,
  },
  filterModalBodyContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.xl,
  },
  sectionWrap: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterSelectChipActive: {
    backgroundColor: Palette.textPrimary,
    borderColor: Palette.textPrimary,
  },
  filterSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterSelectChipTextActive: {
    color: '#FFFFFF',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  customDateField: {
    flex: 1,
  },
  customDateLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginBottom: 4,
  },
  customDateInput: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: Palette.textPrimary,
  },
  amountInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountFieldWrap: {
    flex: 1,
  },
  amountFieldLabel: {
    fontSize: 11,
    color: Palette.textTertiary,
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: Palette.textPrimary,
  },
  amountHyphen: {
    fontSize: 16,
    color: Palette.textTertiary,
    marginTop: 16,
  },
  amountPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  amountPresetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  amountPresetBtnText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  categorySelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 5,
  },
  categorySelectChipText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  walletSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 5,
  },
  walletSelectChipText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  receiptToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  receiptToggleCardActive: {
    borderColor: Palette.emerald,
    backgroundColor: Palette.emeraldMuted,
  },
  receiptToggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptToggleTextWrap: {
    flex: 1,
  },
  receiptToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 2,
  },
  receiptToggleSubtitle: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  // Modal Footer
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    gap: 12,
  },
  modalResetBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.emerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
