import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '../../cards/types/api';
import { RankedCardResponse } from '../../recommendations/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { getNetworkGradient } from '../../../theme/colors';
import { useThemeStore } from '../../theme/store/themeStore';

interface HeroRecommendationCardProps {
  card: UserCardResponse;
  recommendation: RankedCardResponse;
  delta: number | null;
  isActive: boolean;
  onPress: () => void;
}

export const HeroRecommendationCard: React.FC<HeroRecommendationCardProps> = ({
  card,
  recommendation,
  delta,
  isActive,
  onPress,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  
  // Compute concrete reward tag
  const rewardTag = recommendation.reward_type === 'CASHBACK' && recommendation.cashback_amount 
    ? `${recommendation.cashback_amount} Cashback` 
    : recommendation.reward_type === 'POINTS' && recommendation.reward_points 
      ? `${recommendation.reward_points} Pts` 
      : 'Top Choice';

  const estimatedReward = recommendation.cashback_amount 
    ? `₹${Math.round(recommendation.cashback_amount)}`
    : recommendation.reward_points
      ? `${Math.round(recommendation.reward_points)}`
      : `₹${Math.round(recommendation.effective_reward_value)}`;

  const network = card.card_details?.network || 'default';
  const gradient = getNetworkGradient(network, isDark) as [string, string];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? '#10B981' : colors.glassBorder),
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, animatedStyle]}>
      {/* Subtle Glow Behind Card */}
      {isActive && (
        <View style={styles.ambientGlow} />
      )}
      
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touchable}>
        <LinearGradient
          colors={['#0F172A', '#020617']} // Deep layered dark surface
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Top highlight line */}
          <View style={styles.topEdge} />

          <View style={styles.contentRow}>
            {/* Left Side: Hierarchy */}
            <View style={styles.leftCol}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>BEST MATCH</Text>
              </View>
              
              <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{cardName}</Text>
              
              <View style={styles.concreteReasonRow}>
                <View style={styles.concreteTag}>
                  <Text style={styles.concreteTagText}>{rewardTag}</Text>
                </View>
                <Text style={styles.reasonText} numberOfLines={1}>
                  {recommendation.recommendation_reason || 'You\'ll earn the most on this'}
                </Text>
              </View>

              <View style={styles.starRow}>
                {/* @ts-ignore */}
                <Sparkles size={12} color="#FBBF24" style={{ marginRight: 6 }} />
                <Text style={styles.starText}>You'll earn the most on this transaction</Text>
              </View>
            </View>

            {/* Right Side: Visuals & Math */}
            <View style={styles.rightCol}>
              <View style={styles.miniArtWrap}>
                <LinearGradient colors={gradient} style={styles.miniArt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.miniArtBank} numberOfLines={1}>{bankName}</Text>
                  <Text style={styles.miniArtNetwork}>{network}</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.rewardStats}>
                <Text style={styles.rewardAmount}>{estimatedReward}</Text>
                <Text style={styles.rewardLabel}>EST. REWARD</Text>
                {delta !== null && delta > 0 && (
                  <Text style={styles.deltaText}>₹{Math.round(delta)} more than next best card</Text>
                )}
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
    marginBottom: 16,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    overflow: 'visible', // For glow
  },
  ambientGlow: {
    position: 'absolute',
    top: -10, left: -10, right: -10, bottom: -10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: tokens.radius.xl + 10,
    zIndex: -1,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  touchable: {
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
  },
  cardBackground: {
    padding: 20,
    borderRadius: tokens.radius.xl,
    minHeight: 160,
  },
  topEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  leftCol: {
    flex: 1,
    paddingRight: 16,
  },
  badgeWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: '#10B981', // Emerald
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.wider,
  },
  bankName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 2,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 12,
  },
  concreteReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  concreteTag: {
    backgroundColor: '#0EA5E9', // Cyan accent
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  concreteTagText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
  },
  reasonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: tokens.fontSize.caption,
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
  },
  starText: {
    color: '#FBBF24', // Amber/Gold
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.semibold,
  },
  rightCol: {
    width: 110,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  miniArtWrap: {
    width: 80,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  miniArt: {
    flex: 1,
    padding: 6,
    justifyContent: 'space-between',
  },
  miniArtBank: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 6,
    fontWeight: tokens.fontWeight.heavy,
  },
  miniArtNetwork: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontWeight: tokens.fontWeight.heavy,
    alignSelf: 'flex-end',
  },
  rewardStats: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    color: '#10B981',
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.heavy,
    lineHeight: 32,
  },
  rewardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 8,
  },
  deltaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
    textAlign: 'right',
  },
});
