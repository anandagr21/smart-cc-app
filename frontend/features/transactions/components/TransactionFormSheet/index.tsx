import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LinearGradient } from 'expo-linear-gradient';

import { TransactionResponse } from '../../types/transaction.types';
import { apiClient } from '@/services/api/client';
import { useCards } from '@/features/cards/hooks/useCards';
import { useCreateTransaction } from '../../hooks/useTransactions';
import { useUpdateTransaction } from '../../hooks/useUpdateTransaction';
import { useRecommendation } from '@/features/recommendations/hooks/useRecommendation';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useDebounce } from '@/hooks/useDebounce';
import { useFuseSearch } from '@/shared/search/useFuseSearch';
import { usePersonalityProfile, OptimizationPersonality } from '@/features/personality/api/personalityApi';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { FeatureFlags } from '@/config/features';
import { DynamicIcon } from '@/components/DynamicIcon';

import { SearchSection } from './SearchSection';
import { RecommendationBanner } from './RecommendationBanner';
import { CardSelector } from './CardSelector';
import { OverrideReasonSelector } from './OverrideReasonSelector';
import { RecommendationExplainabilitySheet } from '../RecommendationExplainabilitySheet';

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

const PAYMENT_MODE_LOWER: Record<string, string> = {
  ONLINE: 'online', OFFLINE: 'offline', INTERNATIONAL: 'international',
};

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
  onSuccess?: () => void;
  initialData?: TransactionResponse | { merchant_name: string; amount: number } | null;
}

export const TransactionFormSheet: React.FC<TransactionFormSheetProps> = ({
  visible,
  onClose,
  onSuccess,
  initialData,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const idempotencyKey = useRef(Crypto.randomUUID());

  const { data: cardsData } = useCards();
  const { data: personalityProfile } = usePersonalityProfile();
  const onboardingPersona = useOnboardingStore((s) => s.persona);
  const addTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const getRecommendation = useRecommendation();

  // Default intent: onboarding persona > personality profile > balanced
  const defaultIntent = onboardingPersona ||
    mapPersonalityToIntent(personalityProfile?.active_personality) ||
    'BALANCED';

  const isEditing = !!initialData;

  const methods = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: { merchant_name: '', user_card_id: '', payment_mode: 'ONLINE', intent: defaultIntent },
  });

  const { watch, reset, setValue, handleSubmit, formState: { isSubmitting } } = methods;

  const merchantName = watch('merchant_name');
  const amount = watch('amount');
  const paymentMode = watch('payment_mode');
  const selectedCardId = watch('user_card_id');
  const intentValue = watch('intent');

  const debouncedMerchant = useDebounce(merchantName, 350);
  const debouncedAmount = useDebounce(amount, 500);

  const [searchQuery, setSearchQuery] = useState('');
  const [explainCardId, setExplainCardId] = useState<string | null>(null);

  const [resolvedMerchantName, setResolvedMerchantName] = useState<string | null>(null);
  const [resolutionConfidence, setResolutionConfidence] = useState<number | null>(null);

  const [isUndoDisabled, setIsUndoDisabled] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    const hasValidMerchant = debouncedMerchant && debouncedMerchant.length >= 3;
    const hasValidAmount = Number(debouncedAmount) > 0;

    if (visible && FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (hasValidMerchant || hasValidAmount)) {
      const fetchAmount = hasValidAmount ? Number(debouncedAmount) : 1000;
      const fetchMerchant = hasValidMerchant ? debouncedMerchant : 'Unknown Merchant';
      
      getRecommendation.mutate({
        merchant_name: fetchMerchant,
        amount: fetchAmount,
        payment_mode: PAYMENT_MODE_LOWER[paymentMode || 'ONLINE'],
        intent: intentValue,
        skip_resolution: isUndoDisabled,
      }, {
        onSuccess: (res) => {
          const heroCardName = res.all_ranked_cards?.[0]?.card_name;
          if (heroCardName) {
            const bestCardInWallet = cardsData?.find(c => c.card_details?.card_name === heroCardName || c.nickname === heroCardName);
            if (bestCardInWallet) {
              setValue('user_card_id', bestCardInWallet.id);
            }
          }
          
          if (
            hasValidMerchant &&
            !isUndoDisabled &&
            res.resolved_merchant_name &&
            res.resolution_confidence &&
            res.resolution_confidence >= 0.85 &&
            res.resolved_merchant_name.toLowerCase() !== fetchMerchant.toLowerCase()
          ) {
            setResolvedMerchantName(res.resolved_merchant_name);
            setResolutionConfidence(res.resolution_confidence);
            setShowCorrection(true);
            
            apiClient.post('/search/events', {
              event_type: 'merchant_corrected',
              payload: { 
                calculation_id: res.calculation_id,
                raw_input: fetchMerchant,
                resolved_merchant: res.resolved_merchant_name,
                confidence: res.resolution_confidence
              }
            }).catch(console.error);
          } else {
            setShowCorrection(false);
            setResolvedMerchantName(null);
          }
        }
      });
    } else if (visible && !hasValidMerchant && !hasValidAmount && getRecommendation.data) {
      getRecommendation.reset();
    }
  }, [debouncedMerchant, debouncedAmount, paymentMode, intentValue, visible, isUndoDisabled]);

  const handleUndoCorrection = () => {
    setIsUndoDisabled(true);
    setShowCorrection(false);
    setResolvedMerchantName(null);
    
    apiClient.post('/search/events', {
      event_type: 'merchant_correction_undone',
      payload: { 
        calculation_id: getRecommendation.data?.calculation_id,
        raw_input: merchantName,
        resolved_merchant: resolvedMerchantName
      }
    }).catch(console.error);
    
    triggerHaptic('selection');
  };

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHasInitialized(false);
      setShowCorrection(false);
      setResolvedMerchantName(null);
      setResolutionConfidence(null);
      setIsUndoDisabled(false);
      getRecommendation.reset();
      reset({
        merchant_name: '',
        amount: undefined,
        user_card_id: cardsData?.[0]?.id || '',
        payment_mode: 'ONLINE',
        intent: mapPersonalityToIntent(personalityProfile?.active_personality),
      });
      return;
    }
    
    if (hasInitialized) return;
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
      const finalMerchantName = (showCorrection && resolvedMerchantName) ? resolvedMerchantName : data.merchant_name;
      
      if (showCorrection && resolvedMerchantName) {
        apiClient.post('/search/events', {
          event_type: 'merchant_correction_accepted',
          payload: { 
            calculation_id: getRecommendation.data?.calculation_id,
            raw_input: data.merchant_name,
            resolved_merchant: resolvedMerchantName
          }
        }).catch(console.error);
      }

      if (isEditing) {
        await updateTx.mutateAsync({
          id: initialData.id,
          data: {
            merchant_name: finalMerchantName,
            amount: data.amount,
            user_card_id: data.user_card_id,
            payment_mode: PAYMENT_MODE_LOWER[data.payment_mode],
          },
        });
      } else {
        await addTx.mutateAsync({
          data: {
            ...data,
            merchant_name: finalMerchantName,
            payment_mode: PAYMENT_MODE_LOWER[data.payment_mode],
            transaction_date: new Date().toISOString().split('T')[0],
            recommended_card_id: recommendedCardId,
          },
          idempotencyKey: idempotencyKey.current,
        });
        idempotencyKey.current = Crypto.randomUUID();
      }
      triggerHaptic('success');
      onSuccess?.();
      onClose();
    } catch {
      triggerHaptic('error');
    }
  };

  const rankedCards = getRecommendation.data?.all_ranked_cards || [];
  const winningWalletCards = useMemo(() => {
    const res = getRecommendation.data;
    if (!res) return [];
    
    const winners = new Map<string, any>();
    const heroCard = res.all_ranked_cards?.[0];
    if (heroCard) winners.set(heroCard.card_id, heroCard);
    
    if (res.best_cashback_card && !winners.has(res.best_cashback_card.card_id)) winners.set(res.best_cashback_card.card_id, res.best_cashback_card);
    if (res.best_fee_waiver_card && !winners.has(res.best_fee_waiver_card.card_id) && res.best_fee_waiver_card.fee_waiver_progress_impact > 0) winners.set(res.best_fee_waiver_card.card_id, res.best_fee_waiver_card);
    if (res.best_balanced_card && !winners.has(res.best_balanced_card.card_id)) winners.set(res.best_balanced_card.card_id, res.best_balanced_card);
    
    if (res.all_ranked_cards) {
      for (const card of res.all_ranked_cards) {
        if (winners.size >= 3) break;
        if (!winners.has(card.card_id)) winners.set(card.card_id, card);
      }
    }
    
    return Array.from(winners.values()).map(rc => ({
      card: cardsData?.find(c => c.card_details?.card_name === rc.card_name || c.nickname === rc.card_name),
      recommendation: rc
    })).filter(r => r.card) as { card: NonNullable<typeof cardsData>[0], recommendation: typeof res.all_ranked_cards[0] }[];
  }, [getRecommendation.data, cardsData]);
  
  const recommendedCardId = winningWalletCards[0]?.card?.id;
  const isOverride = !isEditing && !!recommendedCardId && !!selectedCardId && selectedCardId !== recommendedCardId;

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
        <FormProvider {...methods}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
                  {isEditing ? 'Edit Transaction' : 'New Transaction'}
                </Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
                  <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <SearchSection
                  showCorrection={showCorrection}
                  resolvedMerchantName={resolvedMerchantName}
                  resolutionConfidence={resolutionConfidence}
                  onUndoCorrection={handleUndoCorrection}
                  triggerHaptic={triggerHaptic}
                />

                <RecommendationBanner
                  debouncedMerchant={debouncedMerchant}
                  debouncedAmount={Number(debouncedAmount)}
                  isPending={getRecommendation.isPending}
                  winningWalletCards={winningWalletCards}
                  selectedCardId={selectedCardId}
                  onExplainPress={setExplainCardId}
                  triggerHaptic={triggerHaptic}
                  calculationId={getRecommendation.data?.calculation_id}
                />

                <CardSelector
                  groupedActive={groupedActive}
                  inactiveCards={inactiveCards}
                  rankedCards={rankedCards}
                  selectedCardId={selectedCardId}
                  triggerHaptic={triggerHaptic}
                />
              </ScrollView>

              <View style={[styles.stickyCtaWrap, { backgroundColor: colors.glassSurface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 24) }]}>
                <OverrideReasonSelector isVisible={isOverride} triggerHaptic={triggerHaptic} />
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']} // Primary Purple
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
                    {!(isSubmitting || addTx.isPending || updateTx.isPending) && (
                      <DynamicIcon name="CheckCircle2" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </View>
        </FormProvider>
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
    paddingBottom: 0,
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  stickyCtaWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaGradient: {
    borderRadius: tokens.radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaInner: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
