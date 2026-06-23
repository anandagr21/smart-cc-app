import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Narrative, ConfidenceLevel } from '../types/monthly_intelligence.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

import { DynamicIcon } from '@/components/DynamicIcon';

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

  const getConfidenceColor = () => {
    if (narrative.type === 'INEFFICIENCY') return colors.warning;
    return colors.success;
  };

  const glowColor = getConfidenceColor() + '15'; // 8% opacity hex approx
  const pillBg = getConfidenceColor() + '1A'; // 10% opacity
  const pillBorder = getConfidenceColor() + '33'; // 20% opacity

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[glowColor, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <View style={styles.contentWrap}>
        <View style={styles.pillRow}>
          <View style={[styles.confidencePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
            <View style={[styles.indicatorDot, { backgroundColor: getConfidenceColor() }]} />
            <Text style={[styles.pillText, { color: getConfidenceColor() }]}>
              {getConfidenceText(narrative.confidence)}
            </Text>
          </View>
        </View>

        <Text style={[styles.narrativeText, { color: colors.textPrimary }]}>
          {narrative.text}
        </Text>

        <TouchableOpacity
          style={[styles.reasoningBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => onPressExplain(narrative)}
          activeOpacity={0.8}
        >
          <Text style={[styles.reasoningPreview, { color: colors.textSecondary }]} numberOfLines={2}>
            {narrative.reasoning}
          </Text>
          <View style={[styles.explainAction, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.explainText, { color: colors.primary }]}>Why?</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  contentWrap: {
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    gap: 8,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  narrativeText: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  reasoningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  reasoningPreview: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
  explainAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
  },
  explainText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
});
