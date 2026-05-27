import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { usePersonalityProfile } from '../api/personalityApi';
import { Sparkles } from 'lucide-react-native';

export const BehavioralSignalsSurface = () => {
  const colors = useThemeColors();
  const { data: profile, isLoading } = usePersonalityProfile();

  if (isLoading || !profile) return null;

  // We only show coaching signals if there is some interesting state
  // For instance, confidence dropping implies strategic drift.
  
  if (!profile.is_inferred) {
    return null;
  }

  let signalText = null;
  if (profile.confidence_score <= 0.4) {
    signalText = "Recent decisions suggest your priorities might be shifting. The system is adapting.";
  } else if (profile.confidence_score <= 0.8) {
    signalText = "Softly adapting to your recent transaction patterns.";
  } else {
    // High confidence - no need for ambient signals
    return null;
  }

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.container}>
      {/* @ts-ignore */}
      <Sparkles size={14} color={colors.primary} style={styles.icon} />
      <Text style={[styles.signalText, { color: colors.textSecondary }]}>
        {signalText}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: -16, // Pull up to sit tightly under the Lens
  },
  icon: {
    marginRight: 8,
  },
  signalText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
});
