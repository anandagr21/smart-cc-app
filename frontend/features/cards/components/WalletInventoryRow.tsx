import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserCardResponse } from '@/features/cards/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

import { formatCurrencyIN } from '@/utils/currency';
import { deriveFeeWaiverProgress } from '../utils/feeWaiver';

interface WalletInventoryRowProps {
  card: UserCardResponse;
  onPress: () => void;
}

export const WalletInventoryRow: React.FC<WalletInventoryRowProps> = ({ card, onPress }) => {
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.network_override || card.card_details?.network || 'VISA';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' ? '' : network;
  const isActive = card.card_status === 'ACTIVE';

  // Temporary derived data
  const waiver = deriveFeeWaiverProgress(card);
  const hasWaiver = waiver.hasWaiver;
  const waiverPercent = waiver.percentComplete;

  // Heuristic non-financial tags
  let tags = [];
  if (cardName.toLowerCase().includes('travel') || cardName.toLowerCase().includes('miles')) {
    tags.push('Travel');
  } else if (cardName.toLowerCase().includes('cashback') || cardName.toLowerCase().includes('ace')) {
    tags.push('Cashback');
  } else if (cardName.toLowerCase().includes('fuel') || cardName.toLowerCase().includes('petro')) {
    tags.push('Fuel');
  } else {
    tags.push('Rewards');
  }

  const networkGradient = getNetworkGradient(network, isDark) as [string, string];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        { borderBottomColor: colors.border },
        !isActive && { opacity: 0.5 }
      ]}
    >

      {/* Mini Card Tile */}
      <View style={[styles.tileWrap, !isActive && { opacity: 0.5 }]}>
        <LinearGradient
          colors={isActive ? networkGradient : [colors.surfaceElevated, colors.surfaceElevated]}
          style={styles.miniTile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {!!displayNetwork && (
          <View style={styles.networkAccent}>
            <Text style={[styles.networkAccentText, !isActive && { color: colors.textMuted }]}>{displayNetwork}</Text>
          </View>
        )}
      </View>

      {/* Main Info */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.cardName, { color: isActive ? colors.textPrimary : colors.textSecondary }]} numberOfLines={2}>
            {bankName} {cardName}
          </Text>
        </View>
        <View style={styles.tagsRow}>
          <Text style={[styles.networkText, { color: colors.textMuted }]}>
            {displayNetwork}{displayNetwork && card.last_4_digits ? ` •••• ` : ''}{card.last_4_digits || ''}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.borderHighlight }]} />
          {tags.map(tag => (
            <Text key={tag} style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
          ))}
        </View>
      </View>

      {/* Waiver & Status */}
      <View style={styles.rightCol}>
        {isActive && hasWaiver ? (
          <View style={styles.waiverWrap}>
            <View style={styles.waiverTextRow}>
              <Text style={styles.waiverValueWrap}>
                <Text style={[styles.waiverValue, { color: colors.success }]}>
                  {formatCurrencyIN(waiver.currentSpend)}
                </Text>
                <Text style={[styles.waiverThreshold, { color: colors.textMuted }]}>
                  {' / '}{formatCurrencyIN(waiver.target)}
                </Text>
              </Text>
            </View>
            <View style={styles.waiverTextRow}>
              <Text style={[styles.waiverPercent, { color: colors.success }]}>
                {Math.min(waiverPercent, 100).toFixed(0)}% complete
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.borderHighlight }]}>
              <View style={[styles.progressFill, { width: `${Math.min(waiverPercent, 100)}%`, backgroundColor: waiverPercent >= 100 ? colors.success : colors.primary }]} />
            </View>
          </View>
        ) : (
          isActive && (
            <View style={styles.waiverWrap}>
              <Text style={[styles.tagText, { color: colors.textMuted }]}>No waiver info</Text>
            </View>
          )
        )}

        <View style={[styles.statusRow, !isActive && styles.inactiveBadge]}>
          {isActive && <View style={[styles.statusDot, { backgroundColor: colors.success }]} />}
          <Text style={[styles.statusText, { color: isActive ? colors.success : colors.textMuted }]}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <View style={styles.chevronWrap}>
        {/* @ts-ignore */}
        <ChevronRight size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tileWrap: {
    marginRight: 16,
    alignItems: 'center',
  },
  miniTile: {
    width: 48,
    height: 32,
    borderRadius: 4,
    opacity: 0.9,
  },
  networkAccent: {
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  networkAccentText: {
    fontSize: 6,
    color: '#FFF',
    fontWeight: 'bold',
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  nameRow: {
    marginBottom: 4,
  },
  cardName: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkText: {
    fontSize: tokens.fontSize.micro,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  tagText: {
    fontSize: tokens.fontSize.micro,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 12,
  },
  waiverWrap: {
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  waiverTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  waiverValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  waiverValue: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  waiverThreshold: {
    fontSize: tokens.fontSize.micro,
  },
  waiverPercent: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
  },
  progressTrack: {
    height: 3,
    width: 80,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 4, height: 4, borderRadius: 2,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.medium,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  chevronWrap: {
    justifyContent: 'center',
  },
});
