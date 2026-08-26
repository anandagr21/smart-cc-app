import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { UserCardResponse } from '@/features/cards/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface WalletInventoryRowProps {
  card: UserCardResponse;
  onPress: () => void;
}

function getNetworkLabel(network: string): string {
  if (!network) return '';
  const n = network.toLowerCase();
  if (n.includes('n/a') || n === 'na') return '';
  if (n.includes('visa')) return 'VISA';
  if (n.includes('mastercard')) return 'MASTERCARD';
  if (n.includes('amex') || n.includes('american express')) return 'AMEX';
  if (n.includes('rupay')) return 'RUPAY';
  return network.toUpperCase();
}

export const WalletInventoryRow: React.FC<WalletInventoryRowProps> = ({ card, onPress }) => {
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.network_override || card.card_details?.network || 'VISA';
  const networkLabel = getNetworkLabel(network);
  const isActive = card.card_status === 'ACTIVE';

  const networkGradient = getNetworkGradient(network, isDark) as [string, string];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#13162A' : colors.surface,
          borderColor: isDark ? 'rgba(139,92,246,0.12)' : colors.border,
        },
        !isActive && { opacity: 0.55 },
      ]}
    >
      {/* Left gradient accent bar */}
      <LinearGradient
        colors={isActive ? networkGradient : ['#6B7280', '#4B5563']}
        style={styles.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Card color tile */}
      <View style={styles.tileWrap}>
        <LinearGradient
          colors={isActive ? networkGradient : [isDark ? '#2A2E44' : '#D1D5DB', isDark ? '#1E2238' : '#9CA3AF']}
          style={styles.cardTile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Mini chip */}
          <View style={styles.miniChip} />
          {/* Network label on tile */}
          {!!networkLabel && (
            <Text style={styles.tileNetworkText} numberOfLines={1}>{networkLabel}</Text>
          )}
        </LinearGradient>
      </View>

      {/* Card info */}
      <View style={styles.infoCol}>
        <Text style={[styles.cardName, { color: isActive ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
          {cardName}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {networkLabel || bankName}{card.last_4_digits ? ` •••• ${card.last_4_digits}` : ''}
        </Text>
      </View>

      {/* Right: network badge */}
      {!!networkLabel && (
        <Text style={[styles.networkBadge, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>
          {networkLabel}
        </Text>
      )}

      <DynamicIcon name="ChevronRight" size={15} color={colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    paddingRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  tileWrap: {
    marginLeft: 14,
    marginVertical: 14,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    borderRadius: 7,
  },
  cardTile: {
    width: 54,
    height: 36,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 4,
  },
  miniChip: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255,215,0,0.75)',
    borderWidth: 0.5,
    borderColor: 'rgba(200,160,0,0.6)',
  },
  tileNetworkText: {
    fontSize: 5.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    alignSelf: 'flex-end',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  cardMeta: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: 0.3,
  },
  networkBadge: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    marginRight: 10,
  },
});
