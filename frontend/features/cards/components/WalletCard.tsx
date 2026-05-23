import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Wifi } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UserCardResponse } from '../types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { getNetworkGradient } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

const CARD_WIDTH = Dimensions.get('window').width - tokens.layout.screenPadding * 2;
const CARD_HEIGHT = CARD_WIDTH / 1.586; // Standard credit card ratio

interface WalletCardProps {
  card: UserCardResponse;
  index: number;
}

/** Returns a short display label for the network */
function getNetworkLabel(network: string): string {
  const n = network.toLowerCase();
  if (n.includes('visa')) return 'VISA';
  if (n.includes('mastercard')) return 'Mastercard';
  if (n.includes('amex') || n.includes('american express')) return 'Amex';
  if (n.includes('discover')) return 'Discover';
  return network.toUpperCase();
}

export const WalletCard: React.FC<WalletCardProps> = ({ card, index }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const network = card.card_details?.network || '';
  const gradient = getNetworkGradient(network, isDark) as [string, string];
  const cardName = card.nickname || card.card_details?.card_name || 'Credit Card';
  const bankName = card.card_details?.bank_name || '';
  const networkLabel = getNetworkLabel(network);

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 100).springify()}
      style={[styles.wrapper, { ...tokens.elevation.level2 }]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Subtle inner highlight — top edge */}
        <View style={styles.topEdge} pointerEvents="none" />

        {/* Noise texture overlay (circles pattern) */}
        <View style={styles.noiseOverlay} pointerEvents="none">
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.noiseCircle,
                {
                  width: CARD_WIDTH * (0.6 + i * 0.25),
                  height: CARD_WIDTH * (0.6 + i * 0.25),
                  borderRadius: CARD_WIDTH * (0.3 + i * 0.125),
                  top: -CARD_WIDTH * (0.15 + i * 0.05),
                  right: -CARD_WIDTH * (0.2 + i * 0.05),
                },
              ]}
            />
          ))}
        </View>

        {/* ── Card Top Row ── */}
        <View style={styles.topRow}>
          {/* Chip icon */}
          <View style={styles.chip}>
            <View style={styles.chipInner} />
            <View style={styles.chipLine} />
          </View>

          {/* NFC/Contactless */}
          <View style={styles.nfcIcon}>
            {/* @ts-ignore */}
            <Wifi size={20} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
          </View>
        </View>

        {/* ── Card Middle — Bank Name ── */}
        <View style={styles.middle}>
          <Text style={styles.bankName} numberOfLines={1}>
            {bankName}
          </Text>
        </View>

        {/* ── Card Bottom Row ── */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            <Text style={styles.cardNameLabel}>CARD</Text>
            <Text style={styles.cardNameText} numberOfLines={1}>
              {cardName}
            </Text>
          </View>

          <View style={styles.bottomRight}>
            {/* Active badge */}
            <View style={styles.activeBadge}>
              {/* @ts-ignore */}
              <CheckCircle2 size={11} color="rgba(255,255,255,0.85)" strokeWidth={2} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
            {/* Network label */}
            <Text style={styles.networkText}>{networkLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    borderRadius: tokens.radius.card,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: tokens.radius.card,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  noiseCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,220,100,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 20,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(180,140,0,0.6)',
    backgroundColor: 'rgba(255,210,80,0.4)',
  },
  chipLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(180,140,0,0.4)',
    marginTop: -0.5,
  },
  nfcIcon: {
    opacity: 0.7,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  bankName: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: tokens.letterSpacing.widest,
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cardNameText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.2,
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
    borderRadius: tokens.radius.full,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 6,
    gap: 4,
  },
  activeBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
  },
  networkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
  },
});
