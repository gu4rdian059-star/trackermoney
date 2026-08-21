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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Palette, Spacing, Radius, formatIDR, formatDateID, formatTimeID } from '../../constants/theme';
import { financeStorage } from '../../services/financeStorage';
import { Transaction } from '../../types/finance';

type FilterType = 'all' | 'expense' | 'income';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

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

  const handleFilterChange = (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setActiveFilter(filter);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesFilter =
        activeFilter === 'all' ? true : tx.type === activeFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.title.toLowerCase().includes(q) ||
        tx.categoryName.toLowerCase().includes(q) ||
        (tx.note && tx.note.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [transactions, activeFilter, searchQuery]);

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
            { backgroundColor: isIncome ? Palette.emeraldMuted : Palette.roseMuted },
          ]}
        >
          <Ionicons
            name={item.categoryIcon || (isIncome ? 'wallet-outline' : 'receipt-outline')}
            size={20}
            color={isIncome ? Palette.emerald : Palette.rose}
          />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
            </View>
            <Text style={styles.dateText}>
              {formatDateID(item.date)}
              {item.time ? ` • ${formatTimeID(item.time, item.createdAt)}` : ''}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.txAmount,
            isIncome ? styles.amountIncome : styles.amountExpense,
          ]}
        >
          {isIncome ? '+' : '-'} {formatIDR(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Palette.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari transaksi, kategori, atau catatan..."
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
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
          onPress={() => handleFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === 'all' && styles.filterPillTextActive,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === 'expense' && styles.filterPillActiveExpense,
          ]}
          onPress={() => handleFilterChange('expense')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={14}
            color={activeFilter === 'expense' ? Palette.rose : Palette.textTertiary}
          />
          <Text
            style={[
              styles.filterPillText,
              activeFilter === 'expense' && styles.filterPillTextActiveExpense,
            ]}
          >
            Pengeluaran
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === 'income' && styles.filterPillActiveIncome,
          ]}
          onPress={() => handleFilterChange('income')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={14}
            color={activeFilter === 'income' ? Palette.emerald : Palette.textTertiary}
          />
          <Text
            style={[
              styles.filterPillText,
              activeFilter === 'income' && styles.filterPillTextActiveIncome,
            ]}
          >
            Pemasukan
          </Text>
        </TouchableOpacity>
      </View>

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
              <Ionicons name="receipt-outline" size={32} color={Palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Tidak Ditemukan' : 'Belum Ada Transaksi'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Tidak ada transaksi dengan kata kunci "${searchQuery}".`
                : 'Catatan pengeluaran atau pemasukan Anda akan muncul di sini.'}
            </Text>
          </View>
        }
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  searchBox: {
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  },
  txInfo: {
    flex: 1,
    marginRight: 12,
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
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountIncome: {
    color: Palette.emerald,
  },
  amountExpense: {
    color: Palette.rose,
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
  },
});
