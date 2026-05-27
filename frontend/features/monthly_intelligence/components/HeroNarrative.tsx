import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Narrative, ConfidenceLevel } from '../types/monthly_intelligence.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { Info } from 'lucide-react-native';

interface HeroNarrativeProps {
  narrative: Narrative;
  onPressExplain: (narrative: Narrative) => void;
}

export const HeroNarrative: React.FC<HeroNarrativeProps> = ({ narrative, onPressExplain }) => {
  const colors = useThemeColors();

  const getConfidenceText = (level: ConfidenceLevel) => {
    switch (level) {
      case ConfidenceLevel.STRONG_TREND: return 'Strong trend';
      case ConfidenceLevel.MODERATE_TREND: return 'Stable pattern';
      case ConfidenceLevel.EARLY_SIGNAL: return 'Emerging signal';
      default: return 'Insight';
    }
  };

  const getConfidenceColor = (level: ConfidenceLevel) => {
    if (narrative.type === 'INEFFICIENCY') return colors.warning;
    return colors.success; // Emerald identity
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <View style={[styles.confidencePill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.indicatorDot, { backgroundColor: getConfidenceColor(narrative.confidence) }]} />
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>
            {getConfidenceText(narrative.confidence)}
          </Text>
        </View>
      </View>

      <Text style={[styles.narrativeText, { color: colors.textPrimary }]}>
        {narrative.text}
      </Text>

      <TouchableOpacity 
        style={styles.reasoningBtn} 
        onPress={() => onPressExplain(narrative)}
        activeOpacity={0.7}
      >
        <Text style={[styles.reasoningPreview, { color: colors.textMuted }]} numberOfLines={2}>
          {narrative.reasoning}
        </Text>
        <View style={styles.explainAction}>
          <Text style={[styles.explainText, { color: colors.primary }]}>Why?</Text>
          {/* @ts-ignore */}
          <Info size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  narrativeText: {
    fontSize: 28,
    fontWeight: tokens.fontWeight.heavy,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  reasoningBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  reasoningPreview: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
  explainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  explainText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
});
