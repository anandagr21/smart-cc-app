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
import { X, TrendingUp } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { tokens } from '../../../theme/tokens';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';
import { formatCurrencyIN } from '../../../utils/currency';

interface AnnualSpendEditSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse;
}

export const AnnualSpendEditSheet: React.FC<AnnualSpendEditSheetProps> = ({
  visible,
  onClose,
  card,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { mutateAsync: updateCard, isPending } = useUpdateCard(card.id);

  const getInitialSpend = (c: UserCardResponse) => {
    const val = c.annual_spend;
    if (val === null || val === undefined) return '0';
    return Math.round(Number(val)).toString();
  };

  const getInitialTarget = (c: UserCardResponse) => {
    const val = c.effective_fee_waiver_threshold;
    if (val === null || val === undefined) return '0';
    return Math.round(Number(val)).toString();
  };

  const [spendInput, setSpendInput] = useState(() => getInitialSpend(card));
  const [targetInput, setTargetInput] = useState(() => getInitialTarget(card));

  useEffect(() => {
    if (visible) {
      setSpendInput(getInitialSpend(card));
      setTargetInput(getInitialTarget(card));
    }
  }, [visible, card]);

  const handleSave = async () => {
    let numericSpend = parseFloat(spendInput.replace(/,/g, ''));
    if (isNaN(numericSpend) || numericSpend < 0) {
      numericSpend = 0;
    }

    let numericTarget = parseFloat(targetInput.replace(/,/g, ''));
    if (isNaN(numericTarget) || numericTarget < 0) {
      numericTarget = 0;
    }

    try {
      await updateCard({
        annual_spend: numericSpend,
        user_override_fee_waiver_threshold: numericTarget
      });
      onClose();
    } catch (e) {
      console.error('Failed to update spend tracking:', e);
    }
  };

  const numericSpendForPreview = parseFloat(spendInput.replace(/,/g, '')) || 0;
  const numericTargetForPreview = parseFloat(targetInput.replace(/,/g, '')) || 0;

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
              Advanced Spend Tracking
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
              Keep your annual spend up to date to ensure accurate fee waiver forecasts and optimization insights.
            </Text>

            <View style={styles.inputWrap}>
              <Input
                label="Current Annual Spend (₹)"
                placeholder="0"
                value={spendInput}
                onChangeText={(text) => setSpendInput(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                hint={`Preview: ${formatCurrencyIN(numericSpendForPreview)}`}
              />
            </View>

            <View style={styles.inputWrap}>
              <Input
                label="Fee Waiver Target (₹)"
                placeholder="0"
                value={targetInput}
                onChangeText={(text) => setTargetInput(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                hint={`Preview: ${formatCurrencyIN(numericTargetForPreview)}`}
              />
            </View>

            <View style={styles.intelligenceContext}>
              {/* @ts-ignore */}
              <TrendingUp size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
              <View style={styles.intelligenceContextTextWrap}>
                <Text style={[styles.intelligenceContextTitle, { color: colors.textMuted }]}>
                  This data powers real-time insights:
                </Text>
                <Text style={[styles.intelligenceContextBullet, { color: colors.textMuted }]}>
                  • tracks progress towards waiver milestones
                </Text>
                <Text style={[styles.intelligenceContextBullet, { color: colors.textMuted }]}>
                  • flags cards falling behind target
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                label="Save Spend Data"
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
    maxHeight: '90%',
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
    marginBottom: 16,
  },
  intelligenceContext: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
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
