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

  // Fallback values if no specific AI insight exists
  const topTag = insight?.badge_label || (card.card_status === 'ACTIVE' ? 'ACTIVE CARD' : 'INACTIVE');
  const topTagColor = insight?.badge_color || (card.card_status === 'ACTIVE' ? colors.success : colors.textSecondary);

  // Actionable Insight Rendering (Minimal UI for the bottom left)
  let actionableContent;
  
  if (insight?.category === 'FEE_WAIVER' && insight.monetary_value !== undefined) {
    const currentSpend = Number(card.current_spend) || 0;
    const target = currentSpend + insight.monetary_value;
    const percentComplete = Math.min((currentSpend / target) * 100, 100);
    const remaining = target - currentSpend;

    actionableContent = (
      <View style={styles.minimalWaiver}>
        <Text style={styles.cognitionText} numberOfLines={1}>
          <Text style={{ color: 'rgba(255,255,255,0.95)', fontWeight: tokens.fontWeight.bold }}>{formatCurrencyIN(remaining)}</Text> away from waiver
        </Text>
        <View style={styles.tinyProgressTrack}>
          <View
            style={[
              styles.tinyProgressFill,
              {
                width: `${percentComplete}%`,
                backgroundColor: topTagColor
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
          {insight?.summary || (card.card_status === 'ACTIVE' ? 'Active and ready to use' : 'Currently inactive')}
        </Text>
      </View>
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Ambient background glow */}
      <View style={[styles.ambientGlow, { backgroundColor: topTagColor }]} />
      
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.touchable, { borderColor: colors.borderHighlight, borderWidth: 1 }]}>
        <LinearGradient
          colors={networkGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Top Edge Highlight */}
          <View style={[styles.topEdge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]} />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={[styles.badgeWrap, { backgroundColor: `${topTagColor}20` }]}>
                <Text style={[styles.badgeText, { color: topTagColor }]}>{topTag}</Text>
              </View>
            </View>

            {/* Group names and footer at the bottom to avoid awkward gap */}
            <View style={styles.bottomBlock}>
              <View style={styles.namesWrap}>
                <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
                <Text style={styles.cardName} numberOfLines={2}>{cardName}</Text>
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
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 180,
    borderRadius: tokens.radius.xl,
  },
  ambientGlow: {
    position: 'absolute',
    top: -10, left: -10, right: -10, bottom: -10,
    borderRadius: tokens.radius.xl + 10,
    zIndex: -1,
    opacity: 0.1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  touchable: {
    flex: 1,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  bottomBlock: {
    marginTop: 'auto',
  },
  namesWrap: {
    marginBottom: 24, // Space between names and footer
  },
  bankName: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 4,
    color: 'rgba(255,255,255,0.6)',
  },
  cardName: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: 'rgba(255,255,255,0.95)',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  minimalWaiver: {
    width: '100%',
  },
  minimalInsight: {
    width: '100%',
  },
  cognitionText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  tinyProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
    width: '80%',
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
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    color: 'rgba(255,255,255,0.85)',
  },
  cardEnds: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },
});
