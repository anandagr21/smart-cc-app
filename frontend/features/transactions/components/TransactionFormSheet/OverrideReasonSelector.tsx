import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useFormContext, Controller } from 'react-hook-form';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

const OVERRIDE_REASONS = [
  { label: 'Personal preference', value: 'Personal preference' },
  { label: 'Building milestone', value: 'Building milestone' },
  { label: 'Simplifying wallet', value: 'Simplifying wallet' },
  { label: 'Avoiding annual fee', value: 'Avoiding annual fee' },
  { label: 'Temporary choice', value: 'Temporary choice' }
];

interface OverrideReasonSelectorProps {
  isVisible: boolean;
  triggerHaptic: (type: 'selection') => void;
}

export const OverrideReasonSelector: React.FC<OverrideReasonSelectorProps> = ({
  isVisible,
  triggerHaptic
}) => {
  const colors = useThemeColors();
  const { control } = useFormContext<any>();

  if (!isVisible) return null;

  return (
    <Animated.View entering={FadeInUp.springify().damping(20)} exiting={FadeOut} style={styles.overrideSection}>
      <Text style={[styles.overrideTitle, { color: colors.textSecondary }]}>Why did you choose this card?</Text>
      <Controller
        control={control}
        name="override_reason"
        render={({ field: { onChange, value } }) => (
          <View style={styles.overrideChipWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overrideScroll}>
              {OVERRIDE_REASONS.map(reason => {
                const isActive = value === reason.value;
                return (
                  <TouchableOpacity
                    key={reason.value}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic('selection');
                      onChange(isActive ? undefined : reason.value);
                    }}
                    style={[
                      styles.overrideChip,
                      { backgroundColor: isActive ? colors.primarySoft : 'rgba(255,255,255,0.03)' },
                      isActive ? { borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.overrideChipText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overrideSection: {
    paddingBottom: 16,
  },
  overrideTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
  },
  overrideChipWrap: {
    marginHorizontal: -24,
  },
  overrideScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  overrideChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  overrideChipText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
});
