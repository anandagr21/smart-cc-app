import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react-native';
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
  const topCardName = top.card.nickname || top.card.card_details?.card_name || 'Card';
  
  const strategyLabelMap: Record<string, string> = {
    'MAX_REWARD': 'Maximum Immediate Return',
    'FEE_WAIVER_PRESERVATION': 'Fee Waiver Optimized',
    'MILESTONE_ACCELERATION': 'Milestone Acceleration',
    'PORTFOLIO_OPTIMIZED': 'Long-Term Value',
  };

  const humanStrategy = top.recommendation.primary_strategy 
    ? (strategyLabelMap[top.recommendation.primary_strategy] || top.recommendation.primary_strategy)
    : 'Strategic Choice';

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
                  {top.recommendation.explanation || top.recommendation.reason_description || 'This card provides the highest long-term projected value for your portfolio.'}
                </Text>

                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.1)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>

              {/* SUPPORTING FACTORS */}
              {top.recommendation.supporting_factors && top.recommendation.supporting_factors.length > 0 && (
                <View style={styles.factorsSection}>
                  {top.recommendation.supporting_factors.map((factor, idx) => (
                    <View key={idx} style={styles.factorRow}>
                      {/* @ts-ignore */}
                      <CheckCircle2 size={16} color={colors.success} style={styles.factorIcon} />
                      <Text style={[styles.factorText, { color: colors.textSecondary }]}>{factor}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* MATHEMATICAL BREAKDOWN */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 32 }]}>
                VALUE BREAKDOWN
              </Text>
              
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownName, { color: colors.textSecondary }]}>Cashback Now</Text>
                  <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                    {formatCurrencyIN(top.recommendation.cashback_value || 0)}
                  </Text>
                </View>

                {top.recommendation.strategic_value > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownName, { color: colors.textSecondary }]}>Strategic Value</Text>
                    <Text style={[styles.breakdownValue, { color: '#A78BFA' }]}>
                      {formatCurrencyIN(top.recommendation.strategic_value)}
                    </Text>
                  </View>
                )}

                <View style={[styles.breakdownRow, { borderBottomWidth: 0, marginTop: 8, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.breakdownName, { color: colors.textPrimary, fontWeight: tokens.fontWeight.bold }]}>Total Projected Value</Text>
                  <Text style={[styles.breakdownValue, { color: '#10B981', fontSize: tokens.fontSize.title }]}>
                    {formatCurrencyIN(top.recommendation.total_projected_value || top.recommendation.portfolio_score)}
                  </Text>
                </View>
              </View>

            </Animated.View>
            <View style={{ height: 60 }} />
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
});
