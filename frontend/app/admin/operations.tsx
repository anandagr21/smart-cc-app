import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { ArrowLeft, BrainCircuit, Database } from 'lucide-react-native';

import { CardIntelligenceDashboard } from '@/features/card_intelligence/screens/CardIntelligenceDashboard';
import { MasterCatalogDashboard } from '@/features/cards/screens/MasterCatalogDashboard';

export default function CardOperationsHub() {
  const colors = useThemeColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'intelligence' | 'catalog'>('intelligence');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Global Header & Segmented Control */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/admin');
            }
          }}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'intelligence' && [styles.activeTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('intelligence')}
            activeOpacity={0.8}
          >
            <BrainCircuit size={16} color={activeTab === 'intelligence' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'intelligence' ? '#FFF' : colors.textSecondary }]}>
              Intelligence Queue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'catalog' && [styles.activeTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('catalog')}
            activeOpacity={0.8}
          >
            <Database size={16} color={activeTab === 'catalog' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'catalog' ? '#FFF' : colors.textSecondary }]}>
              Live Catalog
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} /> {/* Spacer to center the tabs */}
      </View>

      {/* Active View */}
      <View style={styles.content}>
        {activeTab === 'intelligence' ? <CardIntelligenceDashboard /> : <MasterCatalogDashboard />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: tokens.spacing.sm,
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    padding: tokens.spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.full,
    gap: tokens.spacing.sm,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
});
