import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

import { MissingBestCard as MissingBestCardType } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';
import { DynamicIcon } from '@/components/DynamicIcon';

interface Props {
  gap: MissingBestCardType;
  calculationId?: string;
}

export const MissingBestCard: React.FC<Props> = ({ gap }) => {
  const colors = useThemeColors();
  const isDark = colors.isDark ?? true;

  const onApply = () => {
    if (gap.affiliate_url) Linking.openURL(gap.affiliate_url);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.25)' }]}>
          <DynamicIcon name="Sparkles" size={12} color="#F59E0B" />
          <Text style={styles.badgeText}>Not in your wallet</Text>
        </View>
        <Text style={[styles.gapText, { color: '#F59E0B' }]}>+{formatCurrencyIN(gap.incremental_reward)} vs your best</Text>
      </View>

      <View style={styles.cardNameRow}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
          {gap.card_name}
        </Text>
        {gap.bank_name ? <Text style={[styles.bankName, { color: colors.textSecondary }]} numberOfLines={1}>{gap.bank_name}</Text> : null}
      </View>

      <View style={styles.rewardRow}>
        <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>Earns</Text>
        <Text style={[styles.rewardValue, { color: '#10B981' }]}>{formatCurrencyIN(gap.global_best_reward)}</Text>
        <Text style={[styles.vsLabel, { color: colors.textSecondary }]}>vs your {formatCurrencyIN(gap.owned_best_reward)}</Text>
        {gap.cap_note ? (
          <View style={[styles.capPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)' }]}>
            <Text style={styles.capText}>{gap.cap_note}</Text>
          </View>
        ) : null}
      </View>

      {gap.why_better ? (
        <Text style={[styles.whyText, { color: colors.textSecondary }]} numberOfLines={2}>
          {gap.why_better}
        </Text>
      ) : null}

      {gap.annual_fee > 0 ? (
        <Text style={[styles.feeText, { color: colors.textMuted }]} numberOfLines={1}>
          {`Fee ${formatCurrencyIN(gap.annual_fee)}${gap.fee_waiver_threshold ? ` • Waived at ${formatCurrencyIN(gap.fee_waiver_threshold)}` : ''}`}
        </Text>
      ) : null}

      <TouchableOpacity activeOpacity={0.85} onPress={onApply} style={styles.ctaBtn}>
        <View style={[styles.ctaInner, { backgroundColor: colors.primary }]}>
          <Text style={styles.ctaText}>Check Eligibility →</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.disclosure, { color: colors.textMuted }]}>
        {gap.disclosure || 'Partner link — ranking unchanged.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.2,
  },
  gapText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardNameRow: {
    marginBottom: 6,
  },
  cardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bankName: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '500',
    marginTop: 2,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  vsLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  capPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  whyText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  feeText: {
    fontSize: 11,
    marginTop: 6,
  },
  ctaBtn: {
    marginTop: 12,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  ctaInner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.bodySm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  disclosure: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
});
