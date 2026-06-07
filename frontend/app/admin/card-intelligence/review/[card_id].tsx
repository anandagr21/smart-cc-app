import React from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { CardIntelligenceWorkspaceV2 } from '@/features/card_intelligence/components/CardIntelligenceWorkspaceV2';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { ArrowLeft } from 'lucide-react-native';

export default function ReviewCardIntelligenceScreen() {
  const { card_id } = useLocalSearchParams<{ card_id: string }>();
  const colors = useThemeColors();

  if (!card_id) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <TouchableOpacity 
        style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={16} color={colors.textPrimary} />
        <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back to Intelligence</Text>
      </TouchableOpacity>

      <CardIntelligenceWorkspaceV2 cardId={card_id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    margin: 16,
    marginBottom: 0,
    zIndex: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
