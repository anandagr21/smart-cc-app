import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { UserCardResponse } from '@/features/cards/types/api';
import { FeaturedWalletCard } from './FeaturedWalletCard';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useSpendInsights } from '@/features/insights/hooks/useSpendInsights';

interface FeaturedCardsSectionProps {
  cards: UserCardResponse[];
  onSelectCard: (card: UserCardResponse) => void;
}

export const FeaturedCardsSection: React.FC<FeaturedCardsSectionProps> = ({ cards, onSelectCard }) => {
  const colors = useThemeColors();
  const { insights } = useSpendInsights();

  // Derive the top featured cards based on insights
  const featuredCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];

    // Get all cards that have a specific high/medium priority insight
    const cardsWithInsights = cards.filter(c =>
      insights.some(i => i.related_card_id === c.id && (i.priority === 'HIGH' || i.priority === 'MEDIUM' || i.priority === 'URGENT'))
    );

    // If not enough insights, fallback to highest spend / active cards
    if (cardsWithInsights.length < 3) {
      const activeCards = cards.filter(c => c.card_status === 'ACTIVE' && !cardsWithInsights.some(ci => ci.id === c.id));
      const sortedBySpend = [...activeCards].sort((a, b) => b.annual_spend - a.annual_spend);
      cardsWithInsights.push(...sortedBySpend.slice(0, 3 - cardsWithInsights.length));
    }

    return cardsWithInsights.slice(0, 3);
  }, [cards, insights]);

  if (featuredCards.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          {/* @ts-ignore */}
          <Sparkles size={16} color={colors.primary} />
          <Text style={[styles.titleText, { color: colors.textSecondary }]}>FEATURED FOR YOU</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={240 + 22} // updated card width + gap
      >
        {featuredCards.map(card => {
          const insight = insights.find(i => i.related_card_id === card.id);
          return (
            <FeaturedWalletCard
              key={card.id}
              card={card}
              insight={insight}
              onPress={() => onSelectCard(card)}
            />
          );
        })}
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
    marginBottom: 8, // Reduced to balance the new paddingTop
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16, // Added to prevent ambientGlow clipping at the top
    gap: 22,
  },
});
