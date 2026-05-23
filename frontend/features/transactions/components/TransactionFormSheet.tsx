import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, IndianRupee, X } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useCards } from '../../cards/hooks/useCards';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useUpdateTransaction } from '../hooks/useUpdateTransaction';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { getNetworkGradient } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

const formSchema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required').transform((v) => v.trim()),
  amount: z.coerce.number().positive('Amount must be positive'),
  user_card_id: z.string().min(1, 'Please select a card'),
  payment_mode: z.enum(['ONLINE', 'OFFLINE', 'INTERNATIONAL']).default('ONLINE'),
});

type FormData = z.infer<typeof formSchema>;

interface TransactionFormSheetProps {
  visible: boolean;
  onClose: () => void;
  initialData?: TransactionResponse | null;
}

const PAYMENT_MODES = [
  { label: 'Online', value: 'ONLINE' },
  { label: 'Offline', value: 'OFFLINE' },
  { label: 'Intl', value: 'INTERNATIONAL' },
];

export const TransactionFormSheet: React.FC<TransactionFormSheetProps> = ({
  visible,
  onClose,
  initialData,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { data: cardsData } = useCards();
  const addTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const isEditing = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { merchant_name: '', user_card_id: '', payment_mode: 'ONLINE' },
  });

  useEffect(() => {
    if (visible && initialData) {
      reset({
        merchant_name: initialData.merchant_name,
        amount: initialData.amount,
        user_card_id: initialData.user_card_id,
        payment_mode: initialData.payment_mode || 'ONLINE',
      });
    } else if (visible && cardsData?.length && !initialData) {
      reset({
        merchant_name: '',
        amount: undefined,
        user_card_id: cardsData[0].id,
        payment_mode: 'ONLINE',
      });
    }
  }, [visible, initialData, cardsData, reset]);

  const onFormSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateTx.mutateAsync({
          id: initialData.id,
          data: {
            ...data,
            category: initialData.category,
            reward_type: initialData.reward_type,
            reward_earned: initialData.reward_earned,
          },
        });
      } else {
        await addTx.mutateAsync(data);
      }
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={85}
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

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Amount Hero Input */}
            <View style={styles.amountHeroWrap}>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.amountInputRow}>
                    <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
                    <Input
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={value?.toString() || ''}
                      onChangeText={onChange}
                      style={styles.heroInputContainer}
                      // @ts-ignore
                      inputStyle={[styles.heroInput, { color: colors.textPrimary }]}
                      hideBorder
                      hideFocusGlow
                    />
                  </View>
                )}
              />
              {errors.amount && (
                <Text style={[styles.errorText, { color: colors.danger, textAlign: 'center' }]}>
                  {errors.amount.message}
                </Text>
              )}
            </View>

            {/* Merchant */}
            <Controller
              control={control}
              name="merchant_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Merchant"
                  placeholder="Amazon, Uber, Starbucks..."
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.merchant_name?.message}
                  leftIcon={<Store size={18} color={colors.textMuted} />}
                />
              )}
            />

            {/* Payment Mode Segmented Control */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Payment Mode</Text>
              <Controller
                control={control}
                name="payment_mode"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.segmentRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {PAYMENT_MODES.map((mode) => {
                      const isActive = value === mode.value;
                      return (
                        <TouchableOpacity
                          key={mode.value}
                          onPress={() => onChange(mode.value)}
                          activeOpacity={0.7}
                          style={[
                            styles.segmentBtn,
                            isActive && { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 }
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

            {/* Card Selector (Mini Previews) */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Payment Card</Text>
              <Controller
                control={control}
                name="user_card_id"
                render={({ field: { onChange, value } }) => (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
                    {cardsData?.map((card) => {
                      const isActive = value === card.id;
                      const network = card.card_details?.network || 'default';
                      const gradient = getNetworkGradient(network, isDark) as [string, string];
                      const cardName = card.nickname || card.card_details?.card_name;
                      
                      return (
                        <TouchableOpacity
                          key={card.id}
                          onPress={() => onChange(card.id)}
                          activeOpacity={0.8}
                          style={[
                            styles.miniCardWrap,
                            isActive && { transform: [{ scale: 1.05 }], opacity: 1 },
                            !isActive && { opacity: 0.5 }
                          ]}
                        >
                          <LinearGradient
                            colors={gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.miniCard}
                          >
                            <View style={styles.miniTopEdge} />
                            <Text style={styles.miniBankName} numberOfLines={1}>{card.card_details?.bank_name}</Text>
                            <Text style={styles.miniCardName} numberOfLines={1}>{cardName}</Text>
                          </LinearGradient>
                          {isActive && (
                            <View style={[styles.activeRing, { borderColor: colors.primary }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              />
              {errors.user_card_id && (
                <Text style={[styles.errorText, { color: colors.danger, marginTop: 4 }]}>
                  {errors.user_card_id.message}
                </Text>
              )}
            </View>

            {/* CTA */}
            <Button
              label={isEditing ? 'Save Changes' : 'Add Transaction'}
              onPress={handleSubmit(onFormSubmit)}
              isLoading={isSubmitting || addTx.isPending || updateTx.isPending}
              style={styles.ctaBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
    height: '90%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  amountHeroWrap: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.medium,
    marginRight: 4,
    marginTop: -8,
  },
  heroInputContainer: {
    marginBottom: 0,
    minHeight: 0,
    width: 200,
  },
  heroInput: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    textAlign: 'center',
    height: 80,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.semibold,
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
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: tokens.fontSize.caption,
  },
  cardScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  miniCardWrap: {
    width: 140,
    height: 85,
    borderRadius: tokens.radius.md,
  },
  miniCard: {
    flex: 1,
    borderRadius: tokens.radius.md,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  miniBankName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
  },
  miniCardName: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  activeRing: {
    position: 'absolute',
    top: -4, bottom: -4, left: -4, right: -4,
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
  },
  ctaBtn: {
    marginTop: 16,
  },
});
