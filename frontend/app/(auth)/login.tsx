import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Fingerprint } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { apiClient } from '@/services/api/client';
import { tokens } from '@/theme/tokens';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const colors = useThemeColors();

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
        try {
          const regResponse = await apiClient.post('/auth/register', {
            email: data.email,
            password: data.password,
            full_name: 'Smart CC User',
          });
          const token = regResponse.data.data.access_token;
          const user = regResponse.data.data.user;
          await login(token, user);
        } catch (regError: any) {
          const detail = regError.response?.data?.detail;
          const msg = Array.isArray(detail) ? detail[0].msg : detail;
          setError('email', { message: msg || 'Registration failed. Try again.' });
        }
      } else if (!error.response) {
        setError('email', { message: 'Cannot connect to server. Please check your connection.' });
      } else {
        const detail = error.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail[0].msg : detail;
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
            {/* @ts-ignore */}
            <Fingerprint size={28} color={colors.primary} strokeWidth={1.5} />
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
                leftIcon={<Mail size={18} color={colors.textMuted} strokeWidth={1.5} />}
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
                leftIcon={<Lock size={18} color={colors.textMuted} strokeWidth={1.5} />}
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
  },
  eyebrow: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroText: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: tokens.fontSize.display * 1.15,
    marginBottom: 12,
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.55,
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
});
