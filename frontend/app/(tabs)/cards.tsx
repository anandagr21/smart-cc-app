import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Badge } from '../../components/ui/Badge';
import { useCards } from '../../features/cards/hooks/useCards';
import { EmptyWalletState } from '../../features/cards/components/EmptyWalletState';
import { WalletCard } from '../../features/cards/components/WalletCard';
import { WalletCardSkeleton } from '../../features/cards/components/WalletCardSkeleton';
import { AddCardSheet } from '../../features/cards/components/AddCardSheet';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';

export default function CardsScreen() {
  const { data: cards, isLoading } = useCards();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const colors = useThemeColors();
  const cardCount = cards?.length ?? 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.header}
      >
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Wallet</Text>
            {cardCount > 0 && (
              <Badge label={`${cardCount} card${cardCount !== 1 ? 's' : ''}`} variant="primary" size="md" />
            )}
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your active cards
          </Text>
        </View>

        {cards && cards.length > 0 && (
          <TouchableOpacity
            testID="add-card-button"
            accessibilityLabel="Add Card"
            onPress={() => setSheetVisible(true)}
            style={[
              styles.addBtn,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
                borderWidth: 1,
              },
            ]}
            activeOpacity={0.75}
          >
            {/* @ts-ignore */}
            <Plus size={20} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <WalletCardSkeleton />
        </ScrollView>
      ) : cards && cards.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {cards.map((card, index) => (
            <WalletCard key={card.id} card={card} index={index} />
          ))}
        </ScrollView>
      ) : (
        <EmptyWalletState onAddCard={() => setSheetVisible(true)} />
      )}

      <AddCardSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
  },
  subtitle: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 140,
  },
});
