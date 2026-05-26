import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ShoppingBag, Fuel, Plane } from 'lucide-react-native';
import { UserCardResponse } from '../../cards/types/api';
import { RankedCardResponse } from '../../recommendations/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { getNetworkGradient } from '../../../theme/colors';
import { useThemeStore } from '../../theme/store/themeStore';
import { formatCurrencyIN } from '../../../utils/currency';

interface SecondaryRecommendationCardProps {
  card: UserCardResponse;
  recommendation: RankedCardResponse;
  isActive: boolean;
  onPress: () => void;
}

export const SecondaryRecommendationCard: React.FC<SecondaryRecommendationCardProps> = ({
  card,
  recommendation,
  isActive,
  onPress,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.card_details?.network || 'default';
  const gradient = getNetworkGradient(network, isDark) as [string, string];

  const estimatedRewardValue = recommendation.total_projected_value || recommendation.portfolio_score;

  // Naive icon mapping based on text
  const getIcon = () => {
    const text = recommendation.reason_description?.toLowerCase() || recommendation.explanation?.toLowerCase() || '';
    if (text.includes('fuel')) return <Fuel size={12} color={colors.success} style={{ marginRight: 6 }} />;
    if (text.includes('travel') || text.includes('flight')) return <Plane size={12} color={colors.success} style={{ marginRight: 6 }} />;
    return <ShoppingBag size={12} color={colors.success} style={{ marginRight: 6 }} />;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? '#10B981' : colors.glassBorder),
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touchable}>
        <View style={[styles.cardBackground, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.leftCol}>
            <View style={styles.miniArtWrap}>
              <LinearGradient colors={gradient} style={styles.miniArt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.miniArtNetwork}>{network}</Text>
              </LinearGradient>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
              <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>{cardName}</Text>
              <View style={styles.tagRow}>
                {/* @ts-ignore */}
                {getIcon()}
                <Text style={styles.tagText} numberOfLines={1}>
                  {recommendation.reason_title || recommendation.explanation || 'Good alternative'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.rewardAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrencyIN(estimatedRewardValue)}
            </Text>
            <Text style={styles.rewardLabel}>EST. VALUE</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    width: 240,
    height: 80,
    marginRight: 12, // Spacing between cards
  },
  touchable: {
    flex: 1,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  miniArtWrap: {
    width: 48,
    height: 32,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  miniArt: {
    flex: 1,
    padding: 4,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  miniArtNetwork: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 6,
    fontWeight: tokens.fontWeight.heavy,
  },
  cardInfo: {
    flex: 1,
  },
  bankName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 2,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
  },
  rightCol: {
    alignItems: 'flex-end',
    maxWidth: '40%',
  },
  rewardAmount: {
    color: '#10B981',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
  rewardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
  },
});
