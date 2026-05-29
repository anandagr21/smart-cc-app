import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { UserCardResponse } from '../types/api';

interface EditSpendSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditSpendSheet: React.FC<EditSpendSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={95}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
              },
            ]}
          />
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Waiver Progress</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
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
