import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { DynamicIcon } from '@/components/DynamicIcon';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { FeatureFlags } from '@/config/features';

const PAYMENT_MODES = [
  { label: 'Online', value: 'ONLINE' },
  { label: 'Offline', value: 'OFFLINE' },
  { label: 'Intl', value: 'INTERNATIONAL' },
];

const INTENT_OPTIONS = [
  { label: 'Max Rewards', value: 'MAX_REWARDS', disabled: false },
  { label: 'Save Fee', value: 'SAVE_FEE_WAIVER', disabled: false },
  { label: 'Balanced', value: 'BALANCED', disabled: false },
  { label: 'Simplify', value: 'SIMPLIFY_DECISIONS', disabled: true }
];

interface SearchSectionProps {
  showCorrection: boolean;
  resolvedMerchantName: string | null;
  resolutionConfidence: number | null;
  onUndoCorrection: () => void;
  triggerHaptic: (type: 'selection' | 'success' | 'error') => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  showCorrection,
  resolvedMerchantName,
  resolutionConfidence,
  onUndoCorrection,
  triggerHaptic
}) => {
  const colors = useThemeColors();
  const { control, formState: { errors } } = useFormContext<any>();

  return (
    <>
      <View style={styles.amountHeroWrap}>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <View style={styles.amountInputRow}>
              <Text style={[styles.currencySymbol, { color: value ? colors.textPrimary : colors.textMuted }]}>₹</Text>
              <Input
                testID="amount-input"
                placeholder="0"
                keyboardType="numeric"
                value={value?.toString() || ''}
                onChangeText={onChange}
                style={styles.heroInputContainer}
                inputStyle={[styles.heroInput, { color: colors.textPrimary }] as const}
                hideBorder
                hideFocusGlow
                autoFocus
              />
            </View>
          )}
        />
        {errors.amount?.message && (
          <Text style={[styles.errorText, { color: colors.danger, textAlign: 'center' }]}>
            {errors.amount.message as string}
          </Text>
        )}
      </View>

      <View>
        <Controller
          control={control}
          name="merchant_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              testID="merchant-input"
              label="Merchant"
              placeholder="Amazon, Uber, Starbucks..."
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.merchant_name?.message as string}
              leftIcon={<DynamicIcon name="Store" size={18} color={colors.textMuted} />}
            />
          )}
        />
        {showCorrection && resolvedMerchantName && (
          <Animated.View 
            entering={SlideInDown.springify().mass(0.8).damping(15)}
            exiting={FadeOut.duration(150)}
            style={styles.correctionContainer}
          >
            <View style={styles.correctionLeft}>
              {resolutionConfidence && resolutionConfidence >= 0.95 ? (
                <DynamicIcon name="CheckCircle2" size={16} color={colors.success} />
              ) : (
                <DynamicIcon name="AlertTriangle" size={16} color={colors.warning} />
              )}
              <Text style={[styles.correctionText, { color: colors.textSecondary }]}>
                {resolutionConfidence && resolutionConfidence >= 0.95 ? 'Using ' : 'Recognized as '}
                <Text style={{ color: colors.textPrimary, fontWeight: tokens.fontWeight.bold }}>
                  {resolvedMerchantName}
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onUndoCorrection} style={styles.undoBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={[styles.undoText, { color: colors.primary }]}>Undo</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <View style={styles.sectionWrap}>
        <Controller
          control={control}
          name="payment_mode"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.segmentRow, { backgroundColor: colors.background }]}>
              {PAYMENT_MODES.map((mode) => {
                const isActive = value === mode.value;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    onPress={() => {
                      triggerHaptic('selection');
                      onChange(mode.value);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.segmentBtn,
                      isActive && { 
                        backgroundColor: colors.surfaceElevated,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 
                      }
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      { 
                        color: isActive ? colors.primary : colors.textMuted,
                        fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium
                      }
                    ]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      </View>

      {FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Optimization Intent</Text>
          <Controller
            control={control}
            name="intent"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {INTENT_OPTIONS.map((option) => {
                  const isActive = value === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        if (!option.disabled) {
                          triggerHaptic('selection');
                          onChange(option.value);
                        }
                      }}
                      activeOpacity={0.7}
                      disabled={option.disabled}
                      style={[
                        styles.segmentBtn,
                        { paddingHorizontal: 16, backgroundColor: colors.background },
                        isActive && { 
                          backgroundColor: colors.surfaceElevated,
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 
                        },
                        option.disabled && { opacity: 0.4 }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[
                          styles.segmentText,
                          { 
                            color: isActive ? colors.primary : colors.textMuted,
                            fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium
                          }
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  amountHeroWrap: {
    alignItems: 'flex-start',
    marginBottom: 32,
    marginTop: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  currencySymbol: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    marginRight: 8,
  },
  heroInputContainer: {
    marginBottom: 0,
    minHeight: 0,
    width: 'auto',
    minWidth: 100,
  },
  heroInput: {
    fontSize: 56, // Massive Apple Wallet size
    fontWeight: tokens.fontWeight.heavy,
    height: 80,
    letterSpacing: -2,
    paddingVertical: 0,
    textAlign: 'left',
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
  },
  correctionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  correctionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  correctionText: {
    fontSize: tokens.fontSize.body,
  },
  undoBtn: {
    padding: 4,
  },
  undoText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 10,
    marginLeft: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: tokens.fontSize.caption,
  },
});
