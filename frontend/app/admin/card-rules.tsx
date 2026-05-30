import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { CardSidebar } from '@/features/card_intelligence/components/CardSidebar';
import { CardIntelligenceDetailView } from '@/features/card_intelligence/screens/CardIntelligenceDetailView';
import { ArrowLeft, BrainCircuit } from 'lucide-react-native';

export default function CardIntelligenceDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { data: catalog = [], isLoading } = useCardCatalog();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const selectedCard = catalog.find(c => c.id === selectedCardId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/admin/card-intelligence');
          }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <BrainCircuit size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Card Intelligence</Text>
          {selectedCard && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {selectedCard.bank_name} · {selectedCard.card_name}
            </Text>
          )}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading catalog…</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Card Sidebar */}
          <CardSidebar
            catalog={catalog}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
          />

          {/* Detail area */}
          <View style={{ flex: 1 }}>
            {!selectedCardId ? (
              <View style={styles.centered}>
                <BrainCircuit size={40} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
                  Select a Card
                </Text>
                <Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>
                  Choose a card from the sidebar to view its extracted reward rules, knowledge sources, and analytics.
                </Text>
              </View>
            ) : (
              <CardIntelligenceDetailView
                cardId={selectedCardId}
                cardName={selectedCard?.card_name ?? ''}
                bankName={selectedCard?.bank_name ?? ''}
              />
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },

  body: { flex: 1, flexDirection: 'row' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  placeholderTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  placeholderSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
