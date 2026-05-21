import React, { useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { RecommendationForm } from '../../features/recommendations/components/RecommendationForm';
import { RecommendationSkeleton } from '../../features/recommendations/components/RecommendationSkeleton';
import { RecommendationCard } from '../../features/recommendations/components/RecommendationCard';
import { useRecommendation } from '../../features/recommendations/hooks/useRecommendation';
import { AlertCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { RecommendationRequest } from '../../features/recommendations/types/api';

export default function RecommendationsScreen() {
  const { 
    mutate: evaluateTransaction, 
    data, 
    isPending, 
    isError, 
    error 
  } = useRecommendation();

  const scrollViewRef = useRef<ScrollView>(null);

  const handleSubmit = (formData: RecommendationRequest) => {
    evaluateTransaction(formData, {
      onSuccess: () => {
        // Scroll slightly down to focus on results, smooth UX
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 150, animated: true });
        }, 100);
      }
    });
  };

  return (
    <ScreenContainer>
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <AnimatedContainer delay={100} className="mt-8 mb-10">
          <Text className="text-5xl font-bold text-textPrimary tracking-tighter">Optimize</Text>
          <Text className="text-textSecondary text-lg mt-3 leading-6 font-medium">
            Let our engine analyze your purchase to find the maximum reward value.
          </Text>
        </AnimatedContainer>

        {/* Input Form */}
        <RecommendationForm onSubmit={handleSubmit} isLoading={isPending} />

        {/* Error State */}
        {isError && (
          <AnimatedContainer delay={50}>
            <View className="bg-danger/10 border border-danger/20 p-5 rounded-2xl flex-row items-center mb-8 shadow-sm shadow-danger/5">
              {/* @ts-ignore */}
              <AlertCircle size={28} color={colors.danger} />
              <View className="ml-4 flex-1">
                <Text className="text-danger font-bold text-lg tracking-tight">Analysis Failed</Text>
                <Text className="text-danger/90 text-sm mt-1 leading-5">
                  {error?.response?.data?.detail || 'An unexpected error occurred connecting to the engine.'}
                </Text>
              </View>
            </View>
          </AnimatedContainer>
        )}

        {/* Loading State */}
        {isPending && <RecommendationSkeleton />}

        {/* Results State */}
        {!isPending && data && data.ranked_cards.length > 0 && (
          <View className="mt-6">
            {data.ranked_cards.map((card, index) => (
              <RecommendationCard key={card.card_id} card={card} index={index} />
            ))}
          </View>
        )}

        {/* Empty / No Cards State */}
        {!isPending && data && data.ranked_cards.length === 0 && (
          <AnimatedContainer delay={100}>
            <View className="bg-surfaceElevated border border-white/5 p-8 rounded-3xl items-center mt-6 shadow-sm shadow-black/10">
              <Text className="text-textPrimary font-bold text-xl mb-3 tracking-tight">No Matching Cards</Text>
              <Text className="text-textSecondary text-center leading-6 font-medium px-4">
                We couldn't find any cards in your wallet that yield rewards for this specific transaction.
              </Text>
            </View>
          </AnimatedContainer>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
