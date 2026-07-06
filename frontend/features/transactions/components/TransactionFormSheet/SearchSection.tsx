import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';
import Animated, { FadeOut, SlideInDown, FadeIn, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { DynamicIcon } from '@/components/DynamicIcon';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { FeatureFlags } from '@/config/features';
import { useDebounce } from '@/hooks/useDebounce';

const PAYMENT_MODES = [
  { label: 'Online', value: 'ONLINE', icon: 'Globe' },
  { label: 'Offline', value: 'OFFLINE', icon: 'Store' },
  { label: 'UPI', value: 'UPI', icon: 'Smartphone' },
  { label: 'International', value: 'INTERNATIONAL', icon: 'Plane' },
];

const INTENT_OPTIONS = [
  { label: 'Max Rewards', value: 'MAX_REWARDS', icon: 'Sparkles', color: '#8B5CF6' },
  { label: 'Save Fee', value: 'SAVE_FEE_WAIVER', icon: 'ShieldCheck', color: '#10B981' },
  { label: 'Balanced', value: 'BALANCED', icon: 'Scale', color: '#3B82F6' },
  { label: 'Simplify', value: 'SIMPLIFY_DECISIONS', icon: 'Zap', color: '#F59E0B' }
];

const DebouncedAmountInput = ({ value, onChange, colors, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  
  useEffect(() => {
    if (value?.toString() !== localValue) {
      setLocalValue(value?.toString() || '');
    }
  }, [value]);

  const debouncedValue = useDebounce(localValue, 400);

  useEffect(() => {
    if (debouncedValue !== (value?.toString() || '')) {
      onChange(debouncedValue);
    }
  }, [debouncedValue]);

  return (
    <View style={styles.amountInputRow}>
      <Text style={[styles.currencySymbol, { color: localValue ? colors.textPrimary : colors.textMuted }]}>₹</Text>
      <TextInput
        {...props}
        value={localValue}
        onChangeText={setLocalValue}
        style={[styles.heroInput, { color: colors.textPrimary }]}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        numberOfLines={1}
      />
    </View>
  );
};

const DebouncedMerchantInput = ({ value, onChange, onBlur, colors, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value || '');
  
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value || '');
    }
  }, [value]);

  const debouncedValue = useDebounce(localValue, 400);

  useEffect(() => {
    if (debouncedValue !== (value || '')) {
      onChange(debouncedValue);
    }
  }, [debouncedValue]);

  return (
    <TextInput
      {...props}
      value={localValue}
      onChangeText={setLocalValue}
      onBlur={onBlur}
      style={[styles.merchantInput, { color: colors.textPrimary }]}
    />
  );
};

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
  const { control, formState: { errors }, watch, setValue } = useFormContext<any>();
  
  const currentIntentValue = watch('intent');
  const currentIntent = INTENT_OPTIONS.find(i => i.value === currentIntentValue) || INTENT_OPTIONS[2];

  const amountShake = useSharedValue(0);
  const merchantShake = useSharedValue(0);

  useEffect(() => {
    if (errors.amount?.message) {
      amountShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      triggerHaptic('error');
    }
  }, [errors.amount?.message]);

  useEffect(() => {
    if (errors.merchant_name?.message) {
      merchantShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      triggerHaptic('error');
    }
  }, [errors.merchant_name?.message]);

  const amountStyle = useAnimatedStyle(() => ({ transform: [{ translateX: amountShake.value }] }));
  const merchantStyle = useAnimatedStyle(() => ({ transform: [{ translateX: merchantShake.value }] }));

  return (
    <>
      <Animated.View style={styles.heroWrap} entering={FadeIn.duration(400)}>
        <View style={[styles.heroGlow, { backgroundColor: currentIntent.color }]} />
        
        <Animated.View style={[styles.amountHeroWrap, amountStyle]}>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <DebouncedAmountInput
                value={value}
                onChange={onChange}
                colors={colors}
                testID="amount-input"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                autoFocus
              />
            )}
          />
          {errors.amount?.message && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {errors.amount.message as string}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.merchantHeroWrap, merchantStyle]}>
          <Controller
            control={control}
            name="merchant_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <DebouncedMerchantInput
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                colors={colors}
                testID="merchant-input"
                placeholder="Add Merchant..."
                placeholderTextColor={colors.textSecondary}
              />
            )}
          />
          {errors.merchant_name?.message && (
            <Text style={[styles.errorText, { color: colors.danger, marginTop: 4 }]}>
              {errors.merchant_name.message as string}
            </Text>
          )}
        </Animated.View>
      </Animated.View>

      {showCorrection && resolvedMerchantName && (
        <Animated.View 
          entering={SlideInDown.springify().mass(0.8).damping(15)}
          exiting={FadeOut.duration(150)}
          style={[styles.correctionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
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

      <View style={styles.controlsWrap}>
        {/* Merchant Quick Select */}
        <View style={styles.controlSection}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>QUICK SELECT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {[
              { label: 'Swiggy', icon: 'Utensils' },
              { label: 'Zomato', icon: 'Utensils' },
              { label: 'Amazon', icon: 'ShoppingBag' },
              { label: 'Flipkart', icon: 'ShoppingBag' },
              { label: 'Fuel', icon: 'Fuel' },
            ].map(m => (
              <TouchableOpacity
                key={m.label}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic('selection');
                  setValue('merchant_name', m.label);
                }}
                style={[
                  styles.chip,
                  { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border }
                ]}
              >
                <DynamicIcon name={m.icon as any} size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.chipText, { color: colors.textPrimary }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlSection}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>PAYMENT MODE</Text>
          <Controller
            control={control}
            name="payment_mode"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {PAYMENT_MODES.map(mode => {
                  const isActive = value === mode.value;
                  return (
                    <TouchableOpacity
                      key={mode.value}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic('selection');
                        onChange(mode.value);
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: isActive ? colors.primarySoft : 'rgba(255,255,255,0.03)' },
                        isActive ? { borderColor: colors.primary } : { borderColor: colors.border }
                      ]}
                    >
                      <DynamicIcon name={mode.icon} size={14} color={isActive ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={[styles.chipText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          />
        </View>

        {FeatureFlags.ENABLE_SMART_RECOMMENDATIONS && (
          <View style={styles.controlSection}>
            <Text style={[styles.controlLabel, { color: colors.textMuted }]}>AI STRATEGY</Text>
            <Controller
              control={control}
              name="intent"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {INTENT_OPTIONS.map(intent => {
                    const isActive = value === intent.value;
                    return (
                      <TouchableOpacity
                        key={intent.value}
                        activeOpacity={0.7}
                        onPress={() => {
                          triggerHaptic('selection');
                          onChange(intent.value);
                        }}
                        style={[
                          styles.chip,
                          { backgroundColor: isActive ? colors.primarySoft : 'rgba(255,255,255,0.03)' },
                          isActive ? { borderColor: intent.color } : { borderColor: colors.border }
                        ]}
                      >
                        <DynamicIcon name={intent.icon} size={14} color={isActive ? intent.color : colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.chipText, { color: isActive ? intent.color : colors.textPrimary }]}>
                          {intent.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            />
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 16,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
    borderRadius: 100,
    transform: [{ scaleX: 1.5 }, { scaleY: 0.8 }],
    top: -20,
    filter: 'blur(30px)',
  },
  amountHeroWrap: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: tokens.fontWeight.heavy,
    marginRight: 4,
  },
  heroInput: {
    fontSize: 52,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 60,
    maxWidth: '85%',
  },
  merchantHeroWrap: {
    alignItems: 'center',
    zIndex: 2,
    width: '100%',
  },
  merchantInput: {
    fontSize: 22,
    fontWeight: tokens.fontWeight.medium,
    textAlign: 'center',
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
    textAlign: 'center',
  },
  correctionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  correctionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  controlsWrap: {
    marginBottom: 24,
    gap: 20,
  },
  controlSection: {
    gap: 8,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
});
