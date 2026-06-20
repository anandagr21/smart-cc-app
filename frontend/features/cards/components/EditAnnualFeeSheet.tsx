import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';
import { formatCurrencyIN } from '@/utils/currency';
import { CardEditSheetBase } from './CardEditSheetBase';

interface EditAnnualFeeSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditAnnualFeeSheet: React.FC<EditAnnualFeeSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();

  const [feeValue, setFeeValue] = useState('');
  
  const updateMutation = useUpdateCard(card?.id || '');

  useEffect(() => {
    if (visible && card) {
      setFeeValue(card.effective_annual_fee?.toString() || '0');
    }
  }, [visible, card]);

  const handleSave = () => {
    const feeNum = parseFloat(feeValue);
    if (!isNaN(feeNum) && feeNum >= 0) {
      updateMutation.mutate({ annual_fee: feeNum }, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  return (
    <CardEditSheetBase visible={visible} onClose={onClose} title="Edit Annual Fee">
      <Text style={[styles.label, { color: colors.textSecondary }]}>Annual Fee (₹)</Text>
      <TextInput
        style={[
          styles.input,
          { 
            color: colors.textPrimary,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            marginBottom: (card?.user_override_annual_fee != null) ? 8 : 24
          }
        ]}
        value={feeValue}
        onChangeText={setFeeValue}
        keyboardType="numeric"
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />
      {card?.user_override_annual_fee != null && card.catalog_annual_fee != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
            💡 Catalog Default: {formatCurrencyIN(card.catalog_annual_fee)}
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
          {updateMutation.isPending ? 'Saving...' : 'Save Fee'}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: tokens.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
