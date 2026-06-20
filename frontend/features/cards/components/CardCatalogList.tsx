import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { Input } from '@/components/ui/Input';
import { CardCatalogResponse } from '../types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface CardCatalogListProps {
  catalog: CardCatalogResponse[];
  onSelect: (card: CardCatalogResponse) => void;
}

/** A small colored dot showing network brand color */
function NetworkDot({ network, isDark }: { network: string; isDark: boolean }) {
  const gradient = getNetworkGradient(network, isDark);
  return (
    <View
      style={[styles.networkDot, { backgroundColor: gradient[0] }]}
    />
  );
}

export const CardCatalogList: React.FC<CardCatalogListProps> = ({ catalog, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const q = searchQuery.toLowerCase();
    return catalog.filter(
      (c) =>
        c.card_name.toLowerCase().includes(q) ||
        c.bank_name.toLowerCase().includes(q) ||
        c.network.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <Input
          placeholder="Search bank, card, or network..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<DynamicIcon name="Search" size={18} color={colors.textMuted} strokeWidth={1.5} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {filteredCatalog.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No cards found. Try a different search.
            </Text>
          </View>
        ) : (
          filteredCatalog.map((card, index) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.7}
              onPress={() => onSelect(card)}
              style={[
                styles.row,
                index < filteredCatalog.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              {/* Network color dot */}
              <NetworkDot network={card.network} isDark={isDark} />

              <View style={styles.rowText}>
                <Text
                  style={[styles.cardName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {card.card_name}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {card.bank_name} · {card.network}
                </Text>
              </View>

              <DynamicIcon name="ChevronRight" size={18} color={colors.borderHighlight} strokeWidth={1.5} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  cardName: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 2,
  },
  meta: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
});
