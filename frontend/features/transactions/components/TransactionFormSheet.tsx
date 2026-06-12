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
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, X, Search, Info, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';

import { TransactionResponse } from '../types/transaction.types';
import { OptimizationIntent } from '@/features/recommendations/types/api';
import { Input } from '@/components/ui/Input';
import { useCards } from '@/features/cards/hooks/useCards';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useUpdateTransaction } from '../hooks/useUpdateTransaction';
import { useRecommendation } from '@/features/recommendations/hooks/useRecommendation';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useDebounce } from '@/hooks/useDebounce';
import { useFuseSearch } from '@/shared/search/useFuseSearch';
import { WalletListRow } from './WalletListRow';
import { HeroRecommendationCard } from './HeroRecommendationCard';
import { SecondaryRecommendationCard } from './SecondaryRecommendationCard';
import { RecommendationExplainabilitySheet } from './RecommendationExplainabilitySheet';
import { LinearGradient } from 'expo-linear-gradient';
import { usePersonalityProfile, OptimizationPersonality } from '@/features/personality/api/personalityApi';

import { FeatureFlags } from '@/config/features';

const triggerHaptic = async (type: 'selection' | 'success' | 'error') => {
  try {
    if (type === 'selection') await Haptics.selectionAsync();
    else if (type === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {
    // Ignore error if native module is not linked
  }
};

const formSchema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required').transform((v) => v.trim()),
  amount: z.coerce.number().positive('Amount must be positive'),
  user_card_id: z.string().min(1, 'Please select a card'),
  payment_mode: z.enum(['ONLINE', 'OFFLINE', 'INTERNATIONAL']).default('ONLINE'),
  override_reason: z.string().optional(),
  intent: z.enum(['MAX_REWARDS', 'SAVE_FEE_WAIVER', 'BALANCED', 'SIMPLIFY_DECISIONS']).default('BALANCED'),
});

type FormData = z.infer<typeof formSchema>;

const INTENT_OPTIONS = [
  { label: 'Max Rewards', value: 'MAX_REWARDS', disabled: false },
  { label: 'Save Fee', value: 'SAVE_FEE_WAIVER', disabled: false },
  { label: 'Balanced', value: 'BALANCED', disabled: false },
  { label: 'Simplify', value: 'SIMPLIFY_DECISIONS', disabled: true }
];

const OVERRIDE_REASONS = [
  { label: 'Personal preference', value: 'Personal preference' },
  { label: 'Building milestone', value: 'Building milestone' },
  { label: 'Simplifying wallet', value: 'Simplifying wallet' },
  { label: 'Avoiding annual fee', value: 'Avoiding annual fee' },
  { label: 'Temporary choice', value: 'Temporary choice' }
];

const mapPersonalityToIntent = (personality?: OptimizationPersonality) => {
  switch (personality) {
    case OptimizationPersonality.MAXIMIZE_REWARDS:
    case OptimizationPersonality.TRAVEL_OPTIMIZATION:
      return 'MAX_REWARDS';
    case OptimizationPersonality.FEE_MINIMIZATION:
      return 'SAVE_FEE_WAIVER';
    case OptimizationPersonality.WALLET_SIMPLICITY:
      return 'SIMPLIFY_DECISIONS';
    case OptimizationPersonality.BALANCED_INTELLIGENCE:
    default:
      return 'BALANCED';
  }
};

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
  const insets = useSafeAreaInsets();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { data: cardsData } = useCards();
  const { data: personalityProfile } = usePersonalityProfile();
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
    defaultValues: { merchant_name: '', user_card_id: '', payment_mode: 'ONLINE', intent: 'BALANCED' },
  });

  const merchantName = watch('merchant_name');
  const amount = watch('amount');
  const paymentMode = watch('payment_mode');
  const selectedCardId = watch('user_card_id');
  const intentValue = watch('intent');

  const debouncedMerchant = useDebounce(merchantName, 350);
  const debouncedAmount = useDebounce(amount, 500);

  // Search Query for Wallet
  const [searchQuery, setSearchQuery] = useState('');
  
    const [explainCardId, setExplainCardId] = useState<string | null>(null);

  // Accordion state
  
  // Fetch recommendations
  useEffect(() => {
    const hasValidMerchant = debouncedMerchant && debouncedMerchant.length >= 3;
    const hasValidAmount = Number(debouncedAmount) > 0;

    if (visible && FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (hasValidMerchant || hasValidAmount)) {
      // Default to 1000 if amount is empty to satisfy backend requirements
      const fetchAmount = hasValidAmount ? Number(debouncedAmount) : 1000;
      const fetchMerchant = hasValidMerchant ? debouncedMerchant : 'Unknown Merchant';
      
      getRecommendation.mutate({
        merchant_name: fetchMerchant,
        amount: fetchAmount,
        payment_mode: (paymentMode || 'ONLINE').toLowerCase() as any,
        intent: intentValue,
      }, {
        onSuccess: (res) => {
          const heroCardName = res.all_ranked_cards?.[0]?.card_name;
          if (heroCardName) {
            const bestCardInWallet = cardsData?.find(c => c.card_details?.card_name === heroCardName || c.nickname === heroCardName);
            if (bestCardInWallet) {
              setValue('user_card_id', bestCardInWallet.id);
            }
          }
        }
      });
    } else if (visible && !hasValidMerchant && !hasValidAmount && getRecommendation.data) {
      // Clear recommendations if both are empty
      getRecommendation.reset();
    }
  }, [debouncedMerchant, debouncedAmount, paymentMode, intentValue, visible]);

  // Track if we've initialized the form for this open session
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHasInitialized(false);
      return;
    }
    
    // Only initialize once per open session to avoid wiping user input
    if (hasInitialized) return;
    
    // Wait until we have the basic data needed to initialize
    if (!initialData && !cardsData?.length) return;

    if (initialData) {
      reset({
        merchant_name: initialData.merchant_name,
        amount: initialData.amount,
        user_card_id: initialData.user_card_id,
        payment_mode: initialData.payment_mode || 'ONLINE',
        intent: 'BALANCED',
      });
      setSearchQuery('');
      setHasInitialized(true);
    } else {
      reset({
        merchant_name: '',
        amount: undefined,
        user_card_id: cardsData![0].id,
        payment_mode: 'ONLINE',
        intent: mapPersonalityToIntent(personalityProfile?.active_personality),
      });
      setSearchQuery('');
      setHasInitialized(true);
    }
  }, [visible, initialData, cardsData, reset, personalityProfile, hasInitialized]);

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
          recommended_card_id: recommendedCardId,
        });
      }
      triggerHaptic('success');
      onClose();
    } catch {
      triggerHaptic('error');
    }
  };

  // --- Hybrid Picker Logic ---
  const rankedCards = getRecommendation.data?.all_ranked_cards || [];
  // Find Unique Winners across objectives
  const winningWalletCards = useMemo(() => {
    const res = getRecommendation.data;
    if (!res) return [];
    
    const winners = new Map<string, any>();
    
    // The Hero is always the top ranked card for the selected intent
    const heroCard = res.all_ranked_cards?.[0];
    if (heroCard) {
      winners.set(heroCard.card_id, heroCard);
    }
    
    // Add alternatives based on other categories, to show tradeoffs
    if (res.best_cashback_card && !winners.has(res.best_cashback_card.card_id)) {
      winners.set(res.best_cashback_card.card_id, res.best_cashback_card);
    }
    
    if (res.best_fee_waiver_card && !winners.has(res.best_fee_waiver_card.card_id) && res.best_fee_waiver_card.fee_waiver_progress_impact > 0) {
      winners.set(res.best_fee_waiver_card.card_id, res.best_fee_waiver_card);
    }
    
    if (res.best_balanced_card && !winners.has(res.best_balanced_card.card_id)) {
      winners.set(res.best_balanced_card.card_id, res.best_balanced_card);
    }
    
    // Fallback: just add the next best cards if we don't have enough alternatives
    if (res.all_ranked_cards) {
      for (const card of res.all_ranked_cards) {
        if (winners.size >= 3) break;
        if (!winners.has(card.card_id)) {
          winners.set(card.card_id, card);
        }
      }
    }
    
    return Array.from(winners.values()).map(rc => ({
      card: cardsData?.find(c => c.card_details?.card_name === rc.card_name || c.nickname === rc.card_name),
      recommendation: rc
    })).filter(r => r.card) as { card: NonNullable<typeof cardsData>[0], recommendation: typeof res.all_ranked_cards[0] }[];
  }, [getRecommendation.data, cardsData]);
  
  const recommendedCardId = winningWalletCards[0]?.card?.id;
  const isOverride = !isEditing && recommendedCardId && selectedCardId && selectedCardId !== recommendedCardId;

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

  const { groupedActive, inactiveCards } = useMemo(() => {
    const grouped: Record<string, typeof filteredCards> = {};
    const inactive: typeof filteredCards = [];
    
    filteredCards.forEach(card => {
      if (card.card_status === 'ACTIVE') {
        const bank = card.card_details?.bank_name || 'Other';
        if (!grouped[bank]) grouped[bank] = [];
        grouped[bank].push(card);
      } else {
        inactive.push(card);
      }
    });
    
    return { groupedActive: grouped, inactiveCards: inactive };
  }, [filteredCards]);

  return (
    <>
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
                          onPress={() => {
                            triggerHaptic('selection');
                            onChange(mode.value);
                          }}
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

            {/* INTENT SELECTOR */}
            {FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>OPTIMIZATION INTENT</Text>
                <Controller
                  control={control}
                  name="intent"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {INTENT_OPTIONS.map((option) => {
                        const isActive = value === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => {
                              if (!option.disabled) {
                                triggerHaptic('selection');
                                onChange(option.value);
                              }
                            }}
                            activeOpacity={0.7}
                            disabled={option.disabled}
                            style={[
                              styles.segmentBtn,
                              { paddingHorizontal: 16, backgroundColor: colors.background, borderColor: colors.border },
                              isActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: 1 },
                              option.disabled && { opacity: 0.4 }
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={[
                                styles.segmentText,
                                { 
                                  color: isActive ? colors.primary : colors.textMuted,
                                  fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium
                                }
                              ]}>
                                {option.label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                />
              </View>
            )}

            {/* SECTION 1: SMART RECOMMENDED CARDS */}
            {FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (
              <View style={styles.recommendationSection}>
                <View style={styles.recommendationHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.success }]}>✨ SMARTEST FINANCIAL CHOICE</Text>
                </View>

                {(!debouncedMerchant || debouncedMerchant.length < 3) && (!debouncedAmount || Number(debouncedAmount) <= 0) && !getRecommendation.isPending && winningWalletCards.length === 0 && (
                  <Animated.View entering={FadeIn} style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                      Enter an amount or merchant to get smart recommendations
                    </Text>
                  </Animated.View>
                )}

                {getRecommendation.isPending && ((debouncedMerchant && debouncedMerchant.length >= 3) || (debouncedAmount && Number(debouncedAmount) > 0)) && (
                  <Animated.View entering={FadeIn} style={[styles.thinkingState, { backgroundColor: colors.surface }]}>
                    {/* @ts-ignore */}
                    <Sparkles size={16} color={colors.primary} style={styles.pulseIcon} />
                    <Text style={[styles.thinkingStateText, { color: colors.textPrimary }]}>
                      Analyzing your portfolio...
                    </Text>
                  </Animated.View>
                )}

                {!getRecommendation.isPending && winningWalletCards.length > 0 && (
                  <Animated.View entering={FadeInUp.springify().damping(20).stiffness(150)}>
                    {/* HERO RECOMMENDATION */}
                    <HeroRecommendationCard
                      card={winningWalletCards[0].card}
                      recommendation={winningWalletCards[0].recommendation}
                      onSelect={() => {
                        triggerHaptic('selection');
                        setValue('user_card_id', winningWalletCards[0].card.id);
                      }}
                      onInfoPress={() => setExplainCardId(winningWalletCards[0].card.id)}
                      merchantName={debouncedMerchant}
                      amount={Number(debouncedAmount) || 1000}
                      calculationId={getRecommendation.data?.calculation_id}
                    />

                    {/* ALTERNATIVE STRATEGIES (HORIZONTAL) */}
                    {winningWalletCards.length > 1 && (
                      <View style={styles.alternativesWrap}>
                        <Text style={[styles.alternativesTitle, { color: colors.textMuted }]}>
                          OTHER STRATEGIC OPTIONS
                        </Text>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.alternativesScrollContent}
                        >
                          <Animated.View style={styles.alternativesInnerRow} entering={FadeInUp.springify().damping(20).stiffness(150)}>
                            {winningWalletCards.slice(1).map(({ card, recommendation }) => (
                              <SecondaryRecommendationCard
                                key={card.id}
                                card={card}
                                recommendation={recommendation}
                                isActive={selectedCardId === card.id}
                                onPress={() => {
                                  triggerHaptic('selection');
                                  setValue('user_card_id', card.id);
                                }}
                                onInfoPress={() => setExplainCardId(card.id)}
                              />
                            ))}
                          </Animated.View>
                        </ScrollView>
                      </View>
                    )}

                    {/* AI DISCLAIMER */}
                    <View style={styles.aiDisclaimerWrap}>
                      {/* @ts-ignore */}
                      <Info size={12} color={colors.textMuted} />
                      <Text style={[styles.aiDisclaimerText, { color: colors.textMuted }]}>
                        AI-generated recommendation. Verify final rewards and fees with your bank.
                      </Text>
                    </View>
                  </Animated.View>
                )}
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
                {Object.entries(groupedActive).map(([bank, cards]) => (
                  <View key={bank} style={styles.bankGroup}>
                    <Text style={[styles.bankGroupTitle, { color: colors.textMuted }]}>{bank}</Text>
                    {cards.map(card => {
                      const recommendation = rankedCards.find(rc => rc.card_name === card.card_details?.card_name || rc.card_name === card.nickname);
                      return (
                        <WalletListRow
                          key={card.id}
                          card={card}
                          isActive={selectedCardId === card.id}
                          onPress={(id) => {
                            triggerHaptic('selection');
                            setValue('user_card_id', id);
                          }}
                          recommendation={recommendation}
                        />
                      );
                    })}
                  </View>
                ))}
                
                {inactiveCards.length > 0 && (
                  <View style={styles.bankGroup}>
                    <Text style={[styles.bankGroupTitle, { color: colors.textMuted, marginTop: 8 }]}>UNAVAILABLE CARDS</Text>
                    {inactiveCards.map(card => (
                      <WalletListRow
                        key={card.id}
                        card={card}
                        isActive={selectedCardId === card.id}
                        onPress={() => {
                          console.log('This card is inactive and unavailable for recommendations.');
                        }}
                      />
                    ))}
                  </View>
                )}

                {Object.keys(groupedActive).length === 0 && inactiveCards.length === 0 && (
                  <Text style={[styles.emptySearch, { color: colors.textMuted }]}>No cards found.</Text>
                )}
              </View>
            </View>

            {/* OVERRIDE REASON UX */}
            {isOverride && (
              <Animated.View entering={FadeInUp.springify()} exiting={FadeOut} style={styles.overrideSection}>
                <Text style={[styles.overrideTitle, { color: colors.textMuted }]}>Optional context for this selection</Text>
                <Controller
                  control={control}
                  name="override_reason"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.overrideChipWrap}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overrideScroll}>
                        {OVERRIDE_REASONS.map(reason => {
                          const isActive = value === reason.value;
                          return (
                            <TouchableOpacity
                              key={reason.value}
                              onPress={() => onChange(isActive ? undefined : reason.value)}
                              style={[
                                styles.overrideChip,
                                { backgroundColor: isActive ? colors.surfaceElevated : colors.background },
                                isActive && { borderColor: colors.primary, borderWidth: 1 }
                              ]}
                            >
                              <Text style={[styles.overrideChipText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                                {reason.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                />
              </Animated.View>
            )}
          </ScrollView>

          {/* STICKY CTA */}
          <View style={[styles.stickyCtaWrap, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder, paddingBottom: Math.max(insets.bottom, 24) }]}>
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
                  {isSubmitting || addTx.isPending || updateTx.isPending 
                    ? 'Processing...' 
                    : (isEditing 
                        ? 'Save Changes' 
                        : (selectedCardId 
                            ? `Use ${cardsData?.find(c => c.id === selectedCardId)?.nickname || cardsData?.find(c => c.id === selectedCardId)?.card_details?.card_name || 'Card'}`
                            : 'Add Transaction'
                          )
                      )
                  }
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </View>
      </Modal>

      <RecommendationExplainabilitySheet
        visible={!!explainCardId}
        onClose={() => setExplainCardId(null)}
        item={explainCardId ? winningWalletCards.find(c => c.card.id === explainCardId) || null : null}
      />
    </>
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
  aiDisclaimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  aiDisclaimerText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  stickyCtaWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaGradient: {
    borderRadius: tokens.radius.full,
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
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
    fontStyle: 'italic',
  },
  thinkingState: {
    paddingVertical: 32,
    alignItems: 'center',
    borderRadius: tokens.radius.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  thinkingStateText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  pulseIcon: {
    opacity: 0.8,
  },
  alternativesWrap: {
    marginTop: 20,
  },
  alternativesTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
  },
  alternativesScrollContent: {
    paddingBottom: 8,
  },
  alternativesInnerRow: {
    flexDirection: 'row',
  },
  overrideSection: {
    marginBottom: 24,
    marginTop: -8,
  },
  overrideTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 8,
    marginLeft: 2,
  },
  overrideChipWrap: {
    marginHorizontal: -24,
  },
  overrideScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  overrideChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  overrideChipText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
});
