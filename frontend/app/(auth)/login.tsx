import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { apiClient } from '@/services/api/client';
import { tokens } from '@/theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { DynamicIcon } from '@/components/DynamicIcon';

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const colors = useThemeColors();

  const {
    signIn: googleSignIn,
    isLoading: isGoogleLoading,
    error: googleError,
  } = useGoogleAuth();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const token = response.data.data.access_token;
      const user = response.data.data.user;
      await login(token, user);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        // Auto-register: user doesn't exist yet
        try {
          const regResponse = await apiClient.post('/auth/register', {
            email: data.email,
            password: data.password,
            full_name: 'Smart CC User',
          });
          const token = regResponse?.data?.data?.access_token;
          const user = regResponse?.data?.data?.user;
          if (!token || !user) {
            setError('email', { message: 'Registration succeeded but response was unexpected. Please try signing in.' });
            return;
          }
          await login(token, user);
        } catch (regError: any) {
          const detail = regError?.response?.data?.detail;
          const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
          setError('email', { message: msg || 'Registration failed. Try again.' });
        }
      } else if (!error.response) {
        setError('email', { message: 'Cannot connect to server. Please check your connection.' });
      } else {
        const detail = error.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
        setError('email', { message: msg || 'Authentication failed' });
      }
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      {/* Logo mark */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.logoWrap}>
        <View style={[styles.logoRing, { borderColor: colors.primarySoft }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primarySoft }]}>
            <DynamicIcon name="Fingerprint" size={28} color={colors.primary} strokeWidth={1.5} />
          </View>
        </View>
      </Animated.View>

      {/* Headline */}
      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.headline}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          Smart CC Intelligence
        </Text>
        <Text style={[styles.heroText, { color: colors.textPrimary }]}>
          Optimize every{'\n'}transaction.
        </Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          Connect your wallet to unlock AI-powered financial insights.
        </Text>
      </Animated.View>

      {/* Form card */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formWrap}>
        <Card variant="elevated" padded>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                leftIcon={<DynamicIcon name="Mail" size={18} color={colors.textMuted} strokeWidth={1.5} />}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                leftIcon={<DynamicIcon name="Lock" size={18} color={colors.textMuted} strokeWidth={1.5} />}
                style={{ marginBottom: 0 }}
              />
            )}
          />
        </Card>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.ctaWrap}>
        <Button
          label="Sign In"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          style={styles.ctaBtn}
        />

        <View style={styles.biometricRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.biometricText, { color: colors.textMuted }]}>or continue with</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {googleError && (
          <Text style={[styles.googleError, { color: colors.danger }]}>
            {googleError}
          </Text>
        )}

        <Button
          label="Google"
          variant="secondary"
          onPress={() => googleSignIn()}
          isLoading={isGoogleLoading}
          disabled={isGoogleLoading}
          icon={<GoogleIcon size={18} />}
          style={styles.ctaBtn}
        />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginBottom: 32,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroText: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: tokens.fontSize.display * 1.15,
    marginBottom: 12,
    textAlign: 'center',
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.55,
    textAlign: 'center',
  },
  formWrap: {
    marginBottom: 20,
  },
  ctaWrap: {
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    marginBottom: 24,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  biometricText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },
  biometricBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleError: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    textAlign: 'center',
    marginBottom: 12,
  },
});
