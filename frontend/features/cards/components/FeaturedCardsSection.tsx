import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { UserCardResponse } from '../../cards/types/api';
import { FeaturedWalletCard } from './FeaturedWalletCard';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';

interface FeaturedCardsSectionProps {
  cards: UserCardResponse[];
  onSelectCard: (card: UserCardResponse) => void;
}

export const FeaturedCardsSection: React.FC<FeaturedCardsSectionProps> = ({ cards, onSelectCard }) => {
  const colors = useThemeColors();

  // Derive the top 2-3 featured cards
  const featuredCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    // Prioritize active cards
    const activeCards = cards.filter(c => c.is_active);
    
    // Sort by fee waiver progress (closest to achieving)
    const sortedByWaiver = [...activeCards].sort((a, b) => {
      const aWaiver = a.fee_waiver_progress_percent || 0;
      const bWaiver = b.fee_waiver_progress_percent || 0;
      return bWaiver - aWaiver;
    });

    // If we have some, return top 3. Otherwise return empty.
    return sortedByWaiver.slice(0, 3);
  }, [cards]);

  if (featuredCards.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          {/* @ts-ignore */}
          <Sparkles size={16} color={colors.primary} />
          <Text style={[styles.titleText, { color: colors.textSecondary }]}>FEATURED FOR YOU</Text>
        </View>
        <View style={styles.viewAllWrap}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
          {/* @ts-ignore */}
          <ChevronRight size={14} color={colors.primary} />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={220 + 16} // card width + margin
      >
        {featuredCards.map(card => (
          <FeaturedWalletCard 
            key={card.id} 
            card={card} 
            onPress={() => onSelectCard(card)} 
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  viewAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
