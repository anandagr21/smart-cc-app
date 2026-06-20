import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { DynamicIcon } from '@/components/DynamicIcon';

export const AnticipatoryState: React.FC = () => {
  const colors = useThemeColors();

  return (
    <Animated.View 
      entering={FadeInDown.duration(800).springify()} 
      style={styles.container}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <DynamicIcon name="Activity" size={24} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Observing patterns.
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Intelligence requires context. As you transact throughout the month, your behavioral narrative and optimization opportunities will crystallize here.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: 100,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: 26,
    textAlign: 'center',
  },
});
