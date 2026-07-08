import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { CardStack } from '@/components/CreditCardIllustration';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { DynamicIcon } from '@/components/DynamicIcon';

// ── Google Logo SVG ──────────────────────────────────────────────────────────

const GoogleIcon = React.memo(({ size = 20 }: { size?: number }) => (
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
));

// ── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const colors = useThemeColors();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const {
    signIn: googleSignIn,
    isLoading: isGoogleLoading,
    error: googleError,
  } = useGoogleAuth();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const handleSignIn = useCallback(() => {
    googleSignIn();
  }, [googleSignIn]);

  return (
    <ScreenContainer style={styles.screen}>
      {/* ── Hero: Card Illustration ──────────────────────────────────────── */}
      <View style={styles.heroArea}>
        {/* Subtle radial backdrop behind cards */}
        <View
          pointerEvents="none"
          style={[
            styles.cardBackdrop,
            { backgroundColor: colors.primarySoft, opacity: 0.5 },
          ]}
        />
        <View style={styles.cardStack}>
          <CardStack reduceMotion={reduceMotion} />
        </View>
      </View>

      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <Animated.View
        entering={
          reduceMotion
            ? FadeInDown.delay(100).duration(0)
            : FadeInDown.delay(400).springify()
        }
        style={styles.brandRow}
      >
        <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.brandName, { color: colors.textSecondary }]}>
          Card Analyser
        </Text>
      </Animated.View>

      {/* ── Headline ─────────────────────────────────────────────────────── */}
      <Animated.View
        entering={
          reduceMotion
            ? FadeInDown.delay(120).duration(0)
            : FadeInDown.delay(460).springify()
        }
      >
        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          Your cards,{' '}
          <Text style={{ color: colors.primary }}>smarter</Text>
          {'.'}
        </Text>
      </Animated.View>

      {/* ── Subheadline ──────────────────────────────────────────────────── */}
      <Animated.View
        entering={
          reduceMotion
            ? FadeInDown.delay(140).duration(0)
            : FadeInDown.delay(520).springify()
        }
        style={styles.subWrap}
      >
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          AI that tracks spending, predicts fee waivers, and finds rewards you're missing.
        </Text>
      </Animated.View>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <Animated.View
        entering={
          reduceMotion
            ? FadeInDown.delay(170).duration(0)
            : FadeInDown.delay(600).springify()
        }
        style={styles.ctaWrap}
      >
        {googleError ? (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger + '30',
              },
            ]}
          >
            <DynamicIcon name="AlertCircle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {googleError}
            </Text>
          </Animated.View>
        ) : null}

        {/* Terms acceptance */}
        <TouchableOpacity
          style={styles.termsRow}
          activeOpacity={0.7}
          onPress={() => setTermsAccepted((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          accessibilityLabel="Accept terms and conditions"
        >
          <View
            style={[
              styles.checkbox,
              termsAccepted && { backgroundColor: colors.primary, borderColor: colors.primary },
              !termsAccepted && { borderColor: colors.border },
            ]}
          >
            {termsAccepted && (
              <DynamicIcon name="Check" size={12} color="#FFF" strokeWidth={3} />
            )}
          </View>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            I agree to the{' '}
            <Text style={{ color: colors.primary, fontWeight: tokens.fontWeight.semibold }}>
              Terms
            </Text>{' '}
            and{' '}
            <Text style={{ color: colors.primary, fontWeight: tokens.fontWeight.semibold }}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <Button
          label={isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
          variant="primary"
          onPress={handleSignIn}
          isLoading={isGoogleLoading}
          disabled={isGoogleLoading || !termsAccepted}
          icon={<GoogleIcon size={20} />}
          style={styles.googleBtn}
        />
      </Animated.View>

      {/* ── AI-powered tagline ────────────────────────────────────────────── */}
      <Animated.View
        entering={
          reduceMotion
            ? FadeInDown.delay(200).duration(0)
            : FadeInDown.delay(680).springify()
        }
        style={styles.taglineWrap}
      >
        <DynamicIcon
          name="Sparkles"
          size={13}
          color={colors.textMuted}
          strokeWidth={1.5}
        />
        <Text style={[styles.taglineText, { color: colors.textMuted }]}>
          AI-powered insights
        </Text>
      </Animated.View>
    </ScreenContainer>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: tokens.spacing['2xl'],
    paddingHorizontal: tokens.layout.screenPadding,
  },

  // ── Hero / Card Area ───────────────────────────────────────────────────
  heroArea: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xl,
  },
  cardBackdrop: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 0,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as any) : {}),
  },
  cardStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Brand ──────────────────────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: tokens.spacing.lg,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandName: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
  },

  // ── Headline ───────────────────────────────────────────────────────────
  headline: {
    fontSize: 36,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },

  // ── Subheadline ────────────────────────────────────────────────────────
  subWrap: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.6,
    textAlign: 'center',
    maxWidth: 320,
  },

  // ── Terms Checkbox ────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: tokens.spacing.lg,
    paddingHorizontal: 4,
    maxWidth: 340,
    alignSelf: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  termsText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.caption * 1.5,
    flex: 1,
  },

  // ── CTA ────────────────────────────────────────────────────────────────
  ctaWrap: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
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
    marginBottom: tokens.spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  errorText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },

  // ── Tagline ────────────────────────────────────────────────────────────
  taglineWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  taglineText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
});
