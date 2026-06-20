import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useFormContext, Controller } from 'react-hook-form';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { WalletListRow } from '../WalletListRow';
import { ScrollView, TouchableOpacity } from 'react-native';

const OVERRIDE_REASONS = [
  { label: 'Personal preference', value: 'Personal preference' },
  { label: 'Building milestone', value: 'Building milestone' },
  { label: 'Simplifying wallet', value: 'Simplifying wallet' },
  { label: 'Avoiding annual fee', value: 'Avoiding annual fee' },
  { label: 'Temporary choice', value: 'Temporary choice' }
];

interface CardSelectorProps {
  groupedActive: Record<string, any[]>;
  inactiveCards: any[];
  rankedCards: any[];
  selectedCardId: string;
  isOverride: boolean;
  triggerHaptic: (type: 'selection') => void;
}

export const CardSelector: React.FC<CardSelectorProps> = ({
  groupedActive,
  inactiveCards,
  rankedCards,
  selectedCardId,
  isOverride,
  triggerHaptic
}) => {
  const colors = useThemeColors();
  const { control, setValue, formState: { errors } } = useFormContext<any>();

  return (
    <View style={styles.walletSection}>
      <View style={styles.walletHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your Wallet</Text>
        {errors.user_card_id?.message && (
          <Text style={[styles.errorText, { color: colors.danger, marginTop: 0 }]}>
            {errors.user_card_id.message as string}
          </Text>
        )}
      </View>

      <View style={styles.walletList}>
        {Object.entries(groupedActive).map(([bank, cards]) => (
          <View key={bank} style={styles.bankGroup}>
            <Text style={[styles.bankGroupTitle, { color: colors.textMuted }]}>{bank}</Text>
            {cards.map(card => {
              const recommendation = rankedCards.find(rc => rc.card_name === card.card_details?.card_name || rc.card_name === card.nickname);
              return (
                <WalletListRow
                  key={card.id}
                  card={card}
                  isActive={selectedCardId === card.id}
                  onPress={(id) => {
                    triggerHaptic('selection');
                    setValue('user_card_id', id);
                  }}
                  recommendation={recommendation}
                />
              );
            })}
          </View>
        ))}
        
        {inactiveCards.length > 0 && (
          <View style={styles.bankGroup}>
            <Text style={[styles.bankGroupTitle, { color: colors.textMuted, marginTop: 8 }]}>UNAVAILABLE CARDS</Text>
            {inactiveCards.map(card => (
              <WalletListRow
                key={card.id}
                card={card}
                isActive={selectedCardId === card.id}
                onPress={() => {
                  console.log('This card is inactive and unavailable for recommendations.');
                }}
              />
            ))}
          </View>
        )}

        {Object.keys(groupedActive).length === 0 && inactiveCards.length === 0 && (
          <Text style={[styles.emptySearch, { color: colors.textMuted }]}>No cards found.</Text>
        )}
      </View>

      {/* OVERRIDE REASON UX */}
      {isOverride && (
        <Animated.View entering={FadeInUp.springify()} exiting={FadeOut} style={styles.overrideSection}>
          <Text style={[styles.overrideTitle, { color: colors.textMuted }]}>Optional context for this selection</Text>
          <Controller
            control={control}
            name="override_reason"
            render={({ field: { onChange, value } }) => (
              <View style={styles.overrideChipWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overrideScroll}>
                  {OVERRIDE_REASONS.map(reason => {
                    const isActive = value === reason.value;
                    return (
                      <TouchableOpacity
                        key={reason.value}
                        onPress={() => onChange(isActive ? undefined : reason.value)}
                        style={[
                          styles.overrideChip,
                          { backgroundColor: isActive ? colors.surfaceElevated : colors.background },
                          isActive && { borderColor: colors.primary, borderWidth: 1 }
                        ]}
                      >
                        <Text style={[styles.overrideChipText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                          {reason.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  walletSection: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginLeft: 2,
  },
  walletList: {
    gap: 16,
  },
  bankGroup: {
    gap: 8,
  },
  bankGroupTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginLeft: 4,
    marginBottom: 4,
  },
  emptySearch: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: tokens.fontSize.body,
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
  },
  overrideSection: {
    marginBottom: 24,
    marginTop: 16,
  },
  overrideTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 8,
    marginLeft: 2,
  },
  overrideChipWrap: {
    marginHorizontal: -24,
  },
  overrideScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  overrideChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  overrideChipText: {
    fontSize: tokens.fontSize.caption,
  },
});
