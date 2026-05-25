import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserCardResponse } from '../../cards/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { getNetworkGradient } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

import { formatCurrencyIN } from '../../../utils/currency';
import { deriveFeeWaiverProgress } from '../utils/feeWaiver';

interface WalletInventoryRowProps {
  card: UserCardResponse;
  onPress: () => void;
}

export const WalletInventoryRow: React.FC<WalletInventoryRowProps> = ({ card, onPress }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.card_details?.network || 'VISA';
  const isActive = card.is_active;

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
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.container, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      
      {/* Mini Card Tile */}
      <View style={styles.tileWrap}>
        <LinearGradient
          colors={networkGradient}
          style={styles.miniTile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.networkAccent}>
          <Text style={styles.networkAccentText}>{network}</Text>
        </View>
      </View>

      {/* Main Info */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {bankName} {cardName}
          </Text>
        </View>
        <View style={styles.tagsRow}>
          <Text style={[styles.networkText, { color: colors.textMuted }]}>{network} •••• 1234</Text>
          <View style={styles.dot} />
          {tags.map(tag => (
            <Text key={tag} style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
          ))}
        </View>
      </View>

      {/* Waiver & Status */}
      <View style={styles.rightCol}>
        {hasWaiver ? (
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
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <View style={[styles.progressFill, { width: `${Math.min(waiverPercent, 100)}%`, backgroundColor: waiverPercent >= 100 ? colors.success : colors.primary }]} />
            </View>
          </View>
        ) : (
          <View style={styles.waiverWrap}>
            <Text style={[styles.tagText, { color: colors.textMuted }]}>No waiver info</Text>
          </View>
        )}
        
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.warning }]} />
          <Text style={[styles.statusText, { color: isActive ? colors.success : colors.warning }]}>
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
    fontSize: tokens.fontSize.body,
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
    backgroundColor: 'rgba(150,150,150,0.5)',
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
  chevronWrap: {
    justifyContent: 'center',
  },
});
