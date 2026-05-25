import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { UserCardResponse } from '../../cards/types/api';
import { RankedCardResponse } from '../../recommendations/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { tokens } from '../../../theme/tokens';
import { formatCurrencyIN } from '../../../utils/currency';

interface RecommendationExplainabilitySheetProps {
  visible: boolean;
  onClose: () => void;
  recommendedCards: { card: UserCardResponse; recommendation: RankedCardResponse }[];
}

export const RecommendationExplainabilitySheet: React.FC<RecommendationExplainabilitySheetProps> = ({
  visible,
  onClose,
  recommendedCards,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  if (!visible || recommendedCards.length === 0) return null;

  const top = recommendedCards[0];
  const runnerUps = recommendedCards.slice(1);
  const topCardName = top.card.nickname || top.card.card_details?.card_name || 'Card';
  
  const getTopEstimatedReward = () => {
    return top.recommendation.cashback_amount || top.recommendation.reward_points || top.recommendation.effective_reward_value;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={95}
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
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Animated.View entering={FadeInUp.duration(400)}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Why {topCardName} is best</Text>
              
              <View style={[styles.cardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
                {/* @ts-ignore */}
                <Sparkles size={16} color={colors.primary} style={{ marginBottom: 12 }} />
                
                {/* Reason 1 */}
                <View style={styles.reasonRow}>
                  {/* @ts-ignore */}
                  <CheckCircle2 size={16} color={colors.success} style={styles.reasonIcon} />
                  <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
                    {top.recommendation.recommendation_reason || 'Highest effective reward for this transaction'}
                  </Text>
                </View>

                {/* Deltas vs Runner Ups */}
                {runnerUps.map((runner, idx) => {
                  const runnerReward = runner.recommendation.cashback_amount || runner.recommendation.reward_points || runner.recommendation.effective_reward_value;
                  const delta = getTopEstimatedReward() - runnerReward;
                  const runnerName = runner.card.nickname || runner.card.card_details?.card_name || 'Card';
                  
                  if (delta > 0) {
                    return (
                      <View key={idx} style={styles.reasonRow}>
                        {/* @ts-ignore */}
                        <TrendingUp size={16} color={colors.success} style={styles.reasonIcon} />
                        <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
                          Better return than {runnerName} by {formatCurrencyIN(delta)}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })}

                <LinearGradient
                  colors={['rgba(16,185,129,0.1)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MATHEMATICAL BREAKDOWN</Text>
              
              {recommendedCards.map((item, idx) => {
                const name = item.card.nickname || item.card.card_details?.card_name || 'Card';
                const reward = item.recommendation.cashback_amount || item.recommendation.reward_points || item.recommendation.effective_reward_value;
                return (
                  <View key={idx} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.breakdownValue, { color: idx === 0 ? colors.primary : colors.textPrimary }]}>
                      {formatCurrencyIN(reward)}
                    </Text>
                  </View>
                );
              })}

            </Animated.View>
            <View style={{ height: 40 }} />
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
    height: '60%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerSpacer: { width: 36 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 24,
  },
  cardBox: {
    padding: 20,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    marginBottom: 32,
    overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reasonIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  breakdownName: {
    fontSize: tokens.fontSize.body,
    flex: 1,
    paddingRight: 16,
  },
  breakdownValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
