import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { UserCardResponse } from '../../cards/types/api';
import { WalletInventoryRow } from './WalletInventoryRow';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { FeatureFlags } from '../../../config/features';

interface SmartWalletInventoryProps {
  cards: UserCardResponse[];
  ListHeaderComponent?: React.ReactElement | null;
  onSelectCard: (card: UserCardResponse) => void;
}

export const SmartWalletInventory: React.FC<SmartWalletInventoryProps> = ({ cards, ListHeaderComponent, onSelectCard }) => {
  const colors = useThemeColors();
  const isGroupingEnabled = FeatureFlags.wallet?.bank_grouping?.enabled ?? false;

  const data = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    if (!isGroupingEnabled) {
      return cards;
    }

    // Bank Grouping Logic
    const grouped = cards.reduce((acc, card) => {
      const bank = card.card_details?.bank_name || 'Other';
      if (!acc[bank]) {
        acc[bank] = { bank, cards: [], totalSpend: 0, nearWaiverCount: 0 };
      }
      acc[bank].cards.push(card);
      acc[bank].totalSpend += card.annual_spend || 0;
      
      const waiverPercent = card.fee_waiver_progress_percent || 0;
      if (waiverPercent >= 75 && waiverPercent < 100) {
        acc[bank].nearWaiverCount += 1;
      }
      
      return acc;
    }, {} as Record<string, { bank: string, cards: UserCardResponse[], totalSpend: number, nearWaiverCount: number }>);

    // Flatten into a structure suitable for FlashList (headers + items)
    const flattened: any[] = [];
    Object.values(grouped).forEach(group => {
      flattened.push({ type: 'header', ...group });
      group.cards.forEach(card => {
        flattened.push({ type: 'card', card });
      });
    });

    return flattened;
  }, [cards, isGroupingEnabled]);

  const renderItem = ({ item }: { item: any }) => {
    if (!isGroupingEnabled) {
      return <WalletInventoryRow card={item} onPress={() => onSelectCard(item)} />;
    }

    if (item.type === 'header') {
      const totalSpendFormatted = item.totalSpend >= 100000 
        ? `₹${(item.totalSpend / 100000).toFixed(1)}L` 
        : `₹${(item.totalSpend / 1000).toFixed(0)}k`;

      return (
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderLeft}>
            <Text style={[styles.bankNameText, { color: colors.textSecondary }]}>
              {item.bank.toUpperCase()} • {item.cards.length} {item.cards.length === 1 ? 'Card' : 'Cards'}
            </Text>
          </View>
          <View style={styles.groupHeaderRight}>
            <Text style={[styles.bankInsightText, { color: colors.textMuted }]}>
              {totalSpendFormatted} spend
              {item.nearWaiverCount > 0 && ` • ${item.nearWaiverCount} near waiver`}
            </Text>
          </View>
        </View>
      );
    }

    return <WalletInventoryRow card={item.card} onPress={() => onSelectCard(item.card)} />;
  };

  if (data.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No cards found.</Text>
      </View>
    );
  }

  const TypedFlashList = FlashList as any;

  return (
    <View style={styles.container}>
      <TypedFlashList
        data={data}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        keyExtractor={(item: any, index: number) => {
          if (!isGroupingEnabled) return item.id;
          return item.type === 'header' ? `header-${item.bank}` : `card-${item.card.id}`;
        }}
        estimatedItemSize={76} // estimated height of WalletInventoryRow
        getItemType={(item: any) => (!isGroupingEnabled ? 'card' : item.type)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // safe area for bottom tabs
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400, // Important for FlashList when nested inside a ScrollView, but here it's likely filling available space
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  groupHeaderLeft: {},
  bankNameText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  groupHeaderRight: {},
  bankInsightText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.medium,
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
  },
});
