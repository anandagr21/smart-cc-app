import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

import { DynamicIcon } from '@/components/DynamicIcon';

interface PersonaOption {
  icon: string;
  label: string;
  description: string;
  value: string;
  color: string;
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    icon: 'Zap',
    label: 'Simplify',
    description: 'I want the best card for each purchase, no thinking required.',
    value: 'SIMPLIFY_DECISIONS',
    color: '#F59E0B',
  },
  {
    icon: 'Sparkles',
    label: 'Maximize Rewards',
    description: 'I want to squeeze every rupee from my portfolio.',
    value: 'MAX_REWARDS',
    color: '#8B5CF6',
  },
  {
    icon: 'ShieldCheck',
    label: 'Avoid Fees',
    description: 'I want to track annual fee waivers and milestones.',
    value: 'SAVE_FEE_WAIVER',
    color: '#10B981',
  },
];

interface OnboardingSlideData {
  icon: string;
  title: string;
  description: string;
  gradient: [string, string];
  isPersona?: boolean;
}

export const SLIDES: OnboardingSlideData[] = [
  {
    icon: 'CreditCard',
    title: 'Add Your Cards',
    description:
      'Connect your credit cards to unlock AI-powered reward optimization.',
    gradient: ['#4F36FF', '#6C5CE7'],
  },
  {
    icon: 'Plus',
    title: 'Track Transactions',
    description:
      'Log each purchase. Card Analyser instantly recommends the best card to maximize your rewards.',
    gradient: ['#6C5CE7', '#8B5CF6'],
  },
  {
    icon: 'Trophy',
    title: 'Unlock Better Rewards',
    description:
      'Watch your reward efficiency climb. Never leave cashback or points on the table again.',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  {
    icon: 'User',
    title: 'How do you use your cards?',
    description: '',
    gradient: ['#8B5CF6', '#10B981'],
    isPersona: true,
  },
];

interface OnboardingSlideProps {
  slide: OnboardingSlideData;
  index: number;
  onSelectPersona?: (value: string) => void;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  slide,
  index,
  onSelectPersona,
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
          <DynamicIcon name={slide.icon} size={40} color="#FFFFFF" strokeWidth={1.5} />
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

      {/* Persona options OR description */}
      {slide.isPersona ? (
        <Animated.View
          entering={FadeInDown.delay(300 + index * 80).springify()}
          style={styles.personaOptions}
        >
          {PERSONA_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.7}
              onPress={() => onSelectPersona?.(option.value)}
              style={[
                styles.personaCard,
                { backgroundColor: option.color + '10', borderColor: option.color + '30' },
              ]}
            >
              <View style={[styles.personaIconWrap, { backgroundColor: option.color + '20' }]}>
                <DynamicIcon name={option.icon} size={22} color={option.color} strokeWidth={1.5} />
              </View>
              <View style={styles.personaTextWrap}>
                <Text style={[styles.personaLabel, { color: option.color }]}>
                  {option.label}
                </Text>
                <Text style={[styles.personaDesc, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(300 + index * 80).springify()}
        >
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {slide.description}
          </Text>
        </Animated.View>
      )}
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
  personaOptions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 8,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: 14,
  },
  personaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaTextWrap: {
    flex: 1,
    gap: 2,
  },
  personaLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  personaDesc: {
    fontSize: tokens.fontSize.caption,
    lineHeight: tokens.fontSize.caption * 1.5,
  },
});
