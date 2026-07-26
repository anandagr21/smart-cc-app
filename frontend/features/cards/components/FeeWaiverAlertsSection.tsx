import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { UserCardResponse } from '@/features/cards/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';
import { deriveFeeWaiverProgress } from '../utils/feeWaiver';

const URGENCY_ORDER: Record<string, number> = {
  HIGH: 0,
  ELEVATED: 1,
  MODERATE: 2,
  LOW: 3,
};

interface FeeWaiverAlertsSectionProps {
  cards: UserCardResponse[];
  /** Maximum number of alerts to show. Default: 3. */
  maxAlerts?: number;
}

/**
 * Displays up to `maxAlerts` fee waiver urgency alerts, sorted by urgency.
 * Returns nothing when there are no cards with active waiver thresholds.
 *
 * Uses `deriveFeeWaiverProgress` for fee waiver math — the same utility
 * used by WalletInventoryRow and cardIntelligence.
 */
export const FeeWaiverAlertsSection: React.FC<FeeWaiverAlertsSectionProps> = ({
  cards,
  maxAlerts = 3,
}) => {
  const colors = useThemeColors();
  const router = useRouter();

  const alerts = cards
    .filter(
      (c) =>
        c.effective_fee_waiver_threshold &&
        c.effective_fee_waiver_threshold > 0 &&
        !c.waiver_achieved,
    )
    .sort(
      (a, b) =>
        (URGENCY_ORDER[a.urgency_level || 'LOW'] ?? 3) -
        (URGENCY_ORDER[b.urgency_level || 'LOW'] ?? 3),
    )
    .slice(0, maxAlerts);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        Fee waiver alerts
      </Text>
      <View style={styles.alertList}>
        {alerts.map((card) => {
          const isUrgent =
            card.urgency_level === 'HIGH' ||
            card.urgency_level === 'ELEVATED';
          const urgencyColor = isUrgent
            ? colors.warning
            : colors.textSecondary;
          const cardName =
            card.card_details?.card_name || 'Unknown Card';

          const waiver = deriveFeeWaiverProgress(card);
          const remaining = waiver.remainingAmount;
          const monthsLeft = card.days_until_renewal
            ? Math.max(1, Math.round(card.days_until_renewal / 30))
            : null;
          const monthlyTarget =
            monthsLeft && remaining > 0
              ? Math.round(remaining / monthsLeft)
              : null;

          return (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cardName}: ₹${Math.round(remaining).toLocaleString('en-IN')} more to waive your ₹${card.effective_annual_fee || 0} fee`}
              onPress={() => router.push('/cards')}
              style={[
                styles.alertCard,
                {
                  backgroundColor: isUrgent
                    ? colors.warning + '0A'
                    : colors.surface,
                  borderLeftColor: urgencyColor,
                },
              ]}
            >
              <View style={styles.alertHeader}>
                <DynamicIcon
                  name={isUrgent ? 'AlertTriangle' : 'Clock'}
                  size={15}
                  color={urgencyColor}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.alertCardName,
                    { color: colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {cardName}
                </Text>
              </View>
              <Text
                style={[
                  styles.alertBody,
                  { color: colors.textSecondary },
                ]}
              >
                ₹{Math.round(remaining).toLocaleString('en-IN')} more to
                waive your ₹
                {(card.effective_annual_fee || 0).toLocaleString(
                  'en-IN',
                )}{' '}
                fee
              </Text>
              {monthsLeft && monthlyTarget ? (
                <Text
                  style={[
                    styles.alertHint,
                    { color: colors.textMuted },
                  ]}
                >
                  {monthsLeft} month
                  {monthsLeft > 1 ? 's' : ''} remaining · ₹
                  {Math.round(monthlyTarget).toLocaleString('en-IN')}
                  /month
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  alertList: {
    gap: 8,
  },
  alertCard: {
    padding: 14,
    borderRadius: tokens.radius.sm,
    borderLeftWidth: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertCardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    flex: 1,
  },
  alertBody: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: 19,
    marginLeft: 23,
  },
  alertHint: {
    fontSize: tokens.fontSize.caption,
    marginLeft: 23,
    marginTop: 3,
  },
});
