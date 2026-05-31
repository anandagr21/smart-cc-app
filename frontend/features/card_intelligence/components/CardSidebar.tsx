import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { Search, Filter, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { CardCatalogResponse } from '@/features/cards/types/api';
import { useCoverageSummary } from '../api/cardIntelligenceApi';

interface CardSidebarProps {
  catalog: CardCatalogResponse[];
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({
  catalog,
  selectedCardId,
  onSelectCard,
  isCollapsed,
  onToggleCollapse,
}) => {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const { data: coverageData } = useCoverageSummary();
  const coverageMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (coverageData) {
      coverageData.forEach(c => {
        map[c.card_id] = c.coverage_pct;
      });
    }
    return map;
  }, [coverageData]);

  // Extract unique banks
  const availableBanks = useMemo(() => {
    const banks = new Set<string>();
    catalog.forEach((card) => {
      if (card.bank_name) banks.add(card.bank_name);
    });
    return Array.from(banks).sort();
  }, [catalog]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((card) => {
      const matchesSearch = 
        card.card_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        card.bank_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBank = selectedBanks.size === 0 || selectedBanks.has(card.bank_name);
      
      return matchesSearch && matchesBank;
    });
  }, [catalog, searchQuery, selectedBanks]);

  const toggleBank = (bank: string) => {
    const next = new Set(selectedBanks);
    if (next.has(bank)) {
      next.delete(bank);
    } else {
      next.add(bank);
    }
    setSelectedBanks(next);
  };

  if (isCollapsed) {
    return (
      <View style={[styles.collapsedContainer, { backgroundColor: colors.surfaceElevated, borderRightColor: colors.border }]}>
        <TouchableOpacity style={styles.toggleBtn} onPress={onToggleCollapse}>
          {/* @ts-ignore */}
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.collapsedIconBtn} onPress={onToggleCollapse}>
          {/* @ts-ignore */}
          <Search size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.collapsedIconBtn} onPress={onToggleCollapse}>
          {/* @ts-ignore */}
          <Filter size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderRightColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Card Selection</Text>
        <TouchableOpacity onPress={onToggleCollapse}>
          {/* @ts-ignore */}
          <ChevronLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* @ts-ignore */}
          <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search cards..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[
            styles.filterBtn, 
            { backgroundColor: isFilterExpanded || selectedBanks.size > 0 ? colors.primary + '1A' : colors.background, borderColor: colors.border }
          ]}
          onPress={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          {/* @ts-ignore */}
          <Filter size={16} color={selectedBanks.size > 0 ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isFilterExpanded && (
        <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Filter by Bank</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {availableBanks.map((bank) => {
              const isSelected = selectedBanks.has(bank);
              return (
                <TouchableOpacity
                  key={bank}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => toggleBank(bank)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={true}>
        {filteredCatalog.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No cards found.</Text>
        ) : (
          filteredCatalog.map((card) => {
            const isSelected = card.id === selectedCardId;
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.cardItem,
                  {
                    backgroundColor: isSelected ? colors.primary + '1A' : 'transparent',
                    borderLeftColor: isSelected ? colors.primary : 'transparent',
                  }
                ]}
                onPress={() => onSelectCard(card.id)}
              >
                <View style={styles.cardItemIcon}>
                  {/* @ts-ignore */}
                  <CreditCard size={16} color={isSelected ? colors.primary : colors.textSecondary} />
                </View>
                <View style={styles.cardItemText}>
                  <Text style={[styles.cardItemBank, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {card.bank_name}
                  </Text>
                  <Text style={[styles.cardItemName, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                    {card.card_name}
                  </Text>
                  
                  {/* Coverage Bar */}
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ 
                        height: '100%', 
                        width: `${coverageMap[card.id] || 0}%`, 
                        backgroundColor: (coverageMap[card.id] || 0) > 80 ? colors.success : (coverageMap[card.id] || 0) > 0 ? colors.warning : colors.danger 
                      }} />
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter-SemiBold', color: colors.textSecondary, width: 30, textAlign: 'right' }}>
                      {coverageMap[card.id] || 0}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  collapsedContainer: {
    width: 64,
    height: '100%',
    borderRightWidth: 1,
    alignItems: 'center',
    paddingTop: tokens.spacing.md,
  },
  toggleBtn: {
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  collapsedIconBtn: {
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  filterTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: tokens.spacing.sm,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    marginRight: tokens.spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  listContainer: {
    flex: 1,
  },
  emptyText: {
    padding: tokens.spacing.lg,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderLeftWidth: 3,
  },
  cardItemIcon: {
    marginRight: tokens.spacing.md,
  },
  cardItemText: {
    flex: 1,
  },
  cardItemBank: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardItemName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
});
