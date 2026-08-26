import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { UserCardResponse } from '../types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useAuthStore } from '@/features/auth/store/authStore';
import { DynamicIcon } from '@/components/DynamicIcon';

const CARD_WIDTH = Dimensions.get('window').width - tokens.layout.screenPadding * 2;
const CARD_HEIGHT = CARD_WIDTH / 1.62;

interface WalletCardProps {
  card: UserCardResponse;
  index: number;
}

function FeeWaiverProgressBar({ threshold, remaining }: { threshold: number; remaining: number }) {
  const progressPercent = Math.min(100, Math.max(0, ((threshold - remaining) / threshold) * 100));
  const widthAnim = useSharedValue(0);

  React.useEffect(() => {
    widthAnim.value = withTiming(progressPercent, { duration: 800 });
  }, [progressPercent]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthAnim.value}%`,
    };
  });

  return (
    <View style={styles.progressBarBg}>
      <Animated.View style={[styles.progressBarFill, animatedStyle]} />
    </View>
  );
}

function getNetworkLabel(network: string): string {
  if (!network) return '';
  const n = network.toLowerCase();
  if (n.includes('n/a') || n === 'na') return '';
  if (n.includes('visa')) return 'VISA';
  if (n.includes('mastercard')) return 'MASTERCARD';
  if (n.includes('amex') || n.includes('american express')) return 'AMEX';
  if (n.includes('discover')) return 'DISCOVER';
  return network.toUpperCase();
}

export const WalletCard: React.FC<WalletCardProps> = ({ card, index }) => {
  const colors = useThemeColors();
  const isDark = colors.isDark;
  const user = useAuthStore((state) => state.user);
  const isPremium = user?.is_premium;

  const network = card.card_details?.network || '';
  const gradient = getNetworkGradient(network, isDark) as [string, string];
  const cardName = card.nickname || card.card_details?.card_name || 'Credit Card';
  const bankName = card.card_details?.bank_name || '';
  const networkLabel = getNetworkLabel(network);
  const isActive = card.card_status === 'ACTIVE';

  return (
    <Animated.View
      entering={FadeInDown.delay(60 + index * 80).springify()}
      style={[
        styles.wrapper, 
        !isActive && { opacity: 0.6 }
      ]}
    >
      <LinearGradient
        colors={isActive ? gradient : [isDark ? '#1E2333' : '#A0A0A0', isDark ? '#111420' : '#666']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        {/* Subtle metallic edge highlight */}
        <View style={styles.topEdge} pointerEvents="none" />

        {/* Card Top Row */}
        <View style={styles.topRow}>
          {/* Chip */}
          <View style={[styles.chip, !isActive && { backgroundColor: 'rgba(180,180,180,0.6)' }]}>
            <View style={styles.chipInner} />
          </View>

          {/* Contactless / NFC */}
          <View style={styles.nfcWrap}>
            <DynamicIcon name="Wifi" size={18} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
          </View>
        </View>

        {/* Card Middle — Issuer & Intelligence */}
        <View style={styles.middle}>
          <Text style={styles.bankName} numberOfLines={1}>
            {bankName}
          </Text>
          
          {isActive && (
            <View style={styles.waiverAmbient}>
              {card.waiver_achieved ? (
                <View style={styles.waiverAchievedBadge}>
                  <DynamicIcon name="CheckCircle2" size={12} color="#10B981" />
                  <Text style={styles.waiverAchievedText}>Annual Fee Waived</Text>
                </View>
              ) : card.effective_fee_waiver_threshold ? (
                <>
                  <Text style={styles.waiverAmbientText}>
                    ₹{card.remaining_spend_for_waiver?.toLocaleString('en-IN')} left for fee waiver
                  </Text>
                  <FeeWaiverProgressBar 
                    threshold={card.effective_fee_waiver_threshold} 
                    remaining={card.remaining_spend_for_waiver || 0} 
                  />
                  {card.days_until_renewal !== undefined && card.days_until_renewal !== null && (
                    <Text style={styles.waiverAmbientSubtext}>
                      {card.days_until_renewal} days remaining in cycle
                    </Text>
                  )}
                </>
              ) : null}
            </View>
          )}
        </View>

        {/* Card Bottom Row */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            <Text style={styles.cardNameLabel}>CARDHOLDER ASSET</Text>
            <Text style={styles.cardNameText} numberOfLines={1}>
              {cardName}
            </Text>
          </View>

          <View style={styles.bottomRight}>
            <View style={styles.activeBadge}>
              <View style={[styles.activeDot, { backgroundColor: isActive ? '#10B981' : 'rgba(255,255,255,0.4)' }]} />
              <Text style={styles.activeBadgeText}>{isActive ? 'Active' : 'Inactive'}</Text>
            </View>
            <Text style={styles.networkText}>{networkLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    borderRadius: tokens.radius.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: tokens.radius.card,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 0, 0.7)',
  },
  chipInner: {
    width: 22,
    height: 16,
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: 'rgba(140, 100, 0, 0.5)',
  },
  nfcWrap: {
    opacity: 0.85,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 4,
  },
  bankName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bottomLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardNameLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardNameText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.3,
  },
  bottomRight: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.4,
  },
  networkText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  waiverAmbient: {
    marginTop: 6,
  },
  waiverAchievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  waiverAchievedText: {
    color: '#10B981',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  waiverAmbientText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  waiverAmbientSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.micro,
    marginTop: 3,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
    width: '75%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
});
