import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { WalletListRow } from '../WalletListRow';
import { DynamicIcon } from '@/components/DynamicIcon';

interface CardSelectorProps {
  groupedActive: Record<string, any[]>;
  inactiveCards: any[];
  rankedCards: any[];
  selectedCardId: string;
  triggerHaptic: (type: 'selection') => void;
}

export const CardSelector: React.FC<CardSelectorProps> = ({
  groupedActive,
  inactiveCards,
  rankedCards,
  selectedCardId,
  triggerHaptic
}) => {
  const colors = useThemeColors();
  const { setValue, formState: { errors } } = useFormContext<any>();

  return (
    <View style={styles.walletSection}>
      <View style={styles.walletHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your Wallet</Text>
        {errors.user_card_id?.message && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {errors.user_card_id.message as string}
          </Text>
        )}
      </View>

      <View style={styles.walletList}>
        {Object.entries(groupedActive).map(([bank, cards]) => (
          <View key={bank} style={styles.bankGroup}>
            <Text style={[styles.bankGroupTitle, { color: colors.textMuted }]}>{bank}</Text>
            <View>
              {cards.map(card => {
                const recommendation = rankedCards.find(rc => rc.card_name === card.card_details?.card_name || rc.card_name === card.nickname);
                return (
                  <View key={card.id}>
                    <WalletListRow
                      card={card}
                      isActive={selectedCardId === card.id}
                      onPress={(id) => {
                        triggerHaptic('selection');
                        setValue('user_card_id', id);
                      }}
                      recommendation={recommendation}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        
        {inactiveCards.length > 0 && (
          <View style={styles.bankGroup}>
            <Text style={[styles.bankGroupTitle, { color: colors.textMuted, marginTop: 8 }]}>UNAVAILABLE CARDS</Text>
            <View>
              {inactiveCards.map(card => (
                <View key={card.id}>
                  <WalletListRow
                    card={card}
                    isActive={selectedCardId === card.id}
                    onPress={() => {
                      console.log('This card is inactive and unavailable for recommendations.');
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {Object.keys(groupedActive).length === 0 && inactiveCards.length === 0 && (
          <Animated.View entering={FadeIn} style={[styles.emptyState, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceElevated }]}>
              <DynamicIcon name="Wallet" size={24} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No cards found</Text>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              Try adjusting your search query.
            </Text>
          </Animated.View>
        )}
      </View>
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
    gap: 24,
  },
  bankGroup: {
    gap: 8,
  },
  bankGroupTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginLeft: 16,
    marginBottom: 4,
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
    marginTop: 0,
  },
});
