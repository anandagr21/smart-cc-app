import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Badge } from '../../components/ui/Badge';
import { useCards } from '../../features/cards/hooks/useCards';
import { EmptyWalletState } from '../../features/cards/components/EmptyWalletState';
import { WalletCardSkeleton } from '../../features/cards/components/WalletCardSkeleton';
import { AddCardSheet } from '../../features/cards/components/AddCardSheet';
import { CardDetailSheet } from '../../features/cards/components/CardDetailSheet';
import { FeaturedCardsSection } from '../../features/cards/components/FeaturedCardsSection';
import { SmartWalletInventory } from '../../features/cards/components/SmartWalletInventory';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';
import { useFuseSearch } from '../../shared/search/useFuseSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { UserCardResponse } from '../../features/cards/types/api';

export default function CardsScreen() {
  const { data: cards, isLoading } = useCards();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const colors = useThemeColors();
  const cardCount = cards?.length ?? 0;
  
  const selectedCard = cards?.find(c => c.id === selectedCardId) || null;

  // Search Logic
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { results: filteredCards } = useFuseSearch({
    items: cards || [],
    query: debouncedSearch,
    keys: [
      { name: 'card_details.card_name', weight: 0.7 },
      { name: 'nickname', weight: 0.7 },
      { name: 'card_details.bank_name', weight: 0.3 },
      { name: 'card_details.network', weight: 0.2 },
    ],
    threshold: 0.3,
  });

  const renderHeaderComponent = () => {
    return (
      <View>
        <FeaturedCardsSection cards={cards || []} onSelectCard={(card) => setSelectedCardId(card.id)} />
        
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            {/* @ts-ignore */}
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search cards by name, bank or network..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {/* @ts-ignore */}
            <SlidersHorizontal size={18} color={colors.textMuted} />
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24, marginBottom: -8, marginLeft: 24 }]}>
            YOUR WALLET
          </Text>
        </View>
      </View>
    );
  };

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
              <Badge label={`${cardCount} CARDS`} variant="primary" size="md" />
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
        <WalletCardSkeleton />
      ) : cards && cards.length > 0 ? (
        <View style={styles.inventoryContainer}>
          <SmartWalletInventory 
            cards={filteredCards} 
            ListHeaderComponent={renderHeaderComponent()} 
            onSelectCard={(card) => setSelectedCardId(card.id)}
          />
        </View>
      ) : (
        <EmptyWalletState onAddCard={() => setSheetVisible(true)} />
      )}

      <AddCardSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
      />

      {/* Card Detail Intelligence Sheet Placeholder */}
      <CardDetailSheet 
        card={selectedCard} 
        onClose={() => setSelectedCardId(null)} 
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
    marginBottom: 24,
    paddingHorizontal: 24,
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
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryContainer: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: tokens.fontSize.body,
    height: '100%',
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
  },
});
