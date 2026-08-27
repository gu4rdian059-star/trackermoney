import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Palette, Spacing, Radius, formatIDR, formatDateID, formatTimeID } from '../constants/theme';
import { financeStorage } from '../services/financeStorage';
import { Transaction } from '../types/finance';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFullscreenPhoto, setShowFullscreenPhoto] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      financeStorage.getTransactions().then((list) => {
        const found = list.find((item) => item.id === id);
        setTx(found || null);
      });
    }
  }, [id]);

  const handleOpenDeleteConfirm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!tx || isDeleting) return;

    try {
      setIsDeleting(true);
      await financeStorage.deleteTransaction(tx.id);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowConfirmModal(false);
      // Return to previous screen
      router.back();
    } catch {
      setIsDeleting(false);
    }
  };

  if (!tx) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={Palette.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Palette.textTertiary} />
          <Text style={styles.notFoundText}>Transaksi tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = tx.type === 'income';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={Palette.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section Nominal */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: isIncome ? '#ECFDF5' : '#FFF1F2' },
            ]}
          >
            <Ionicons
              name={tx.categoryIcon || (isIncome ? 'wallet-outline' : 'receipt-outline')}
              size={32}
              color={isIncome ? Palette.emerald : Palette.rose}
            />
          </View>

          <Text style={styles.txTitle}>{tx.title}</Text>

          <View style={styles.typeBadgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isIncome ? '#ECFDF5' : '#FFF1F2',
                  borderColor: isIncome ? '#A7F3D0' : '#FECDD3',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isIncome ? Palette.emerald : Palette.rose },
                ]}
              >
                {isIncome ? 'Pemasukan' : 'Pengeluaran'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.amountText,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}
          >
            {isIncome ? '+' : '-'} {formatIDR(tx.amount)}
          </Text>
        </View>

        {/* Kartu Rincian Metadata */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <Ionicons name="grid-outline" size={16} color={Palette.textTertiary} />
              <Text style={styles.detailLabel}>Kategori</Text>
            </View>
            <Text style={styles.detailValue}>{tx.categoryName}</Text>
          </View>

          <View style={styles.detailDivider} />

          {/* Sumber Dana / Dompet */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <Ionicons name="wallet-outline" size={16} color={Palette.textTertiary} />
              <Text style={styles.detailLabel}>
                {isIncome ? 'Masuk ke' : 'Sumber Dana'}
              </Text>
            </View>
            <View style={styles.detailWalletBadge}>
              <Text style={styles.detailWalletText}>
                {tx.walletName || 'Tunai / Dompet'}
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <Ionicons name="calendar-outline" size={16} color={Palette.textTertiary} />
              <Text style={styles.detailLabel}>Tanggal</Text>
            </View>
            <Text style={styles.detailValue}>{formatDateID(tx.date)}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <Ionicons name="time-outline" size={16} color={Palette.textTertiary} />
              <Text style={styles.detailLabel}>Waktu Transaksi</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatTimeID(tx.time, tx.createdAt) || 'Waktu Real-Time'}
            </Text>
          </View>

          {tx.note ? (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelWrap}>
                  <Ionicons name="document-text-outline" size={16} color={Palette.textTertiary} />
                  <Text style={styles.detailLabel}>Catatan</Text>
                </View>
                <Text style={styles.detailValueNote}>{tx.note}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <Ionicons name="finger-print-outline" size={16} color={Palette.textTertiary} />
              <Text style={styles.detailLabel}>ID Referensi</Text>
            </View>
            <Text style={styles.detailValueMuted}>{tx.id}</Text>
          </View>
        </View>

        {/* Kartu Foto Struk / Bukti Transfer Jika Ada */}
        {tx.receiptUri ? (
          <View style={styles.receiptSectionCard}>
            <View style={styles.receiptSectionHeader}>
              <View style={styles.receiptSectionTitleWrap}>
                <Ionicons name="image" size={16} color={Palette.emerald} />
                <Text style={styles.receiptSectionTitle}>Foto Struk / Bukti Transfer</Text>
              </View>
              <Text style={styles.receiptHintText}>Ketuk untuk perbesar</Text>
            </View>

            <TouchableOpacity
              style={styles.receiptImageWrap}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setShowFullscreenPhoto(true);
              }}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: tx.receiptUri }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
              <View style={styles.receiptZoomOverlay}>
                <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
                <Text style={styles.receiptZoomText}>Lihat Ukuran Penuh</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tombol Hapus */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleOpenDeleteConfirm}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={Palette.rose} />
          <Text style={styles.deleteButtonText}>Hapus Transaksi Ini</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Konfirmasi Hapus Kustom (100% Berfungsi di iOS, Android, Web & PWA) */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={28} color={Palette.rose} />
            </View>

            <Text style={styles.confirmTitle}>Hapus Transaksi?</Text>
            <Text style={styles.confirmMessage}>
              Apakah Anda yakin ingin menghapus catatan "{tx.title}" sebesar {formatIDR(tx.amount)}? Tindakan ini tidak dapat dibatalkan.
            </Text>

            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.deleteConfirmBtnText}>Hapus</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Pratinjau Foto Ukuran Penuh */}
      <Modal
        visible={showFullscreenPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullscreenPhoto(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <SafeAreaView style={styles.fullscreenSafeArea}>
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={() => setShowFullscreenPhoto(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.fullscreenTitle}>Bukti / Struk Transaksi</Text>
              <View style={styles.fullscreenPlaceholder} />
            </View>

            <View style={styles.fullscreenImageContainer}>
              {tx.receiptUri ? (
                <Image
                  source={{ uri: tx.receiptUri }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
    paddingTop: Spacing.xl,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  txTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  typeBadgeRow: {
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountIncome: {
    color: Palette.emerald,
  },
  amountExpense: {
    color: Palette.rose,
  },
  detailsCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Palette.textTertiary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  detailValueNote: {
    fontSize: 13,
    color: Palette.textSecondary,
    maxWidth: 180,
    textAlign: 'right',
  },
  detailValueMuted: {
    fontSize: 11,
    color: Palette.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Palette.surfaceElevated,
    marginVertical: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  deleteButtonText: {
    color: Palette.rose,
    fontSize: 14,
    fontWeight: '700',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: Palette.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  confirmIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: Palette.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.rose,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Palette.rose,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Wallet Badge
  detailWalletBadge: {
    backgroundColor: Palette.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  detailWalletText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  // Receipt Image Card
  receiptSectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  receiptSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptSectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  receiptHintText: {
    fontSize: 11,
    color: Palette.textTertiary,
  },
  receiptImageWrap: {
    width: '100%',
    height: 180,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Palette.surfaceElevated,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptZoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
  },
  receiptZoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Fullscreen Photo Modal
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenSafeArea: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    zIndex: 10,
  },
  fullscreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullscreenPlaceholder: {
    width: 40,
  },
  fullscreenImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
