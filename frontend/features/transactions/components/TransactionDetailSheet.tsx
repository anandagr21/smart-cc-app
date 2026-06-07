import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, CreditCard, ShoppingBag, Edit2, Trash2 } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { format } from 'date-fns';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '@/features/cards/hooks/useCards';
import { useDeleteTransaction } from '../hooks/useDeleteTransaction';
import * as Icons from 'lucide-react-native';
import { TransactionInsightCard } from './TransactionInsightCard';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';

interface TransactionDetailSheetProps {
  transaction: TransactionResponse | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (transaction: TransactionResponse) => void;
}

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
  transaction,
  visible,
  onClose,
  onEdit,
}) => {
  const { data: cardsData } = useCards();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  if (!transaction) return null;

  const card = cardsData?.find((c) => c.id === transaction.user_card_id);
  const cardName = card?.nickname || card?.card_details?.card_name || 'Credit Card';
  const network = card?.card_details?.network || 'default';

  const accent = getCategoryAccent(transaction.category);
  // @ts-ignore
  const IconComponent = Icons[accent.iconName] || Icons.Receipt;

  const dateString = transaction.created_at 
    ? (transaction.created_at.endsWith('Z') ? transaction.created_at : `${transaction.created_at}Z`)
    : transaction.transaction_date;
  const formattedDate = format(new Date(dateString), 'MMMM d, yyyy • h:mm a');
  
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency || 'INR',
    minimumFractionDigits: 0,
  }).format(transaction.amount);

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteTransaction(transaction.id);
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={100}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
              },
            ]}
          />
          {/* Top highlight */}
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          {/* Header Actions */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
              {/* @ts-ignore */}
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => onEdit(transaction)} style={[styles.iconBtn, { backgroundColor: colors.surface, marginRight: 8 }]}>
                {/* @ts-ignore */}
                <Edit2 size={18} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: colors.dangerSoft }]}>
                {/* @ts-ignore */}
                <Trash2 size={18} color={colors.danger} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Hero Section */}
            <View style={styles.heroWrap}>
              <View style={[styles.iconRing, { borderColor: colors.borderHighlight }]}>
                <View style={[styles.iconInner, { backgroundColor: colors.surfaceElevated }]}>
                  {/* @ts-ignore */}
                  <IconComponent size={32} color={colors.textPrimary} strokeWidth={1.5} />
                </View>
              </View>
              <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
                {formattedAmount}
              </Text>
              <Text style={[styles.merchantName, { color: colors.textSecondary }]}>
                {transaction.merchant_name}
              </Text>
            </View>

            {/* Details List */}
            <View style={[styles.detailsWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <View style={styles.detailLabelWrap}>
                  {/* @ts-ignore */}
                  <ShoppingBag size={16} color={colors.textMuted} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Category</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transaction.category}</Text>
              </View>
              
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <View style={styles.detailLabelWrap}>
                  {/* @ts-ignore */}
                  <Calendar size={16} color={colors.textMuted} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Date & Time</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formattedDate}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <View style={styles.detailLabelWrap}>
                  {/* @ts-ignore */}
                  <CreditCard size={16} color={colors.textMuted} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Payment Method</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{cardName}</Text>
              </View>

              {transaction.updated_at && transaction.updated_at !== transaction.created_at && (
                <View style={[styles.detailRow, { borderBottomWidth: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={styles.detailLabelWrap}>
                    {/* @ts-ignore */}
                    <Calendar size={16} color={colors.textMuted} style={styles.detailIcon} />
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Last Updated</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {format(new Date(transaction.updated_at.endsWith('Z') ? transaction.updated_at : `${transaction.updated_at}Z`), 'MMMM d, yyyy • h:mm a')}
                  </Text>
                </View>
              )}
            </View>

            {/* Insights */}
            <View style={styles.insightsWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Insights
              </Text>
              <TransactionInsightCard transaction={transaction} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '90%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    marginBottom: 8,
  },
  merchantName: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.medium,
  },
  detailsWrap: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  detailValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  insightsWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 16,
  },
});
