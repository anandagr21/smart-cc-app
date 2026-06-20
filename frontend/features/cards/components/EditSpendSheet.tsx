import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';
import { formatCurrencyIN } from '@/utils/currency';
import { CardEditSheetBase } from './CardEditSheetBase';

interface EditSpendSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditSpendSheet: React.FC<EditSpendSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();

  const [spendValue, setSpendValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  
  const updateMutation = useUpdateCard(card?.id || '');

  useEffect(() => {
    if (visible && card) {
      setSpendValue(card.current_spend?.toString() || card.annual_spend?.toString() || '0');
      setTargetValue(card.effective_fee_waiver_threshold?.toString() || '0');
    }
  }, [visible, card]);

  if (!visible || !card) return null;

  const handleSave = () => {
    const spendNum = parseFloat(spendValue);
    const targetNum = parseFloat(targetValue);
    
    if (!isNaN(spendNum) && spendNum >= 0 && !isNaN(targetNum) && targetNum >= 0) {
      updateMutation.mutate({ 
        current_cycle_spend: spendNum,
        fee_waiver_target: targetNum
      }, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  return (
    <CardEditSheetBase visible={visible} onClose={onClose} title="Edit Waiver Progress">
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.textSecondary }]}>Current annual spend on this card</Text>
        <TextInput
          style={[
            styles.input,
            { 
              color: colors.textPrimary,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border
            }
          ]}
          value={spendValue}
          onChangeText={setSpendValue}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Annual Waiver Target</Text>
        <TextInput
          style={[
            styles.input,
            { 
              color: colors.textPrimary,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border
            }
          ]}
          value={targetValue}
          onChangeText={setTargetValue}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
        {card?.user_override_fee_waiver_threshold != null && card.fee_waiver_threshold != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
              💡 Catalog Default: {formatCurrencyIN(card.fee_waiver_threshold)}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.saveBtn, 
            { opacity: updateMutation.isPending ? 0.7 : 1 }
          ]} 
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {updateMutation.isPending ? 'Saving...' : 'Save Progress'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </CardEditSheetBase>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: tokens.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
