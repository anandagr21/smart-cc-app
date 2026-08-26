import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Badge } from '@/components/ui/Badge';
import { useCards } from '@/features/cards/hooks/useCards';
import { EmptyWalletState } from '@/features/cards/components/EmptyWalletState';
import { WalletCardSkeleton } from '@/features/cards/components/WalletCardSkeleton';
import { AddCardSheet } from '@/features/cards/components/AddCardSheet';
import { CardDetailSheet } from '@/features/cards/components/CardDetailSheet';
import { FeaturedCardsSection } from '@/features/cards/components/FeaturedCardsSection';
import { SmartWalletInventory } from '@/features/cards/components/SmartWalletInventory';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useFuseSearch } from '@/shared/search/useFuseSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function CardsScreen() {
  const router = useRouter();
  const { data: cards, isLoading, refetch } = useCards();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const [isSheetVisible, setSheetVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const colors = useThemeColors();
  const isDark = colors.isDark;
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
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DynamicIcon name="Search" size={17} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search cards, banks, networks..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <DynamicIcon name="X" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, marginLeft: 4 }]}>
            YOUR CARDS ({filteredCards.length})
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(40).springify()}
        style={styles.header}
      >
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Wallet</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {cardCount > 0 ? `${cardCount} Cards` : 'Add your first card'}
          </Text>
        </View>

        <TouchableOpacity
          testID="add-card-button"
          accessibilityLabel="Add Card"
          onPress={() => setSheetVisible(true)}
          style={[
            styles.addBtn,
            { backgroundColor: '#7C3AED' },
          ]}
          activeOpacity={0.8}
        >
          <DynamicIcon name="Plus" size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add Card</Text>
        </TouchableOpacity>
      </Animated.View>

      {isLoading ? (
        <WalletCardSkeleton />
      ) : cards && cards.length > 0 ? (
        <View style={styles.inventoryContainer}>
          <SmartWalletInventory 
            cards={filteredCards} 
            ListHeaderComponent={renderHeaderComponent()} 
            onSelectCard={(card) => setSelectedCardId(card.id)}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </View>
      ) : (
        <EmptyWalletState onAddCard={() => setSheetVisible(true)} />
      )}

      <AddCardSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
      />

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
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.2,
  },
  inventoryContainer: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    fontSize: tokens.fontSize.bodySm,
    height: '100%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.2,
  },
});
