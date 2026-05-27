import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

const Pulse: React.FC<{ delay: number }> = ({ delay }) => {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.5, { duration: 1400 + delay * 200 }),
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 0 }),
        withTiming(0, { duration: 1400 + delay * 200 }),
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { borderColor: colors.primary },
        animStyle,
      ]}
    />
  );
};

import { Text, TouchableOpacity } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

interface EmptyWalletStateProps {
  onAddCard: () => void;
}

export const EmptyWalletState: React.FC<EmptyWalletStateProps> = ({ onAddCard }) => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeIn.delay(100)} style={styles.container}>
      {/* Animated pulse rings */}
      <View style={styles.iconWrap}>
        {[0, 1, 2].map((i) => (
          <Pulse key={i} delay={i} />
        ))}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.surface, borderColor: colors.borderHighlight },
          ]}
        >
          {/* @ts-ignore */}
          <CreditCard size={36} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Your Digital Wallet
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Connect your credit cards to unlock AI-powered reward optimization and intelligent spend routing.
      </Text>

      <Button
        label="Add Your First Card"
        variant="secondary"
        onPress={onAddCard}
        style={styles.cta}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 8,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: tokens.fontSize.bodyLg * 1.6,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
  },
  cta: {
    width: '100%',
    maxWidth: 280,
  },
});
