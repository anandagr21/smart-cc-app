import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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

/** A mini card block showing network brand color */
function NetworkMiniCard({ network, isDark }: { network: string; isDark: boolean }) {
  const gradient = getNetworkGradient(network, isDark) as [string, string];
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.networkMiniCard}
    >
      <View style={styles.networkMiniCardTopEdge} />
      <DynamicIcon name="CreditCard" size={14} color="rgba(255,255,255,0.6)" />
    </LinearGradient>
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

  const groupedCatalog = useMemo(() => {
    // Normalize inconsistent bank names from catalog data
    const normalizeBankName = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.includes('sbi') || lower.includes('state bank')) return 'SBI Card';
      // Add more normalizations here as needed
      return name;
    };

    const seen = new Set<string>();
    const sorted = [...filteredCatalog].sort((a, b) => a.card_name.localeCompare(b.card_name));
    const groups: Record<string, CardCatalogResponse[]> = {};
    for (const card of sorted) {
      const bank = normalizeBankName(card.bank_name);
      // Deduplicate: skip cards with same (bank, card_name) already added
      const dedupeKey = `${bank}::${card.card_name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (!groups[bank]) groups[bank] = [];
      groups[bank].push(card);
    }
    return Object.keys(groups).sort().map(bank => ({
      bank,
      cards: groups[bank]
    }));
  }, [filteredCatalog]);

  const [isReady, setIsReady] = useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.searchContainer}>
        <View style={styles.searchShadowLayer} />
        <Input
          placeholder="Search bank, card, or network..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<DynamicIcon name="Search" size={18} color={colors.textMuted} strokeWidth={1.5} />}
          style={[styles.searchInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.glassBorder }]}
        />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {!isReady ? (
          <View style={{ paddingVertical: 64, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredCatalog.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyWrap}>
            <DynamicIcon name="SearchX" size={48} color={colors.borderHighlight} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No cards found.
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              Try searching by a different bank or network.
            </Text>
          </Animated.View>
        ) : (
          groupedCatalog.map((group, sectionIndex) => (
            <Animated.View 
              key={group.bank} 
              entering={FadeInUp.duration(400).delay(150 + sectionIndex * 50)}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <DynamicIcon name="Building2" size={14} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{group.bank}</Text>
              </View>

              <View style={[styles.cardGroupContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.glassBorder }]}>
                {group.cards.map((card, index) => (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.7}
                    onPress={() => onSelect(card)}
                    style={[
                      styles.row,
                      index < group.cards.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <NetworkMiniCard network={card.network} isDark={isDark} />

                    <View style={styles.rowText}>
                      <Text
                        style={[styles.cardName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {card.card_name}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        {card.network}
                      </Text>
                    </View>

                    <View style={[styles.chevronWrap, { backgroundColor: colors.surface }]}>
                      <DynamicIcon name="ChevronRight" size={14} color={colors.textMuted} strokeWidth={2} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  searchShadowLayer: {
    position: 'absolute',
    top: 8,
    left: 32,
    right: 32,
    bottom: 24,
    backgroundColor: '#000',
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: {
    marginBottom: 0,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  cardGroupContainer: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 16,
  },
  networkMiniCard: {
    width: 44,
    height: 28,
    borderRadius: 6,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkMiniCardTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rowText: { flex: 1, justifyContent: 'center' },
  cardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 2,
    letterSpacing: tokens.letterSpacing.tight,
  },
  meta: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    textAlign: 'center',
  },
});
