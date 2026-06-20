import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';
import { DynamicIcon } from '@/components/DynamicIcon';
import { CardEditSheetBase } from './CardEditSheetBase';

interface EditFeeCycleSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditFeeCycleSheet: React.FC<EditFeeCycleSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();
  const [dateValue, setDateValue] = useState('');

  const updateMutation = useUpdateCard(card?.id || '');

  useEffect(() => {
    if (visible && card) {
      const rawDate = card.annual_fee_debit_date || card.fee_cycle_start_date?.split('T')[0];
      if (rawDate) {
        setDateValue(rawDate.split('-').reverse().join('/'));
      } else {
        setDateValue('');
      }
    }
  }, [visible, card]);

  if (!visible || !card) return null;

  const handleSave = () => {
    // allow DD/MM/YYYY or DD-MM-YYYY
    const datePattern = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/;
    const match = dateValue.match(datePattern);

    if (!match) {
      Alert.alert('Invalid Date', 'Please use DD/MM/YYYY format.');
      return;
    }

    const [_, day, month, year] = match;
    const apiDate = `${year}-${month}-${day}`;

    updateMutation.mutate({ annual_fee_debit_date: apiDate }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const handleDateChange = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');

    // Format as DD/MM/YYYY
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }

    setDateValue(formatted);
  };

  return (
    <CardEditSheetBase visible={visible} onClose={onClose} title="Edit Fee Debit Date">
      <Text style={[styles.label, { color: colors.textSecondary }]}>Next annual fee expected (DD/MM/YYYY)</Text>

      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border
        }
      ]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary }
          ]}
          value={dateValue}
          onChangeText={handleDateChange}
          keyboardType="numeric"
          maxLength={10}
          placeholder="12/03/2026"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
        <DynamicIcon name="Calendar" size={20} color={colors.textSecondary} style={{ marginRight: 16 }} />
      </View>

      <View style={styles.infoBox}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Used to estimate waiver timelines and long-term portfolio value.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          { opacity: updateMutation.isPending ? 0.7 : 1 }
        ]}
        onPress={handleSave}
        disabled={updateMutation.isPending}
      >
        <Text style={styles.saveBtnText}>
          {updateMutation.isPending ? 'Saving...' : 'Save Date'}
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
  inputWrapper: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  infoBox: {
    marginBottom: 24,
  },
  infoText: {
    fontSize: tokens.fontSize.caption,
    lineHeight: 18,
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
