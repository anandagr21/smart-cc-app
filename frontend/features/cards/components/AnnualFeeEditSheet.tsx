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
import { X, ShieldCheck } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { tokens } from '../../../theme/tokens';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';
import { formatCurrencyIN } from '../../../utils/currency';

interface AnnualFeeEditSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse;
}

export const AnnualFeeEditSheet: React.FC<AnnualFeeEditSheetProps> = ({
  visible,
  onClose,
  card,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { mutateAsync: updateCard, isPending } = useUpdateCard(card.id);

  const getInitialFee = (c: UserCardResponse) => {
    const val = c.user_override_annual_fee !== undefined && c.user_override_annual_fee !== null
      ? c.user_override_annual_fee
      : c.catalog_annual_fee;
    
    if (val === null || val === undefined) return '0';
    return Math.round(Number(val)).toString();
  };

  const [feeInput, setFeeInput] = useState(() => getInitialFee(card));

  useEffect(() => {
    if (visible) {
      setFeeInput(getInitialFee(card));
    }
  }, [visible, card]);

  const handleSave = async () => {
    let numericFee = parseFloat(feeInput.replace(/,/g, ''));
    if (isNaN(numericFee) || numericFee < 0) {
      numericFee = 0;
    }

    try {
      await updateCard({
        user_override_annual_fee: numericFee
      });
      onClose();
    } catch (e) {
      console.error('Failed to update fee:', e);
    }
  };

  const numericFeeForPreview = parseFloat(feeInput.replace(/,/g, '')) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
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
          <View
            style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]}
            pointerEvents="none"
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Adjust Annual Fee
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}
            >
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text style={[styles.supportingCopy, { color: colors.textSecondary }]}>
              Some banks apply different renewal offers or waived fees. Updating this helps improve forecast accuracy.
            </Text>

            <View style={styles.inputWrap}>
              <Input
                label="Annual Fee (₹)"
                placeholder="0"
                value={feeInput}
                onChangeText={(text) => setFeeInput(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                hint={`Preview: ${formatCurrencyIN(numericFeeForPreview)}`}
              />
            </View>

            <View style={styles.intelligenceContext}>
              {/* @ts-ignore */}
              <ShieldCheck size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
              <View style={styles.intelligenceContextTextWrap}>
                <Text style={[styles.intelligenceContextTitle, { color: colors.textMuted }]}>
                  This value powers intelligence. It may affect:
                </Text>
                <Text style={[styles.intelligenceContextBullet, { color: colors.textMuted }]}>
                  • fee waiver forecasts
                </Text>
                <Text style={[styles.intelligenceContextBullet, { color: colors.textMuted }]}>
                  • optimization scoring
                </Text>
                <Text style={[styles.intelligenceContextBullet, { color: colors.textMuted }]}>
                  • annual fee insights
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                label="Calibrate Wallet Intelligence"
                onPress={handleSave}
                isLoading={isPending}
                style={styles.saveBtn}
              />
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  supportingCopy: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputWrap: {
    marginBottom: 24,
  },
  intelligenceContext: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  intelligenceContextTextWrap: {
    flex: 1,
  },
  intelligenceContextTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 4,
  },
  intelligenceContextBullet: {
    fontSize: tokens.fontSize.caption,
    marginLeft: 4,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 8,
  },
  saveBtn: {
    width: '100%',
  },
});
