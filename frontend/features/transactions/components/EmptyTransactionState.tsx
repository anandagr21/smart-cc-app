import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, Plus } from 'lucide-react-native';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';

interface EmptyTransactionStateProps {
  onAddPress: () => void;
}

export function EmptyTransactionState({ onAddPress }: EmptyTransactionStateProps) {
  return (
    <View className="flex-1 justify-center items-center px-4">
      <AnimatedContainer delay={100} className="items-center w-full max-w-sm">
        {/* Atmospheric Icon */}
        <View className="w-32 h-32 rounded-full bg-surfaceElevated border border-white/5 items-center justify-center mb-8 shadow-sm shadow-black/10">
          <View className="absolute inset-0 rounded-full bg-accent/5" />
          <Clock size={48} color="#888" strokeWidth={1.5} />
        </View>

        {/* Editorial Typography */}
        <Text className="text-3xl font-bold text-textPrimary text-center mb-4 tracking-tight">
          No Activity Yet
        </Text>
        <Text className="text-textSecondary text-center text-lg leading-6 px-4 mb-8">
          Your optimized transactions and captured rewards will appear here once you begin analyzing purchases.
        </Text>

        <Pressable
          onPress={onAddPress}
          className="bg-accent/20 border border-accent/30 flex-row items-center justify-center px-6 py-4 rounded-full active:bg-accent/30"
        >
          <Plus size={20} color="#cba766" className="mr-2" />
          <Text className="text-accent font-bold text-lg">Add Transaction</Text>
        </Pressable>
      </AnimatedContainer>
    </View>
  );
}
