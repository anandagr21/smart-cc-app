import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useFormContext } from 'react-hook-form';

import { DynamicIcon } from '@/components/DynamicIcon';
import { HeroRecommendationCard } from '../HeroRecommendationCard';
import { SecondaryRecommendationCard } from '../SecondaryRecommendationCard';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { FeatureFlags } from '@/config/features';

interface RecommendationBannerProps {
  debouncedMerchant: string;
  debouncedAmount: number;
  isPending: boolean;
  winningWalletCards: Array<{
    card: any;
    recommendation: any;
  }>;
  selectedCardId: string;
  onExplainPress: (id: string) => void;
  triggerHaptic: (type: 'selection') => void;
  calculationId?: string;
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  debouncedMerchant,
  debouncedAmount,
  isPending,
  winningWalletCards,
  selectedCardId,
  onExplainPress,
  triggerHaptic,
  calculationId
}) => {
  const colors = useThemeColors();
  const { setValue } = useFormContext<any>();

  if (!FeatureFlags.ENABLE_SMART_RECOMMENDATIONS) return null;

  const hasValidInput = (debouncedMerchant && debouncedMerchant.length >= 3) || (debouncedAmount && debouncedAmount > 0);

  return (
    <View style={styles.recommendationSection}>
      <View style={styles.recommendationHeader}>
        <Text style={[styles.sectionTitle, { color: colors.success }]}>✨ SMARTEST FINANCIAL CHOICE</Text>
      </View>

      {!hasValidInput && !isPending && winningWalletCards.length === 0 && (
        <Animated.View entering={FadeIn} style={[styles.emptyState, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <DynamicIcon name="Sparkles" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
            Ready to Optimize
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            Enter an amount or merchant above to discover the best card to use.
          </Text>
        </Animated.View>
      )}

      {isPending && hasValidInput && (
        <Animated.View entering={FadeIn} style={[styles.thinkingState, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border, borderWidth: 1 }]}>
          <DynamicIcon name="Sparkles" size={28} color={colors.primary} style={styles.pulseIcon} />
          <Text style={[styles.thinkingStateText, { color: colors.textPrimary }]}>
            Calculating best rewards...
          </Text>
        </Animated.View>
      )}

      {!isPending && winningWalletCards.length > 0 && (
        <Animated.View entering={FadeInUp.springify().damping(20).stiffness(150)}>
          <Animated.View entering={ZoomIn.duration(400).springify()}>
            <HeroRecommendationCard
              card={winningWalletCards[0].card}
              recommendation={winningWalletCards[0].recommendation}
              onSelect={() => {
                triggerHaptic('selection');
                setValue('user_card_id', winningWalletCards[0].card.id);
              }}
              onInfoPress={() => onExplainPress(winningWalletCards[0].card.id)}
              merchantName={debouncedMerchant}
              amount={Number(debouncedAmount) || 1000}
              calculationId={calculationId}
            />
          </Animated.View>

          {winningWalletCards.length > 1 && (
            <View style={styles.alternativesWrap}>
              <Text style={[styles.alternativesTitle, { color: colors.textMuted }]}>
                OTHER STRATEGIC OPTIONS
              </Text>
              
              <View>
                {winningWalletCards.slice(1).map(({ card, recommendation }, idx) => (
                  <View key={card.id}>
                    <SecondaryRecommendationCard
                      card={card}
                      recommendation={recommendation}
                      isActive={selectedCardId === card.id}
                      onPress={() => {
                        triggerHaptic('selection');
                        setValue('user_card_id', card.id);
                      }}
                      onInfoPress={() => onExplainPress(card.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.aiDisclaimerWrap}>
            <DynamicIcon name="Info" size={12} color={colors.textMuted} />
            <Text style={[styles.aiDisclaimerText, { color: colors.textMuted }]}>
              AI-generated recommendation. Verify final rewards and fees with your bank.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  thinkingState: {
    paddingVertical: 32,
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
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
    marginLeft: 2,
  },
  iosGroupedList: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
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
});
