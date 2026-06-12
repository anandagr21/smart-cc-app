import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Info, MessageSquareWarning } from 'lucide-react-native';
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
        <LinearGradient
          colors={[colors.surface, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.cardBackground, { borderColor: colors.border, borderWidth: 1 }]}
        >
          {/* Top highlight line */}
          <View style={[styles.topEdge, { backgroundColor: colors.glassHighlight }]} />

          {/* EDITORIAL TAG ROW */}
          <View style={styles.editorialRow}>
            <View style={[styles.strategyTagWrap, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }]}>
              <Text style={[styles.strategyTagText, { color: colors.primary }]}>
                {recommendation.confidence_label?.toUpperCase() || 'OPTIMAL'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }} onPress={() => setIsFeedbackVisible(true)}>
                {/* @ts-ignore */}
                <MessageSquareWarning size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }} onPress={onInfoPress}>
                {/* @ts-ignore */}
                <Info size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD IDENTITY */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.bankName, { color: colors.textSecondary }]}>{bankName.toUpperCase()}</Text>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{cardName}</Text>
            </View>
            {!!displayNetwork && (
              <View style={[styles.miniArtWrap, { borderColor: colors.borderHighlight }]}>
                <LinearGradient colors={gradient} style={styles.miniArt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.miniArtNetwork}>{displayNetwork}</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* CONCISE RATIONALE */}
          <View style={styles.rationaleWrap}>
            <Text style={[styles.rationaleText, { color: colors.textPrimary }]}>
              {recommendation.explanation || 'Optimal choice for this transaction.'}
            </Text>
          </View>

          {/* FINANCIAL IMPACT */}
          <View style={[styles.financialsRow, { borderColor: colors.borderHighlight }]}>
            <View style={styles.financialItemRight}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.financialTotalAmount, { color: colors.success }]}>
                  {formatCurrencyIN(recommendation.immediate_reward_value)}
                </Text>
                {recommendation.fee_waiver_progress_impact > 0 && (
                  <Text style={[styles.financialTotalAmount, { fontSize: tokens.fontSize.body, marginLeft: 6, color: colors.success }]}>
                    + {formatCurrencyIN(recommendation.fee_waiver_progress_impact)} saved
                  </Text>
                )}
              </View>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>TOTAL REWARD</Text>
            </View>
          </View>

        </LinearGradient>
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
    marginBottom: 0,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
  },
  touchable: {
    borderRadius: tokens.radius.xl,
  },
  cardBackground: {
    padding: 24,
    borderRadius: tokens.radius.xl,
  },
  topEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  editorialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  strategyTagWrap: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  strategyTagText: {
    color: '#A78BFA',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  bankName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 4,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.heroSm,
    fontWeight: tokens.fontWeight.heavy,
  },
  miniArtWrap: {
    width: 52,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  miniArt: {
    flex: 1,
    padding: 4,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  miniArtNetwork: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 7,
    fontWeight: tokens.fontWeight.heavy,
  },
  rationaleWrap: {
    marginBottom: 24,
  },
  rationaleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 22,
  },
  financialsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  financialItemRight: {
    flex: 1,
  },
  financialTotalAmount: {
    color: '#10B981',
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 4,
  },
  financialLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
  },
});
