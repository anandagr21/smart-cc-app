import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useCards } from '../../features/cards/hooks/useCards';
import { EmptyWalletState } from '../../features/cards/components/EmptyWalletState';
import { WalletCard } from '../../features/cards/components/WalletCard';
import { WalletCardSkeleton } from '../../features/cards/components/WalletCardSkeleton';
import { AddCardSheet } from '../../features/cards/components/AddCardSheet';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { colors } from '../../theme/colors';

export default function CardsScreen() {
  const { data: cards, isLoading } = useCards();
  const [isSheetVisible, setSheetVisible] = useState(false);

  return (
    <ScreenContainer>
      <View className="flex-row justify-between items-end mb-6 mt-4">
        <AnimatedContainer delay={100}>
          <Text className="text-3xl font-bold text-textPrimary tracking-tight">Wallet</Text>
          <Text className="text-textSecondary text-sm font-medium mt-1">Manage your active cards</Text>
        </AnimatedContainer>
        
        {/* Header Add Button */}
        {cards && cards.length > 0 && (
          <AnimatedContainer delay={200}>
            <TouchableOpacity 
              onPress={() => setSheetVisible(true)}
              className="bg-accent/20 p-2.5 rounded-full border border-accent/30 shadow-sm shadow-accent/10"
            >
              {/* @ts-ignore */}
              <Plus size={24} color={colors.accent} strokeWidth={2.5} />
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
          contentContainerStyle={{ paddingBottom: 40 }}
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
