import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '../../cards/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { getNetworkGradient } from '../../../theme/colors';
import { useThemeStore } from '../../theme/store/themeStore';
import { formatCurrencyIN } from '../../../utils/currency';
import { InsightResult } from '../../insights/types/insight.types';

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
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.card_details?.network || 'VISA';

  // Fallback values if no specific AI insight exists
  const topTag = insight?.badge_label || (card.is_active ? 'ACTIVE CARD' : 'INACTIVE');
  const topTagColor = insight?.badge_color || (card.is_active ? colors.success : colors.textSecondary);
  const IconComponent = CheckCircle2; // Hardcode or map by category later

  // Actionable Insight Rendering
  let actionableContent;
  
  if (insight?.category === 'FEE_WAIVER' && insight.monetary_value !== undefined) {
    const currentSpend = Number(card.current_spend) || 0;
    const target = currentSpend + insight.monetary_value;
    const percentComplete = Math.min((currentSpend / target) * 100, 100);

    actionableContent = (
      <View style={styles.waiverSection}>
        <View style={styles.waiverHeader}>
          <Text style={styles.waiverText}>
            <Text style={{ color: colors.success, fontWeight: 'bold' }}>
              {formatCurrencyIN(currentSpend)}
            </Text>
            {' / '}{formatCurrencyIN(target)}
          </Text>
          <Text style={[styles.waiverPercent, { color: colors.success }]}>
            {percentComplete.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${percentComplete}%`,
                backgroundColor: colors.success
              }
            ]} 
          />
        </View>
        <Text style={styles.waiverSub}>
          {insight.summary}
        </Text>
      </View>
    );
  } else {
    actionableContent = (
      <View style={styles.insightRow}>
        <IconComponent size={12} color={topTagColor} style={{ marginRight: 6, flexShrink: 0 }} />
        <Text style={styles.insightText} numberOfLines={2}>
          {insight?.summary || `${formatCurrencyIN(card.annual_spend)} annual spend`}
        </Text>
      </View>
    );
  }

  const networkGradient = getNetworkGradient(network, isDark) as [string, string];

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Ambient background glow */}
      <View style={[styles.ambientGlow, { backgroundColor: topTagColor }]} />
      
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touchable}>
        <LinearGradient
          colors={['#0F172A', '#020617']} // Deep premium dark
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Top Edge Highlight */}
          <View style={styles.topEdge} />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={[styles.badgeWrap, { backgroundColor: `${topTagColor}20` }]}>
                <Text style={[styles.badgeText, { color: topTagColor }]}>{topTag}</Text>
              </View>
            </View>

            <View style={styles.namesWrap}>
              <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{cardName}</Text>
            </View>

            {actionableContent}

            <View style={styles.footerRow}>
              <LinearGradient colors={networkGradient} style={styles.miniChip} start={{x:0, y:0}} end={{x:1, y:1}}>
                <View style={styles.chipInner} />
              </LinearGradient>
              <View style={styles.networkInfo}>
                <Text style={styles.networkName}>{network.toUpperCase()}</Text>
                <Text style={styles.cardEnds}>•••• 1234</Text>
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
    width: 220,
    height: 280,
    marginRight: 16,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  crownWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    width: 24, height: 24,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  namesWrap: {
    marginBottom: 12,
  },
  bankName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 4,
  },
  cardName: {
    color: '#FFF',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  insightText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  waiverSection: {
    marginTop: 'auto',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  waiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waiverText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
  },
  waiverPercent: {
    color: '#10B981',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  waiverSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  miniChip: {
    width: 32, height: 20,
    borderRadius: 4,
    opacity: 0.8,
  },
  chipInner: {
    position: 'absolute', top: 2, left: 2, width: 8, height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  networkInfo: {
    alignItems: 'flex-end',
  },
  networkName: {
    color: '#FFF',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  cardEnds: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 2,
  },
});
