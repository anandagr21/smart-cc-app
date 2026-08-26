import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCards } from '@/features/cards/hooks/useCards';
import { DynamicIcon } from '@/components/DynamicIcon';

interface EmptyDashboardStateProps {
  onAddCard: () => void;
  onAddTransaction: () => void;
  onQuickStart?: (merchant: string, amount: number) => void;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  onAddCard,
  onAddTransaction,
  onQuickStart,
}) => {
  const colors = useThemeColors();
  const { data: cards } = useCards();
  const hasCards = !!cards && cards.length > 0;

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <Card variant="elevated" padded>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <DynamicIcon name="Sparkles" size={24} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {hasCards ? 'Find your best card' : 'Set up in two steps'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {hasCards
              ? 'Log a purchase and see which of your cards earns the most — with the calculation explained.'
              : 'Add your cards, then log a purchase. Card Analyser compares your cards and recommends the best one for each purchase.'}
          </Text>
        </View>

        {/* CTAs */}
        {!hasCards && (
          <View style={styles.ctas}>
            <Button
              label="Add a card"
              variant="primary"
              onPress={onAddCard}
              style={styles.cta}
            />
            <Button
              label="Log a purchase"
              variant="secondary"
              onPress={onAddTransaction}
              style={styles.cta}
            />
          </View>
        )}
        
        {/* Quick Start Chips */}
        {hasCards && onQuickStart && (
          <View style={styles.quickStartSection}>
            <Text style={[styles.quickStartLabel, { color: colors.textSecondary }]}>
              Which card should I use?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {[
                { label: 'Swiggy', amount: 500, icon: 'Utensils' },
                { label: 'Amazon', amount: 1000, icon: 'ShoppingBag' },
                { label: 'Fuel', amount: 2000, icon: 'Fuel' },
                { label: 'Zomato', amount: 500, icon: 'Utensils' },
                { label: 'Flipkart', amount: 1000, icon: 'ShoppingBag' },
              ].map(m => (
                <TouchableOpacity
                  key={m.label}
                  activeOpacity={0.7}
                  onPress={() => onQuickStart(m.label, m.amount)}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                  ]}
                >
                  <DynamicIcon name={m.icon as any} size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.chipText, { color: colors.textPrimary }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.6,
    textAlign: 'center',
    maxWidth: 300,
  },
  ctas: {
    gap: 12,
  },
  cta: {
    width: '100%',
  },
  quickStartSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  quickStartLabel: {
    fontSize: tokens.fontSize.body,
    marginBottom: 12,
  },
  chipsScroll: {
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
});
