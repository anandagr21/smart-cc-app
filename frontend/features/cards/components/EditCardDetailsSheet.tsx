import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { UserCardResponse } from '../types/api';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { CardEditSheetBase } from './CardEditSheetBase';

interface EditCardDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  card: UserCardResponse | null;
}

export const EditCardDetailsSheet: React.FC<EditCardDetailsSheetProps> = ({ visible, onClose, card }) => {
  const colors = useThemeColors();

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
    <CardEditSheetBase visible={visible} onClose={onClose} title="Edit Card Details">
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
    </CardEditSheetBase>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
  },
  inputWrap: {
    marginBottom: 24,
  },
  actionRow: {
    marginTop: 24,
    paddingBottom: 40,
  },
  saveBtn: {
    width: '100%',
  },
});
