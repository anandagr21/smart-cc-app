import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useCards } from '../../features/cards/hooks/useCards';
import { EmptyWalletState } from '../../features/cards/components/EmptyWalletState';
import { WalletCard } from '../../features/cards/components/WalletCard';
import { WalletCardSkeleton } from '../../features/cards/components/WalletCardSkeleton';
import { AddCardSheet } from '../../features/cards/components/AddCardSheet';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';

export default function CardsScreen() {
  const { data: cards, isLoading } = useCards();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const colors = useThemeColors();

  return (
    <ScreenContainer>
      <View className="flex-row justify-between items-end mb-8 mt-4">
        <AnimatedContainer delay={100}>
          <Text style={{ color: colors.textPrimary }} className="text-4xl font-bold tracking-tight">Wallet</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mt-1 uppercase tracking-widest">Manage your active cards</Text>
        </AnimatedContainer>
        
        {/* Header Add Button */}
        {cards && cards.length > 0 && (
          <AnimatedContainer delay={200}>
            <TouchableOpacity 
              onPress={() => setSheetVisible(true)}
              style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, borderWidth: StyleSheet.hairlineWidth }}
              className="p-3 rounded-full shadow-sm"
            >
              {/* @ts-ignore */}
              <Plus size={24} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </AnimatedContainer>
        )}
      </View>

      {isLoading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <WalletCardSkeleton />
        </ScrollView>
      ) : cards && cards.length > 0 ? (
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} // Extra padding for floating tab bar
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
