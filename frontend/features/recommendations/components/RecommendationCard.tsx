import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RankedCardResponse } from '../types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { Card } from '../../../components/ui/Card';
import { tokens } from '../../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface RecommendationCardProps {
  card: RankedCardResponse;
  index: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ card, index }) => {
  const isTopRank = card.rank === 1;
  const colors = useThemeColors();
  const delay = 200 + index * 100;

  if (isTopRank) {
    return (
      <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.topRankWrap}>
        <Card variant="elevated" padded={false} style={styles.topCard}>
          {/* Header */}
          <LinearGradient
            colors={[colors.successSoft, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.topCardHeader}
          >
            <View style={styles.topCardHeaderInner}>
              <Text style={[styles.topCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {card.card_name}
              </Text>
              <View style={[styles.rankBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.rankBadgeText}>Rank 1</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Value Area */}
          <View style={styles.valueArea}>
            <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
              Maximum Value Found
            </Text>
            <Text style={[styles.heroValue, { color: colors.success }]}>
              ₹{card.effective_reward_value}
            </Text>
            <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
              {card.recommendation_reason}
            </Text>
            <View style={[styles.rewardTypePill, { borderColor: colors.borderHighlight }]}>
              <Text style={[styles.rewardTypeText, { color: colors.textSecondary }]}>
                Earned via {card.reward_type}
              </Text>
            </View>
          </View>

          {/* Warnings */}
          {card.warnings.length > 0 && (
            <View style={[styles.warningArea, { backgroundColor: colors.warningSoft, borderTopColor: colors.borderHighlight }]}>
              {/* @ts-ignore */}
              <AlertCircle size={18} color={colors.warning} style={styles.warningIcon} />
              <View style={styles.warningTextWrap}>
                {card.warnings.map((warning, i) => (
                  <Text key={i} style={[styles.warningText, { color: colors.warning }]}>
                    {warning}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.subRankWrap}>
      <Card variant="solid" accentColor={colors.borderHighlight} style={styles.subCard}>
        <View style={styles.subCardLeft}>
          <Text style={[styles.subCardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {card.card_name}
          </Text>
          <Text style={[styles.subCardReason, { color: colors.textSecondary }]} numberOfLines={2}>
            {card.recommendation_reason}
          </Text>
        </View>
        <View style={[styles.subCardRight, { borderLeftColor: colors.border }]}>
          <Text style={[styles.subCardValue, { color: colors.textPrimary }]}>
            ₹{card.effective_reward_value}
          </Text>
          <Text style={[styles.subCardRankLabel, { color: colors.textMuted }]}>
            RANK {card.rank}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  topRankWrap: { marginBottom: 24 },
  topCard: { overflow: 'hidden' },
  topCardHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topCardHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  topCardName: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    flex: 1,
    marginRight: 16,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueArea: {
    padding: 24,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    marginBottom: 16,
  },
  reasonText: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.5,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  rewardTypePill: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
  },
  rewardTypeText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  warningArea: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  warningIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningText: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.4,
    marginBottom: 4,
  },
  subRankWrap: {
    marginBottom: 12,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  subCardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  subCardName: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  subCardReason: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.4,
  },
  subCardRight: {
    alignItems: 'flex-end',
    paddingLeft: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  subCardValue: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  subCardRankLabel: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
