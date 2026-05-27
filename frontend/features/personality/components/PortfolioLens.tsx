import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { usePersonalityProfile, OptimizationPersonality } from '../api/personalityApi';
import { PersonalitySelectionSheet } from './PersonalitySelectionSheet';
import { Focus } from 'lucide-react-native';

export const PortfolioLens = () => {
  const colors = useThemeColors();
  const { data: profile, isLoading } = usePersonalityProfile();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (isLoading) return null;

  const activePersonality = profile?.active_personality || OptimizationPersonality.BALANCED_INTELLIGENCE;

  const getLensText = (personality: OptimizationPersonality) => {
    switch (personality) {
      case OptimizationPersonality.MAXIMIZE_REWARDS:
        return "Focused on maximizing immediate rewards.";
      case OptimizationPersonality.TRAVEL_OPTIMIZATION:
        return "Focused on long-term travel value.";
      case OptimizationPersonality.FEE_MINIMIZATION:
        return "Focused on minimizing annual fees.";
      case OptimizationPersonality.BALANCED_INTELLIGENCE:
        return "Balancing rewards, travel, and fee protection.";
      case OptimizationPersonality.WALLET_SIMPLICITY:
        return "Focused on wallet simplicity.";
      default:
        return "Balancing rewards, travel, and fee protection.";
    }
  };

  const getConfidenceText = () => {
    if (!profile) return null;
    if (!profile.is_inferred) return null; // Only show observational text if system inferred it

    const score = profile.confidence_score;
    if (score >= 0.8) {
      return "Observed consistently across recent transactions.";
    } else if (score >= 0.4) {
      return "Adapting to recent transaction patterns.";
    } else {
      return "Confidence dropping. Consider reviewing your strategy.";
    }
  };

  const confidenceText = getConfidenceText();

  return (
    <>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => setSheetVisible(true)}
          style={styles.container}
        >
          {/* @ts-ignore */}
          <Focus size={14} color={colors.textMuted} style={styles.icon} />
          <View style={styles.textStack}>
            <Text style={[styles.lensText, { color: colors.textSecondary }]}>
              {getLensText(activePersonality)}
            </Text>
            {confidenceText && (
              <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
                {confidenceText}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      <PersonalitySelectionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        activePersonality={activePersonality}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -12, // Pulls it slightly closer to the header for tight association
    marginBottom: 24,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  textStack: {
    flex: 1,
    flexDirection: 'column',
  },
  lensText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    fontStyle: 'italic', // Gives it that "editorial" subtle feel
    letterSpacing: 0.2,
  },
  confidenceText: {
    fontSize: tokens.fontSize.micro,
    marginTop: 2,
  },
});
