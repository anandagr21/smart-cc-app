import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  onAddCard,
  onAddTransaction,
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
            Your dashboard awaits
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Add a credit card and log your first transaction. Smart CC will
            analyze your portfolio and recommend the best card for every
            purchase — automatically.
          </Text>
        </View>

        {/* CTAs */}
        {!hasCards && (
          <View style={styles.ctas}>
            <Button
              label="Add a Card"
              variant="primary"
              onPress={onAddCard}
              style={styles.cta}
            />
            <Button
              label="Log a Transaction"
              variant="secondary"
              onPress={onAddTransaction}
              style={styles.cta}
            />
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
});
