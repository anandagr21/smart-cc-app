import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Sparkles, Info } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';
import { GlossarySheet } from './GlossarySheet';

interface RecommendationExplainabilitySheetProps {
  visible: boolean;
  onClose: () => void;
  item: { card: UserCardResponse; recommendation: OptimizerRankedCard } | null;
}

export const RecommendationExplainabilitySheet: React.FC<RecommendationExplainabilitySheetProps> = ({
  visible,
  onClose,
  item,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const [showFeeExplanation, setShowFeeExplanation] = React.useState(false);
  const [showCalcSteps, setShowCalcSteps] = React.useState(false);
  const [showGlossary, setShowGlossary] = React.useState(false);

  if (!visible || !item) return null;

  const topCardName = item.card.nickname || item.card.card_details?.card_name || 'Card';
  const humanStrategy = item.recommendation.confidence_label || 'OPTIMAL';
  const engineExplanations = item.recommendation.engine_explanations ?? [];
  const hasCalcSteps = engineExplanations.length > 0;

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

              <Text style={[styles.title, { color: colors.textPrimary }]}>Why {topCardName}?</Text>

              {/* NARRATIVE */}
              <View style={[styles.cardBox, { backgroundColor: colors.surfaceElevated, borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                {/* @ts-ignore */}
                <Sparkles size={18} color="#A78BFA" style={{ marginBottom: 16 }} />
                <Text style={[styles.strategyTitle, { color: '#A78BFA' }]}>
                  {humanStrategy.toUpperCase()}
                </Text>
                <Text style={[styles.narrativeText, { color: colors.textPrimary }]}>
                  {item.recommendation.explanation || 'This card provides the highest blended value for your selected intent.'}
                </Text>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.1)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>

              {/* VALUE BREAKDOWN */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>
                VALUE BREAKDOWN
              </Text>

              <View style={[styles.breakdownCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {/* Reward row — ⓘ toggles calculation accordion */}
                <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                      {item.recommendation.reward_type === 'points' ? 'Reward Points Value' : 'Cashback'}
                    </Text>
                    {hasCalcSteps && (
                      <TouchableOpacity
                        onPress={() => setShowCalcSteps(!showCalcSteps)}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        style={{ marginLeft: 6 }}
                      >
                        {/* @ts-ignore */}
                        <Info size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                    {formatCurrencyIN(item.recommendation.immediate_reward_value || 0)}
                  </Text>
                </View>

                {/* Calculation accordion */}
                {showCalcSteps && hasCalcSteps && (
                  <Animated.View
                    entering={FadeInUp}
                    style={[styles.expandedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    {engineExplanations.map((exp, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.calcStep,
                          idx < engineExplanations.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
                        ]}
                      >
                        <View style={[styles.calcDot, { backgroundColor: colors.primary }]}>
                          <Text style={styles.calcDotNumber}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.calcStepText, { color: colors.textSecondary }]}>{exp}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}

                {/* Fee waiver row */}
                {item.recommendation.fee_waiver_progress_impact > 0 && (
                  <>
                    <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fee Waiver Impact</Text>
                        <TouchableOpacity
                          onPress={() => setShowFeeExplanation(!showFeeExplanation)}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          style={{ marginLeft: 6 }}
                        >
                          {/* @ts-ignore */}
                          <Info size={13} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.breakdownValue, { color: '#A78BFA' }]}>
                        {formatCurrencyIN(item.recommendation.fee_waiver_progress_impact)}
                      </Text>
                    </View>

                    {showFeeExplanation && (
                      <Animated.View
                        entering={FadeInUp}
                        style={[styles.expandedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Text style={[styles.expandedText, { color: colors.textSecondary }]}>
                          The system assigns financial value to transactions that help secure your annual fee waiver.
                        </Text>
                        <View style={styles.expandedRow}>
                          <TouchableOpacity
                            onPress={() => setShowGlossary(true)}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          >
                            <Text style={[styles.expandedKey, { color: colors.textPrimary, marginRight: 4 }]}>
                              Value at Risk:
                            </Text>
                            {/* @ts-ignore */}
                            <Info size={11} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.expandedVal, { color: colors.textPrimary }]}>
                            {formatCurrencyIN(item.card.waiver_value_at_risk || 0)}
                          </Text>
                        </View>
                        <View style={styles.expandedRow}>
                          <TouchableOpacity
                            onPress={() => setShowGlossary(true)}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          >
                            <Text style={[styles.expandedKey, { color: colors.textPrimary, marginRight: 4 }]}>
                              Urgency Multiplier:
                            </Text>
                            {/* @ts-ignore */}
                            <Info size={11} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.expandedVal, { color: colors.textPrimary }]}>
                            {item.card.urgency_level === 'HIGH' ? '2.0x' : item.card.urgency_level === 'MEDIUM' ? '1.5x' : '1.0x'}
                          </Text>
                        </View>
                        <Text style={[styles.expandedFootnote, { color: colors.textMuted }]}>
                          Because this transaction contributes to your remaining spend target, the engine unlocks the urgency-adjusted value of the fee waiver proportionally.
                        </Text>
                      </Animated.View>
                    )}
                  </>
                )}

                {/* Total */}
                <View style={[styles.totalRow, { borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Estimated Total Value</Text>
                  <Text style={[styles.totalValue]}>
                    {formatCurrencyIN(item.recommendation.immediate_reward_value + item.recommendation.fee_waiver_progress_impact)}
                  </Text>
                </View>
              </View>

            </Animated.View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>

      <GlossarySheet visible={showGlossary} onClose={() => setShowGlossary(false)} />
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
    height: '78%',
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
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 24,
    letterSpacing: -1,
  },
  cardBox: {
    padding: 24,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: 28,
    overflow: 'hidden',
  },
  strategyTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 8,
  },
  narrativeText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 24,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  // Calculation steps (accordion)
  calcStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  calcDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  calcDotNumber: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
    color: '#fff',
  },
  calcStepText: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    fontWeight: tokens.fontWeight.medium,
  },
  // Value breakdown
  breakdownCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownLabel: {
    fontSize: tokens.fontSize.body,
  },
  breakdownValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  totalLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  totalValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: '#10B981',
  },
  // Fee waiver expand
  expandedBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 14,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  expandedText: {
    fontSize: tokens.fontSize.caption,
    lineHeight: 20,
    marginBottom: 10,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  expandedKey: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  expandedVal: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  expandedFootnote: {
    fontSize: tokens.fontSize.micro,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
});
