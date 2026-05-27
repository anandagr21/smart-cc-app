import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Receipt } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
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

interface EmptyTransactionStateProps {
  onAddPress: () => void;
}

export const EmptyTransactionState: React.FC<EmptyTransactionStateProps> = ({ onAddPress }) => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeIn.delay(100)} style={styles.container}>
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
          <Receipt size={36} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        No Activity Yet
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Log your transactions to see AI-driven insights and track your optimized rewards over time.
      </Text>

      <Button
        label="Log a Transaction"
        variant="secondary"
        onPress={onAddPress}
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
    paddingHorizontal: 24,
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
