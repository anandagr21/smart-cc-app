import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Sparkles, CheckCircle2, TrendingUp, Info } from 'lucide-react-native';
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
  const [showGlossary, setShowGlossary] = React.useState(false);

  if (!visible || !item) return null;

  const topCardName = item.card.nickname || item.card.card_details?.card_name || 'Card';
  
  const humanStrategy = item.recommendation.confidence_label || 'OPTIMAL';

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
              
              {/* NARRATIVE SECTION */}
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

              {/* MATHEMATICAL BREAKDOWN */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 32 }]}>
                VALUE BREAKDOWN
              </Text>
              
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownName, { color: colors.textSecondary }]}>Cashback Now</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                      {formatCurrencyIN(item.recommendation.immediate_reward_value || 0)}
                    </Text>
                    {item.recommendation.engine_explanations && item.recommendation.engine_explanations.length > 0 && (
                      <View style={{ marginTop: 4, alignItems: 'flex-end' }}>
                        {item.recommendation.engine_explanations.map((exp, idx) => (
                          <Text key={idx} style={[styles.engineExplanationText, { color: colors.textMuted }]}>
                            {exp}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {item.recommendation.fee_waiver_progress_impact > 0 && (
                  <>
                    <View style={styles.breakdownRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.breakdownName, { color: colors.textSecondary }]}>Fee Waiver Impact</Text>
                        <TouchableOpacity 
                          onPress={() => setShowFeeExplanation(!showFeeExplanation)}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          style={{ marginLeft: 6 }}
                        >
                          {/* @ts-ignore */}
                          <Info size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.breakdownValue, { color: '#A78BFA' }]}>
                        {formatCurrencyIN(item.recommendation.fee_waiver_progress_impact)}
                      </Text>
                    </View>
                    
                    {showFeeExplanation && (
                      <Animated.View entering={FadeInUp} style={[styles.explanationBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                          The system assigns financial value to transactions that help secure your annual fee waiver.
                        </Text>
                        <View style={styles.explanationMathRow}>
                          <TouchableOpacity onPress={() => setShowGlossary(true)} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Text style={[styles.explanationMathText, { color: colors.textPrimary, marginRight: 4 }]}>
                              Value at Risk:
                            </Text>
                            {/* @ts-ignore */}
                            <Info size={12} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.explanationMathValue, { color: colors.textPrimary }]}>
                            {formatCurrencyIN(item.card.waiver_value_at_risk || 0)}
                          </Text>
                        </View>
                        <View style={styles.explanationMathRow}>
                          <TouchableOpacity onPress={() => setShowGlossary(true)} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Text style={[styles.explanationMathText, { color: colors.textPrimary, marginRight: 4 }]}>
                              Urgency Multiplier:
                            </Text>
                            {/* @ts-ignore */}
                            <Info size={12} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.explanationMathValue, { color: colors.textPrimary }]}>
                            {item.card.urgency_level === 'HIGH' ? '2.0x' : item.card.urgency_level === 'MEDIUM' ? '1.5x' : '1.0x'}
                          </Text>
                        </View>
                        <Text style={[styles.explanationFootnote, { color: colors.textMuted }]}>
                          Because this transaction contributes to your remaining spend target, the engine unlocks the urgency-adjusted value of the fee waiver proportionally.
                        </Text>
                      </Animated.View>
                    )}
                  </>
                )}

                <View style={[styles.breakdownRow, { borderBottomWidth: 0, marginTop: 8, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.breakdownName, { color: colors.textPrimary, fontWeight: tokens.fontWeight.bold }]}>Estimated Value</Text>
                  <Text style={[styles.breakdownValue, { color: '#10B981', fontSize: tokens.fontSize.title }]}>
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
    height: '70%',
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
    marginBottom: 24,
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
  factorsSection: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  factorIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  factorText: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  breakdownBox: {
    paddingHorizontal: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  breakdownName: {
    fontSize: tokens.fontSize.body,
  },
  breakdownValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  explanationBox: {
    padding: 16,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: tokens.fontSize.caption,
    lineHeight: 20,
    marginBottom: 12,
  },
  explanationMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  explanationMathText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  explanationMathValue: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  explanationFootnote: {
    fontSize: tokens.fontSize.micro,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  engineExplanationText: {
    fontSize: tokens.fontSize.micro,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'right',
  },
});
