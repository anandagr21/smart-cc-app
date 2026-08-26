import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { getNetworkGradient } from '@/theme/colors';
import { formatCurrencyIN } from '@/utils/currency';
import { InsightResult } from '@/features/insights/types/insight.types';
import { DynamicIcon } from '@/components/DynamicIcon';

interface FeaturedWalletCardProps {
  card: UserCardResponse;
  insight?: InsightResult;
  onPress: () => void;
}

export const FeaturedWalletCard: React.FC<FeaturedWalletCardProps> = ({
  card,
  insight,
  onPress,
}) => {
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.network_override || card.card_details?.network || 'VISA';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' ? '' : network.toUpperCase();
  
  const networkGradient = getNetworkGradient(network, isDark) as [string, string];

  const topTag = insight?.badge_label || (card.card_status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  const topTagColor = insight?.badge_color || (card.card_status === 'ACTIVE' ? '#10B981' : colors.textSecondary);

  let actionableContent;
  if (insight?.category === 'FEE_WAIVER' && insight.monetary_value !== undefined) {
    const currentSpend = Number(card.current_spend) || 0;
    const target = currentSpend + insight.monetary_value;
    const percentComplete = Math.min((currentSpend / target) * 100, 100);
    const remaining = target - currentSpend;

    actionableContent = (
      <View style={styles.minimalWaiver}>
        <Text style={styles.cognitionText} numberOfLines={1}>
          <Text style={{ color: '#FFFFFF', fontWeight: tokens.fontWeight.bold }}>{formatCurrencyIN(remaining)}</Text> to annual waiver
        </Text>
        <View style={styles.tinyProgressTrack}>
          <View
            style={[
              styles.tinyProgressFill,
              {
                width: `${percentComplete}%`,
                backgroundColor: '#10B981',
              }
            ]}
          />
        </View>
      </View>
    );
  } else {
    actionableContent = (
      <View style={styles.minimalInsight}>
        <Text style={styles.cognitionText} numberOfLines={2}>
          {insight?.summary || (card.card_status === 'ACTIVE' ? 'Primary optimization active' : 'Card dormant')}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[
          styles.touchable,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <LinearGradient
          colors={networkGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Metallic Top Edge Highlight */}
          <View
            style={[
              styles.topEdge,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.7)' },
            ]}
          />

          {/* Card Top Row */}
          <View style={styles.headerRow}>
            {/* Smart chip emblem */}
            <View style={styles.chipEmblem}>
              <View style={styles.chipInner} />
            </View>

            <View style={[styles.badgeWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={[styles.statusDot, { backgroundColor: topTagColor }]} />
              <Text style={[styles.badgeText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{topTag}</Text>
            </View>
          </View>

          {/* Card Content Block */}
          <View style={styles.bottomBlock}>
            <View style={styles.namesWrap}>
              <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{cardName}</Text>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.footerLeft}>
                {actionableContent}
              </View>
              <View style={styles.networkInfo}>
                {!!displayNetwork && <Text style={styles.networkName}>{displayNetwork}</Text>}
                {!!card.last_4_digits && <Text style={styles.cardEnds}>•••• {card.last_4_digits}</Text>}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: 165,
    borderRadius: tokens.radius.card,
  },
  touchable: {
    flex: 1,
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  cardBackground: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipEmblem: {
    width: 28,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 0, 0.8)',
  },
  chipInner: {
    width: 16,
    height: 12,
    borderRadius: 2,
    borderWidth: 0.8,
    borderColor: 'rgba(120, 90, 0, 0.6)',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.6,
  },
  bottomBlock: {
    marginTop: 'auto',
  },
  namesWrap: {
    marginBottom: 12,
  },
  bankName: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 2,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  cardName: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  minimalWaiver: {
    width: '100%',
  },
  minimalInsight: {
    width: '100%',
  },
  cognitionText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  tinyProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
    width: '85%',
  },
  tinyProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  networkInfo: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  networkName: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardEnds: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
