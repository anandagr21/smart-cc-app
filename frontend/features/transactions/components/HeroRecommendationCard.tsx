import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '../../cards/types/api';
import { RankedCardResponse } from '../../recommendations/types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { getNetworkGradient } from '../../../theme/colors';
import { useThemeStore } from '../../theme/store/themeStore';
import { formatCurrencyIN } from '../../../utils/currency';

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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.015 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? '#8B5CF6' : colors.glassBorder),
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

          {/* CARD HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.bankName}>{bankName.toUpperCase()}</Text>
              <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>{cardName}</Text>
            </View>
            <View style={styles.miniArtWrap}>
              <LinearGradient colors={gradient} style={styles.miniArt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.miniArtNetwork}>{network}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* WHY THIS WINS */}
          <View style={styles.reasoningSection}>
            <Text style={styles.whyTitle}>Why this wins</Text>
            <Text style={styles.reasonDescription}>
              <Text style={styles.reasonHighlight}>{recommendation.reason_title || 'Optimal Choice'}. </Text>
              {recommendation.reason_description || recommendation.explanation}
            </Text>
            
            {/* Supporting Factors */}
            {recommendation.supporting_factors && recommendation.supporting_factors.length > 0 && (
              <View style={styles.factorsList}>
                {recommendation.supporting_factors.map((factor, idx) => (
                  <View key={idx} style={styles.factorRow}>
                    {/* @ts-ignore */}
                    <CheckCircle2 size={12} color="rgba(255,255,255,0.4)" style={styles.factorIcon} />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* FINANCIALS */}
          <View style={styles.financialsRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialAmount}>{formatCurrencyIN(recommendation.cashback_value || 0)}</Text>
              <Text style={styles.financialLabel}>CASHBACK NOW</Text>
            </View>
            
            {recommendation.strategic_value > 0 && (
              <View style={styles.financialItem}>
                <Text style={[styles.financialAmount, { color: '#8B5CF6' }]}>
                  {formatCurrencyIN(recommendation.strategic_value)}
                </Text>
                <Text style={styles.financialLabel}>STRATEGIC VALUE</Text>
              </View>
            )}

            <View style={styles.financialItemRight}>
              <Text style={styles.financialTotalAmount}>
                {formatCurrencyIN(recommendation.total_projected_value || recommendation.portfolio_score)}
              </Text>
              <Text style={styles.financialLabel}>TOTAL PROJECTED VALUE</Text>
            </View>
          </View>

        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    overflow: 'visible', // For glow
  },
  ambientGlow: {
    position: 'absolute',
    top: -5, left: -5, right: -5, bottom: -5,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: tokens.radius.xl + 5,
    zIndex: -1,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 6,
  },
  touchable: {
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
  },
  cardBackground: {
    padding: 24,
    borderRadius: tokens.radius.xl,
  },
  topEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  bankName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 4,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
  },
  miniArtWrap: {
    width: 52,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  miniArt: {
    flex: 1,
    padding: 4,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  miniArtNetwork: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 7,
    fontWeight: tokens.fontWeight.heavy,
  },
  reasoningSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  whyTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 8,
  },
  reasonDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    fontWeight: tokens.fontWeight.medium,
  },
  reasonHighlight: {
    color: '#FFFFFF',
    fontWeight: tokens.fontWeight.bold,
  },
  factorsList: {
    marginTop: 12,
    gap: 6,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorIcon: {
    marginRight: 6,
  },
  factorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.caption,
  },
  financialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  financialItem: {
    flex: 1,
  },
  financialItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  financialAmount: {
    color: '#10B981',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 4,
  },
  financialTotalAmount: {
    color: '#FCD34D',
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 4,
  },
  financialLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
  },
});
