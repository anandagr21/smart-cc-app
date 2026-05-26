import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, X, Search, Info } from 'lucide-react-native';

import { TransactionResponse } from '../types/transaction.types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useCards } from '../../cards/hooks/useCards';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useUpdateTransaction } from '../hooks/useUpdateTransaction';
import { useRecommendation } from '../../recommendations/hooks/useRecommendation';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { tokens } from '../../../theme/tokens';
import { useDebounce } from '../../../hooks/useDebounce';
import { useFuseSearch } from '../../../shared/search/useFuseSearch';
import { WalletListRow } from './WalletListRow';
import { HeroRecommendationCard } from './HeroRecommendationCard';
import { SecondaryRecommendationCard } from './SecondaryRecommendationCard';
import { RecommendationExplainabilitySheet } from './RecommendationExplainabilitySheet';
import { LinearGradient } from 'expo-linear-gradient';

import { FeatureFlags } from '../../../config/features';

const formSchema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required').transform((v) => v.trim()),
  amount: z.coerce.number().positive('Amount must be positive'),
  user_card_id: z.string().min(1, 'Please select a card'),
  payment_mode: z.enum(['ONLINE', 'OFFLINE', 'INTERNATIONAL']).default('ONLINE'),
});

type FormData = z.infer<typeof formSchema>;

interface TransactionFormSheetProps {
  visible: boolean;
  onClose: () => void;
  initialData?: TransactionResponse | null;
}

const PAYMENT_MODES = [
  { label: 'Online', value: 'ONLINE' },
  { label: 'Offline', value: 'OFFLINE' },
  { label: 'Intl', value: 'INTERNATIONAL' },
];

export const TransactionFormSheet: React.FC<TransactionFormSheetProps> = ({
  visible,
  onClose,
  initialData,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { data: cardsData } = useCards();
  const addTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const getRecommendation = useRecommendation();
  
  const isEditing = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: { merchant_name: '', user_card_id: '', payment_mode: 'ONLINE' },
  });

  const merchantName = watch('merchant_name');
  const amount = watch('amount');
  const paymentMode = watch('payment_mode');
  const selectedCardId = watch('user_card_id');

  const debouncedMerchant = useDebounce(merchantName, 350);
  const debouncedAmount = useDebounce(amount, 500);

  // Search Query for Wallet
  const [searchQuery, setSearchQuery] = useState('');
  
  // Explainability Sheet
  const [showExplainability, setShowExplainability] = useState(false);

  // Fetch recommendations
  useEffect(() => {
    if (visible && debouncedMerchant?.length >= 3 && FeatureFlags.ENABLE_SMART_RECOMMENDATIONS) {
      // Default to 1000 if amount is empty to satisfy backend requirements and get flat rankings
      const fetchAmount = Number(debouncedAmount) > 0 ? Number(debouncedAmount) : 1000;
      
      getRecommendation.mutate({
        merchant_name: debouncedMerchant,
        amount: fetchAmount,
        payment_mode: (paymentMode || 'ONLINE').toLowerCase() as any,
      }, {
        onSuccess: (res) => {
          if (res.best_card) {
            const bestCardInWallet = cardsData?.find(c => c.card_details?.card_name === res.best_card || c.nickname === res.best_card);
            if (bestCardInWallet) {
              setValue('user_card_id', bestCardInWallet.id);
            }
          }
        }
      });
    }
  }, [debouncedMerchant, debouncedAmount, paymentMode, visible]);

  useEffect(() => {
    if (visible && initialData) {
      reset({
        merchant_name: initialData.merchant_name,
        amount: initialData.amount,
        user_card_id: initialData.user_card_id,
        payment_mode: initialData.payment_mode || 'ONLINE',
      });
      setSearchQuery('');
    } else if (visible && cardsData?.length && !initialData) {
      reset({
        merchant_name: '',
        amount: undefined,
        user_card_id: cardsData[0].id,
        payment_mode: 'ONLINE',
      });
      setSearchQuery('');
    }
  }, [visible, initialData, cardsData, reset]);

  const onFormSubmit = async (data: any) => {
    try {
      if (isEditing) {
        await updateTx.mutateAsync({
          id: initialData.id,
          data: {
            merchant_name: data.merchant_name,
            amount: data.amount,
            user_card_id: data.user_card_id,
            payment_mode: data.payment_mode.toLowerCase() as any,
          },
        });
      } else {
        await addTx.mutateAsync({
          ...data,
          payment_mode: data.payment_mode.toLowerCase() as any,
          transaction_date: new Date().toISOString().split('T')[0],
        });
      }
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  // --- Hybrid Picker Logic ---
  const rankedCards = getRecommendation.data?.ranked_cards || [];
  
  // Find Unique Winners across objectives
  const winningWalletCards = useMemo(() => {
    if (!rankedCards) return [];
    const winners = new Map<string, typeof rankedCards[0]>();
    
    // MAX_REWARD
    const maxReward = rankedCards.find(rc => rc.objective_rankings?.['MAX_REWARD'] === 1);
    if (maxReward) winners.set(maxReward.card_id, maxReward);
    
    // PORTFOLIO_OPTIMIZED
    const longTerm = rankedCards.find(rc => rc.objective_rankings?.['PORTFOLIO_OPTIMIZED'] === 1);
    if (longTerm) winners.set(longTerm.card_id, longTerm);
    
    // FEE_WAIVER
    const waiver = rankedCards.find(rc => rc.objective_rankings?.['FEE_WAIVER'] === 1);
    // Only include waiver if it actually has waiver value > 0
    if (waiver && waiver.portfolio_score_breakdown?.waiver_value > 0) winners.set(waiver.card_id, waiver);
    
    // MILESTONE_ACCELERATION
    const milestone = rankedCards.find(rc => rc.objective_rankings?.['MILESTONE_ACCELERATION'] === 1);
    if (milestone && milestone.portfolio_score_breakdown?.milestone_value > 0) winners.set(milestone.card_id, milestone);
    
    return Array.from(winners.values()).map(rc => ({
      card: cardsData?.find(c => c.card_details?.card_name === rc.card_name || c.nickname === rc.card_name),
      recommendation: rc
    })).filter(r => r.card) as { card: NonNullable<typeof cardsData>[0], recommendation: typeof rankedCards[0] }[];
  }, [rankedCards, cardsData]);

  // Full Wallet
  const { results: filteredCards } = useFuseSearch({
    items: cardsData || [],
    query: searchQuery,
    keys: [
      { name: 'card_details.card_name', weight: 0.7 },
      { name: 'nickname', weight: 0.7 },
      { name: 'card_details.bank_name', weight: 0.3 },
      { name: 'card_details.network', weight: 0.2 },
    ],
    threshold: 0.3,
  });

  const groupedWallet = useMemo(() => {
    return filteredCards.reduce((acc, card) => {
      const bank = card.card_details?.bank_name || 'Other';
      if (!acc[bank]) acc[bank] = [];
      acc[bank].push(card);
      return acc;
    }, {} as Record<string, NonNullable<typeof cardsData>[0][]>);
  }, [filteredCards]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
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
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            {/* AMOUNT HERO */}
            <View style={styles.amountHeroWrap}>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.amountInputRow}>
                    <Text style={[styles.currencySymbol, { color: value ? colors.textPrimary : colors.textMuted }]}>₹</Text>
                    <Input
                      testID="amount-input"
                      placeholder="0"
                      keyboardType="numeric"
                      value={value?.toString() || ''}
                      onChangeText={onChange}
                      style={styles.heroInputContainer}
                      // @ts-ignore
                      inputStyle={[styles.heroInput, { color: colors.textPrimary }]}
                      hideBorder
                      hideFocusGlow
                      autoFocus
                    />
                  </View>
                )}
              />
              {errors.amount?.message && (
                <Text style={[styles.errorText, { color: colors.danger, textAlign: 'center' }]}>
                  {errors.amount.message as string}
                </Text>
              )}
            </View>

            {/* MERCHANT */}
            <Controller
              control={control}
              name="merchant_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  testID="merchant-input"
                  label="Merchant"
                  placeholder="Amazon, Uber, Starbucks..."
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.merchant_name?.message as string}
                  leftIcon={<Store size={18} color={colors.textMuted} />}
                />
              )}
            />

            {/* PAYMENT MODE */}
            <View style={styles.sectionWrap}>
              <Controller
                control={control}
                name="payment_mode"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.segmentRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {PAYMENT_MODES.map((mode) => {
                      const isActive = value === mode.value;
                      return (
                        <TouchableOpacity
                          key={mode.value}
                          onPress={() => onChange(mode.value)}
                          activeOpacity={0.7}
                          style={[
                            styles.segmentBtn,
                            isActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: StyleSheet.hairlineWidth }
                          ]}
                        >
                          <Text style={[
                            styles.segmentText,
                            { 
                              color: isActive ? colors.primary : colors.textMuted,
                              fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium
                            }
                          ]}>
                            {mode.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
            </View>

            {/* SECTION 1: SMART RECOMMENDED CARDS */}
            {FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && winningWalletCards.length > 0 && (
              <View style={styles.recommendationSection}>
                <View style={styles.recommendationHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.success }]}>✨ BEST FOR YOUR PORTFOLIO</Text>
                  <TouchableOpacity style={styles.infoWrap} onPress={() => setShowExplainability(true)} activeOpacity={0.7}>
                    <Text style={styles.infoText}>Why these?</Text>
                    {/* @ts-ignore */}
                    <Info size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>

                {/* Render Winners */}
                {winningWalletCards.map(({ card, recommendation }) => (
                  <HeroRecommendationCard
                    key={card.id}
                    card={card}
                    recommendation={recommendation}
                    delta={null} // Deltas don't make sense cross-objective usually
                    isActive={selectedCardId === card.id}
                    onPress={() => setValue('user_card_id', card.id)}
                  />
                ))}
              </View>
            )}

            {/* SECTION 2: SEARCHABLE FULL WALLET */}
            <View style={styles.walletSection}>
              <View style={styles.walletHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR WALLET</Text>
                {errors.user_card_id?.message && (
                  <Text style={[styles.errorText, { color: colors.danger, marginTop: 0 }]}>
                    {errors.user_card_id.message as string}
                  </Text>
                )}
              </View>

              <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {/* @ts-ignore */}
                <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  placeholder="Search cards by bank, card name or network..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={styles.walletList}>
                {Object.entries(groupedWallet).map(([bank, cards]) => (
                  <View key={bank} style={styles.bankGroup}>
                    <Text style={[styles.bankGroupTitle, { color: colors.textMuted }]}>{bank}</Text>
                    {cards.map(card => {
                      const recommendation = rankedCards.find(rc => rc.card_name === card.card_details?.card_name || rc.card_name === card.nickname);
                      return (
                        <WalletListRow
                          key={card.id}
                          card={card}
                          isActive={selectedCardId === card.id}
                          onPress={(id) => setValue('user_card_id', id)}
                          recommendation={recommendation}
                        />
                      );
                    })}
                  </View>
                ))}
                {Object.keys(groupedWallet).length === 0 && (
                  <Text style={[styles.emptySearch, { color: colors.textMuted }]}>No cards found.</Text>
                )}
              </View>
            </View>

            {/* CTA */}
            <LinearGradient
              colors={['#10B981', '#059669']} // Emerald Glow
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <TouchableOpacity 
                testID="submit-tx-btn"
                style={styles.ctaInner}
                onPress={handleSubmit(onFormSubmit)}
                disabled={isSubmitting || addTx.isPending || updateTx.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaText}>
                  {isSubmitting || addTx.isPending || updateTx.isPending ? 'Processing...' : (isEditing ? 'Save Changes' : 'Add Transaction')}
                </Text>
              </TouchableOpacity>
            </LinearGradient>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <RecommendationExplainabilitySheet
        visible={showExplainability}
        onClose={() => setShowExplainability(false)}
        recommendedCards={winningWalletCards}
      />
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
    height: '92%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  amountHeroWrap: {
    alignItems: 'flex-start',
    marginBottom: 32,
    marginTop: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  currencySymbol: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    marginRight: 8,
  },
  heroInputContainer: {
    marginBottom: 0,
    minHeight: 0,
    width: 'auto',
    minWidth: 100,
  },
  heroInput: {
    fontSize: 56, // Massive Apple Wallet size
    fontWeight: tokens.fontWeight.heavy,
    height: 80,
    letterSpacing: -2,
    paddingVertical: 0,
    textAlign: 'left',
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 10,
    marginLeft: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: tokens.fontSize.caption,
  },
  recommendationSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
  },
  infoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: tokens.fontSize.micro,
  },
  secondaryScroll: {
    paddingRight: 24,
    paddingBottom: 4,
  },
  walletSection: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    height: '100%',
  },
  walletList: {
    gap: 16,
  },
  bankGroup: {
    gap: 8,
  },
  bankGroupTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginLeft: 4,
    marginBottom: 4,
  },
  emptySearch: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: tokens.fontSize.body,
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
  },
  ctaGradient: {
    borderRadius: tokens.radius.full,
    marginTop: 8,
  },
  ctaInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
