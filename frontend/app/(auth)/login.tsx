import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { DynamicIcon } from '@/components/DynamicIcon';

// ── Google Logo SVG ──────────────────────────────────────────────────────────

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

// ── Animated Credit Card SVG ─────────────────────────────────────────────────

const CARD_GRADIENTS = [
  ['#4F36FF', '#6C5CE7'],
  ['#F59E0B', '#D97706'],
  ['#8B5CF6', '#7C3AED'],
];

const NETWORK_LABELS = ['VISA', 'MC', 'AMEX'];

const AnimatedCard = ({
  gradient,
  networkLabel,
  index,
  reduceMotion,
}: {
  gradient: string[];
  networkLabel: string;
  index: number;
  reduceMotion: boolean;
}) => {
  const translateY = useSharedValue(reduceMotion ? 0 : 80);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(reduceMotion ? 0 : (index - 1) * 8);

  useEffect(() => {
    const delay = 400 + index * 150;
    if (reduceMotion) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    } else {
      translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 100 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      rotate.value = withDelay(delay, withSpring((index - 1) * 6, { damping: 14, stiffness: 100 }));
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.cardWrap, animatedStyle, { zIndex: 3 - index }]}>
      <Svg width={200} height={120} viewBox="0 0 200 120">
        <Defs>
          <SvgLinearGradient id={`cardGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} stopOpacity="1" />
            <Stop offset="1" stopColor={gradient[1]} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        {/* Card body */}
        <Rect x="0" y="0" width="200" height="120" rx="12" fill={`url(#cardGrad-${index})`} opacity="0.15" />
        <Rect x="0" y="0" width="200" height="120" rx="12" fill="none" stroke={gradient[0]} strokeOpacity="0.3" strokeWidth="1" />
        {/* Chip */}
        <Rect x="20" y="40" width="30" height="22" rx="4" fill={gradient[0]} opacity="0.5" />
        {/* Network label */}
        <Svg width="50" height="20" x="150" y="90" viewBox="0 0 50 20">
          <Rect x="0" y="0" width="50" height="20" rx="3" fill={gradient[0]} opacity="0.3" />
          <Path
            d={`M${networkLabel === 'VISA' ? '10 14 L16 6 L22 14' : networkLabel === 'MC' ? '10 14 L25 14 M17.5 14 L17.5 6' : '10 14 L25 14 M17.5 10 L17.5 14'}`}
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
        </Svg>
        {/* Decorative lines */}
        <Rect x="20" y="75" width="80" height="3" rx="1.5" fill="#fff" opacity="0.2" />
        <Rect x="20" y="83" width="50" height="3" rx="1.5" fill="#fff" opacity="0.15" />
      </Svg>
    </Animated.View>
  );
};

// ── Trust Badges ─────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { icon: 'Shield', label: 'No bank linking' },
  { icon: 'Lock', label: 'Bank-grade encryption' },
  { icon: 'Users', label: '2,000+ cardholders' },
];

// ── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const colors = useThemeColors();
  const [reduceMotion, setReduceMotion] = useState(false);
  const {
    signIn: googleSignIn,
    isLoading: isGoogleLoading,
    error: googleError,
  } = useGoogleAuth();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  return (
    <ScreenContainer style={styles.screen}>
      {/* Animated Card Illustration */}
      <View style={styles.illustrationWrap}>
        {CARD_GRADIENTS.map((gradient, i) => (
          <AnimatedCard
            key={i}
            gradient={gradient}
            networkLabel={NETWORK_LABELS[i]}
            index={i}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>

      {/* Logo + Brand */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(50).duration(0) : FadeInDown.delay(50).springify()} style={styles.logoWrap}>
        <View style={[styles.logoRing, { borderColor: colors.primary + '30' }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primarySoft }]}>
            <DynamicIcon name="Sparkles" size={28} color={colors.primary} strokeWidth={1.5} />
          </View>
        </View>
        <Text style={[styles.brandName, { color: colors.textPrimary }]}>
          Card Optimizer
        </Text>
      </Animated.View>

      {/* Headline */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(80).duration(0) : FadeInDown.delay(80).springify()} style={styles.headline}>
        <Text style={[styles.heroText, { color: colors.textPrimary }]}>
          Your cards,{'\n'}finally smart.
        </Text>
      </Animated.View>

      {/* Subheadline */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(100).duration(0) : FadeInDown.delay(100).springify()} style={styles.subWrap}>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          AI-powered card tracking, fee waiver prediction, and reward maximization.
        </Text>
      </Animated.View>

      {/* Google Sign-In CTA */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(150).duration(0) : FadeInDown.delay(150).springify()} style={styles.ctaWrap}>
        {googleError && (
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.errorBanner, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
            <DynamicIcon name="AlertCircle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {googleError}
            </Text>
          </Animated.View>
        )}

        <Button
          label={isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
          variant="primary"
          onPress={() => googleSignIn()}
          isLoading={isGoogleLoading}
          disabled={isGoogleLoading}
          icon={<GoogleIcon size={20} />}
          style={styles.googleBtn}
        />
      </Animated.View>

      {/* Trust badges */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(200).duration(0) : FadeInDown.delay(200).springify()} style={styles.trustWrap}>
        {TRUST_BADGES.map((badge) => (
          <View key={badge.label} style={styles.trustBadge}>
            <DynamicIcon name={badge.icon} size={14} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.trustLabel, { color: colors.textMuted }]}>
              {badge.label}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Footer */}
      <Animated.View entering={reduceMotion ? FadeInDown.delay(250).duration(0) : FadeInDown.delay(250).springify()} style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          By continuing, you agree to our{' '}
          <Text style={{ color: colors.primary }}>Terms</Text>
          {' '}and{' '}
          <Text style={{ color: colors.primary }}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </ScreenContainer>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // ── Card Illustration ──────────────────────────────────────────────────────
  illustrationWrap: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardWrap: {
    position: 'absolute',
  },
  // ── Logo ───────────────────────────────────────────────────────────────────
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wide,
  },
  // ── Headline ───────────────────────────────────────────────────────────────
  headline: {
    marginBottom: 12,
    alignItems: 'center',
  },
  heroText: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: tokens.fontSize.display * 1.2,
    textAlign: 'center',
  },
  subWrap: {
    marginBottom: 32,
    alignItems: 'center',
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.55,
    textAlign: 'center',
    maxWidth: 320,
  },
  // ── CTA ────────────────────────────────────────────────────────────────────
  ctaWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  googleBtn: {
    width: '100%',
    maxWidth: 360,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
    maxWidth: 360,
  },
  errorText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  // ── Trust ──────────────────────────────────────────────────────────────────
  trustWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    textAlign: 'center',
    lineHeight: tokens.fontSize.caption * 1.6,
  },
});
