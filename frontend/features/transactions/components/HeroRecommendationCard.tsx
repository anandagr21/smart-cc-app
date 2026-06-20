import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { FeedbackModal } from '@/features/feedback/components/FeedbackModal';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { getNetworkGradient } from '@/theme/colors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { formatCurrencyIN } from '@/utils/currency';
import { DynamicIcon } from '@/components/DynamicIcon';

interface HeroRecommendationCardProps {
  card: UserCardResponse;
  recommendation: OptimizerRankedCard;
  onSelect: () => void;
  onInfoPress: () => void;
  merchantName?: string;
  amount?: number;
  calculationId?: string;
}

export const HeroRecommendationCard: React.FC<HeroRecommendationCardProps> = ({
  card,
  recommendation,
  onSelect,
  onInfoPress,
  merchantName = '',
  amount = 0,
  calculationId,
}) => {
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';

  const network = card.network_override || card.card_details?.network || 'default';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' || network === 'default' ? '' : network.toUpperCase();
  const gradient = getNetworkGradient(network, isDark) as [string, string];

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <TouchableOpacity activeOpacity={0.9} onPress={onSelect} style={styles.touchable}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Left accent stripe with network gradient */}
          <View style={styles.accentStripe}>
            <LinearGradient colors={gradient} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          </View>

          {/* EDITORIAL TAG ROW */}
          <View style={styles.editorialRow}>
            <View style={[styles.strategyTag, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.strategyText, { color: colors.primary }]}>
                {recommendation.confidence_label?.toUpperCase() || 'OPTIMAL'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={() => setIsFeedbackVisible(true)}>
                <DynamicIcon name="MessageSquareWarning" size={15} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={onInfoPress}>
                <DynamicIcon name="Info" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD IDENTITY */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.bankName, { color: colors.textMuted }]}>{bankName.toUpperCase()}</Text>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{cardName}</Text>
            </View>
            {!!displayNetwork && (
              <View style={[styles.networkBadge, { borderColor: colors.border }]}>
                <LinearGradient colors={gradient} style={styles.networkBadgeInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.networkBadgeText}>{displayNetwork}</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* RATIONALE */}
          <Text style={[styles.rationale, { color: colors.textSecondary }]} numberOfLines={2}>
            {recommendation.explanation || 'Optimal choice for this transaction.'}
          </Text>

          {/* FINANCIAL IMPACT */}
          <View style={[styles.financials, { borderTopColor: colors.border }]}>
            <Text style={[styles.rewardValue, { color: colors.success }]}>
              {formatCurrencyIN(recommendation.immediate_reward_value)}
            </Text>
            {recommendation.fee_waiver_progress_impact > 0 && (
              <Text style={[styles.rewardExtra, { color: colors.primary }]}>
                + {formatCurrencyIN(recommendation.fee_waiver_progress_impact)} fee waiver
              </Text>
            )}
            <Text style={[styles.rewardLabel, { color: colors.textMuted }]}>EXPECTED REWARD</Text>
          </View>

        </View>
      </TouchableOpacity>

      <FeedbackModal
        isVisible={isFeedbackVisible}
        onClose={() => setIsFeedbackVisible(false)}
        feedbackContext={{
          merchant_name: merchantName,
          transaction_amount: amount,
          card_id: card.card_catalog_id,
          calculated_reward: recommendation.immediate_reward_value,
          rule_version: '2026.06.07',
          calculation_id: calculationId,
          calculation_context: {
            confidence_label: recommendation.confidence_label,
            engine_explanations: recommendation.engine_explanations,
          }
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  touchable: {
    borderRadius: tokens.radius.lg,
  },
  card: {
    flexDirection: 'column',
    padding: 16,
    paddingLeft: 20,
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: tokens.radius.lg,
    borderBottomLeftRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  editorialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  strategyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  strategyText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  bankName: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 2,
  },
  cardName: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
  },
  networkBadge: {
    width: 44,
    height: 28,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  networkBadgeInner: {
    flex: 1,
    padding: 3,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  networkBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 7,
    fontWeight: tokens.fontWeight.heavy,
  },
  rationale: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: 18,
    marginBottom: 10,
  },
  financials: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  rewardValue: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 1,
  },
  rewardExtra: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 4,
  },
  rewardLabel: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
  },
});
