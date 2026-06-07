import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { UserCardResponse } from '../types/api';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';

interface EditCardDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditCardDetailsSheet: React.FC<EditCardDetailsSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const [nickname, setNickname] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [networkOverride, setNetworkOverride] = useState('');
  
  const { mutateAsync: updateCard, isPending } = useUpdateCard(card?.id || '');

  useEffect(() => {
    if (visible && card) {
      setNickname(card.nickname || '');
      setLast4Digits(card.last_4_digits || '');
      setNetworkOverride(card.network_override || '');
    }
  }, [visible, card]);

  if (!card) return null;

  const handleSave = async () => {
    try {
      await updateCard({
        nickname: nickname.trim() || undefined,
        last_4_digits: last4Digits.trim() || undefined,
        network_override: networkOverride || undefined,
      });
      onClose();
    } catch {
      // error handled by hook
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
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
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Edit Card Details
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.inputWrap}>
              <Input
                label="Card Nickname (Optional)"
                placeholder="e.g. Travel Rewards"
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="words"
                hint="A friendly name to identify this card"
              />
            </View>

            <View style={styles.inputWrap}>
              <Input
                label="Last 4 Digits (Optional)"
                placeholder="e.g. 1234"
                value={last4Digits}
                onChangeText={setLast4Digits}
                keyboardType="numeric"
                maxLength={4}
                hint="Helps differentiate between multiple cards of the same type"
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={{ fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.bold, color: colors.textMuted, marginBottom: 8, letterSpacing: tokens.letterSpacing.widest }}>CARD NETWORK</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS CLUB'].map((net) => {
                  const isActive = networkOverride === net || (!networkOverride && card.card_details?.network?.toUpperCase() === net);
                  return (
                    <TouchableOpacity
                      key={net}
                      onPress={() => setNetworkOverride(net)}
                      style={[
                        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                        isActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }
                      ]}
                    >
                      <Text style={{ fontSize: tokens.fontSize.micro, color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium }}>{net}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                label="Save Changes"
                onPress={handleSave}
                isLoading={isPending}
                style={styles.saveBtn}
              />
            </View>
          </View>
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
    height: '60%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
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
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  inputWrap: {
    marginBottom: 24,
  },
  actionRow: {
    marginTop: 'auto',
    paddingBottom: 40,
  },
  saveBtn: {
    width: '100%',
  },
});
