import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Search, ChevronRight, PlusCircle } from 'lucide-react-native';
import { CardCatalogResponse } from '../types/api';
import { colors } from '../../../theme/colors';

interface CardCatalogListProps {
  catalog: CardCatalogResponse[];
  onSelect: (card: CardCatalogResponse) => void;
}

export const CardCatalogList: React.FC<CardCatalogListProps> = ({ catalog, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const query = searchQuery.toLowerCase();
    return catalog.filter(
      (c) => 
        c.card_name.toLowerCase().includes(query) || 
        c.bank_name.toLowerCase().includes(query) ||
        c.network.toLowerCase().includes(query)
    );
  }, [catalog, searchQuery]);

  return (
    <View className="flex-1">
      {/* Search Bar */}
      <View className="px-6 pb-4">
        <View className="flex-row items-center bg-surface border border-white/10 rounded-2xl px-4 py-3 shadow-sm">
          {/* @ts-ignore */}
          <Search size={20} color={colors.textMuted} />
          <TextInput
            className="flex-1 text-textPrimary text-base ml-3"
            placeholder="Search bank, card name, or network..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredCatalog.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-textSecondary text-base">No cards found in catalog.</Text>
          </View>
        ) : (
          filteredCatalog.map((card, index) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.7}
              onPress={() => onSelect(card)}
              className={`flex-row items-center py-4 ${index !== filteredCatalog.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <View className="w-10 h-10 rounded-full bg-surfaceElevated items-center justify-center border border-white/5 mr-4">
                {/* @ts-ignore */}
                <PlusCircle size={20} color={colors.accent} />
              </View>
              <View className="flex-1 pr-4">
                <Text className="text-textPrimary font-semibold text-base mb-1" numberOfLines={1}>
                  {card.card_name}
                </Text>
                <Text className="text-textMuted text-xs uppercase tracking-wider">
                  {card.bank_name} • {card.network}
                </Text>
              </View>
              {/* @ts-ignore */}
              <ChevronRight size={20} color={colors.borderHighlight} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};
