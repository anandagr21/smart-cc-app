import React from 'react';
import { View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { Button } from '../../components/ui/Button';
import { CreditCard } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function CardsScreen() {
  return (
    <ScreenContainer className="justify-center items-center">
      <AnimatedContainer delay={100} className="items-center w-full max-w-sm">
        {/* Atmospheric Icon */}
        <View className="w-32 h-32 rounded-full bg-surfaceElevated border border-white/5 items-center justify-center mb-8 shadow-sm shadow-black/10">
          <View className="absolute inset-0 rounded-full bg-accent/5" />
          {/* @ts-ignore */}
          <CreditCard size={48} color={colors.textMuted} strokeWidth={1.5} />
        </View>

        {/* Editorial Typography */}
        <Text className="text-3xl font-bold text-textPrimary text-center mb-4 tracking-tight">
          Your Digital Wallet
        </Text>
        <Text className="text-textSecondary text-center text-lg leading-6 mb-10 px-4">
          Connect your credit cards to unlock AI-powered reward optimization and intelligent spend routing.
        </Text>

        {/* Ghost CTA */}
        <Button 
          label="Add Your First Card" 
          variant="secondary"
          className="w-full"
          onPress={() => {}}
        />
      </AnimatedContainer>
    </ScreenContainer>
  );
}
