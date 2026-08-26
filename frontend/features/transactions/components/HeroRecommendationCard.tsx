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
  const bankName = card.card_details?.bank_name || '';

  const network = card.network_override || card.card_details?.network || 'default';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' || network === 'default' ? '' : network.toUpperCase();
  const gradient = getNetworkGradient(network, isDark) as [string, string];

  // Build "Why this card?" bullets from engine explanations or fallback
  const bullets: string[] = (() => {
    if (recommendation.engine_explanations && recommendation.engine_explanations.length > 0) {
      return recommendation.engine_explanations.slice(0, 3).map((e: any) =>
        typeof e === 'string' ? e : e.reason || e.label || String(e)
      );
    }
    const items = [];
    if (recommendation.explanation) items.push(recommendation.explanation);
    if (recommendation.confidence_label) items.push(`${recommendation.confidence_label} confidence`);
    if (recommendation.fee_waiver_progress_impact > 0) {
      items.push(`+${formatCurrencyIN(recommendation.fee_waiver_progress_impact)} toward fee waiver`);
    }
    return items.slice(0, 3);
  })();

  // Reward type label
  const rewardTypeLabel = 'Cashback';

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Recommended Card header */}
      <View style={styles.headerBadgeRow}>
        <Text style={styles.trophyEmoji}>🏆</Text>
        <Text style={[styles.headerBadgeLabel, { color: '#FBBF24' }]}>Recommended Card</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={() => setIsFeedbackVisible(true)}>
          <DynamicIcon name="MessageSquareWarning" size={15} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={onInfoPress} style={{ marginLeft: 10 }}>
          <DynamicIcon name="Info" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main card panel */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onSelect}
        style={[styles.panel, { backgroundColor: isDark ? '#1A1F3A' : '#FFFFFF', borderColor: isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)' }]}
      >
        {/* Card identity row */}
        <View style={styles.cardIdentityRow}>
          <View style={[styles.cardLogoCircle, { backgroundColor: gradient[0] + '30' }]}>
            <LinearGradient
              colors={gradient}
              style={styles.cardLogoInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.cardLogoInitial}>
                {(bankName || cardName).substring(0, 1).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.cardIdentityInfo}>
            <Text style={[styles.cardNameText, { color: colors.textPrimary }]} numberOfLines={1}>{cardName}</Text>
            <Text style={[styles.cardLastFour, { color: colors.textSecondary }]}>
              •••• {card.last_4_digits || '0000'}
            </Text>
          </View>

          {!!displayNetwork && (
            <Text style={[styles.networkLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' }]}>
              {displayNetwork}
            </Text>
          )}
        </View>

        {/* Earnings row */}
        <View style={[styles.earningsSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>You'll earn</Text>
          <View style={styles.earningsValueRow}>
            <Text style={styles.earningsValue}>
              +{formatCurrencyIN(recommendation.immediate_reward_value)}
            </Text>
            <View style={[styles.earningsTypePill, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Text style={styles.earningsTypeCoin}>🪙</Text>
              <Text style={styles.earningsTypeText}>{rewardTypeLabel}</Text>
            </View>
          </View>
        </View>

        {/* Why this card */}
        {bullets.length > 0 && (
          <View style={[styles.whySection, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.whyLabel, { color: colors.textSecondary }]}>Why this card?</Text>
            {bullets.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletCheck}>✓</Text>
                <Text style={[styles.bulletText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity activeOpacity={0.85} onPress={onSelect} style={styles.ctaBtn}>
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtnInner}
          >
            <Text style={styles.ctaBtnText}>Use This Card</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: 16,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  trophyEmoji: {
    fontSize: 15,
  },
  headerBadgeLabel: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.2,
  },
  panel: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  cardIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardLogoInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogoInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cardIdentityInfo: {
    flex: 1,
  },
  cardNameText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  cardLastFour: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: 1.5,
  },
  networkLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  earningsSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  earningsLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 6,
  },
  earningsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  earningsValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  earningsTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  earningsTypeCoin: {
    fontSize: 13,
  },
  earningsTypeText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    color: '#F59E0B',
  },
  whySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  whyLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 5,
  },
  bulletCheck: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
    lineHeight: 18,
  },
  bulletText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
    lineHeight: 18,
  },
  ctaBtn: {
    margin: 16,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 0.3,
  },
});
