import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Sparkles, Plus } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useRouter } from 'expo-router';
import { TransactionFormSheet } from '@/features/transactions/components/TransactionFormSheet';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {getGreeting()} · Smart CC
          </Text>
          <Text style={[styles.heroText, { color: colors.textPrimary }]}>
            Dashboard
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Your proactive financial assistant.
          </Text>
          
          <TouchableOpacity 
            style={[styles.intelligenceCta, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push('/monthly-intelligence')}
          >
            {/* @ts-ignore */}
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.intelligenceCtaText, { color: colors.textPrimary }]}>
              Your Monthly Intelligence
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Primary Action */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => setFormSheetVisible(true)}
          >
            {/* @ts-ignore */}
            <Plus size={24} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add Transaction</Text>
          </TouchableOpacity>
          <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
            Get instant, live recommendations based on your portfolio.
          </Text>
        </Animated.View>
      </ScrollView>

      <TransactionFormSheet
        visible={isFormSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        initialData={null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  header: { marginTop: 16, marginBottom: 40 },
  greeting: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroText: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: tokens.fontSize.heroXl * 1.05,
    marginBottom: 10,
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.55,
  },
  intelligenceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  intelligenceCtaText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wide,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 32,
    borderRadius: tokens.radius.card,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: tokens.radius.full,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
  },
  actionHint: {
    marginTop: 16,
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
