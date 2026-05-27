import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, IndianRupee } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RecommendationRequest, PaymentMode } from '../types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

const PAYMENT_MODES: { label: string; value: PaymentMode }[] = [
  { label: 'Any', value: 'ANY' as PaymentMode },
  { label: 'Online', value: 'ONLINE' as PaymentMode },
  { label: 'Offline', value: 'OFFLINE' as PaymentMode },
  { label: 'Intl', value: 'INTERNATIONAL' as PaymentMode },
];

const schema = z.object({
  merchant_name: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, 'Merchant name is required')),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .finite('Enter a valid amount')
    .optional(),
  payment_mode: z
    .enum(['ANY', 'ONLINE', 'OFFLINE', 'INTERNATIONAL'])
    .default('ANY'),
});

type FormData = z.infer<typeof schema>;

interface RecommendationFormProps {
  onSubmit: (data: RecommendationRequest) => void;
  isLoading: boolean;
}

export const RecommendationForm: React.FC<RecommendationFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const colors = useThemeColors();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { merchant_name: '', payment_mode: 'ANY' },
  });

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      merchant_name: data.merchant_name,
      amount: data.amount || 0,
      payment_mode: (data.payment_mode?.toLowerCase() ?? 'any') as PaymentMode,
    });
  };

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()}>
      <Card variant="elevated" padded style={styles.card}>
        {/* Merchant */}
        <Controller
          control={control}
          name="merchant_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Merchant"
              placeholder="Amazon, Uber, Starbucks…"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.merchant_name?.message as string}
              leftIcon={
                <Store size={18} color={colors.textMuted} strokeWidth={1.5} />
              }
            />
          )}
        />

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Estimated Amount"
              placeholder="0.00"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value?.toString() || ''}
              error={errors.amount?.message as string}
              hint="Optional — helps estimate reward value"
              leftIcon={
                <IndianRupee size={18} color={colors.textMuted} strokeWidth={1.5} />
              }
            />
          )}
        />

        {/* Payment mode segmented control */}
        <Controller
          control={control}
          name="payment_mode"
          render={({ field: { onChange, value } }) => (
            <View style={styles.modeWrap}>
              <Text style={[styles.modeLabel, { color: colors.textMuted }]}>
                Payment Mode
              </Text>
              <View
                style={[
                  styles.modeRow,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {PAYMENT_MODES.map((mode) => {
                  const isActive = value === mode.value;
                  return (
                    <TouchableOpacity
                      key={mode.value}
                      onPress={() => onChange(mode.value)}
                      activeOpacity={0.7}
                      style={[
                        styles.modeBtn,
                        isActive && {
                          backgroundColor: colors.primarySoft,
                          borderColor: colors.primary,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          {
                            color: isActive ? colors.primary : colors.textMuted,
                            fontWeight: isActive
                              ? tokens.fontWeight.bold
                              : tokens.fontWeight.medium,
                          },
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      </Card>

      <View style={styles.ctaWrap}>
        <Button
          label="Analyze Transaction"
          onPress={handleSubmit(onFormSubmit)}
          isLoading={isLoading}
          style={styles.cta}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  modeWrap: { marginBottom: 4 },
  modeLabel: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: 0.3,
  },
  ctaWrap: { marginTop: 4, marginBottom: 24 },
  cta: { width: '100%' },
});
