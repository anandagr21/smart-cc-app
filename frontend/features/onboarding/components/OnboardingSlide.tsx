import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { LucideIcon, Plus, CreditCard, Trophy } from 'lucide-react-native';

interface OnboardingSlideData {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: [string, string];
}

export const SLIDES: OnboardingSlideData[] = [
  {
    icon: CreditCard,
    title: 'Add Your Cards',
    description:
      'Connect your credit cards to unlock AI-powered reward optimization.',
    gradient: ['#4F36FF', '#6C5CE7'],
  },
  {
    icon: Plus,
    title: 'Track Transactions',
    description:
      'Log each purchase. Smart CC instantly recommends the best card to maximize your rewards.',
    gradient: ['#6C5CE7', '#8B5CF6'],
  },
  {
    icon: Trophy,
    title: 'Unlock Better Rewards',
    description:
      'Watch your reward efficiency climb. Never leave cashback or points on the table again.',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
];

interface OnboardingSlideProps {
  slide: OnboardingSlideData;
  index: number;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  slide,
  index,
}) => {
  const colors = useThemeColors();
  const Icon = slide.icon;

  return (
    <View style={styles.slide}>
      {/* Icon in gradient circle */}
      <Animated.View
        entering={FadeInDown.delay(100 + index * 80).springify()}
        style={styles.iconContainer}
      >
        <LinearGradient
          colors={slide.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          {/* @ts-ignore */}
          <Icon size={40} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.View
        entering={FadeInDown.delay(200 + index * 80).springify()}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {slide.title}
        </Text>
      </Animated.View>

      {/* Description */}
      <Animated.View
        entering={FadeInDown.delay(300 + index * 80).springify()}
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {slide.description}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 320,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginBottom: 40,
    ...tokens.elevation.glow,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.6,
    textAlign: 'center',
    maxWidth: 280,
  },
});
