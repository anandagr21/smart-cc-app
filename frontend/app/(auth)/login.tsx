import React from 'react';
import { apiClient } from '../../services/api/client';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const colors = useThemeColors();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const token = response.data.data.access_token;
      await login(token, { email: data.email });
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        try {
          const regResponse = await apiClient.post('/auth/register', {
            email: data.email,
            password: data.password,
            full_name: 'Smart CC User',
          });
          const token = regResponse.data.data.access_token;
          await login(token, { email: data.email });
        } catch (regError: any) {
          const detail = regError.response?.data?.detail;
          const msg = Array.isArray(detail) ? detail[0].msg : detail;
          alert(msg || 'Auto-registration failed. Check your credentials.');
        }
      } else {
        const detail = error.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail[0].msg : detail;
        alert(msg || 'Authentication failed');
      }
    }
  };

  return (
    <ScreenContainer className="justify-center">
      <AnimatedContainer delay={100} className="mb-10 px-2">
        <Text style={{ color: colors.primary }} className="font-bold text-xs tracking-widest uppercase mb-3 opacity-90">
          Smart CC Intelligence
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-5xl font-bold mb-3 tracking-tighter leading-tight">
          Optimize every transaction.
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-lg leading-6 font-medium max-w-[85%]">
          Connect your wallet to unlock AI-powered financial insights.
        </Text>
      </AnimatedContainer>

      <AnimatedContainer delay={200} className="w-full">
        <Card variant="glass" className="mb-8">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="EMAIL ADDRESS"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="PASSWORD"
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                className="mb-0" // Remove bottom margin for the last input in card
              />
            )}
          />
        </Card>
      </AnimatedContainer>

      <AnimatedContainer delay={300}>
        <Button 
          label="Sign In" 
          onPress={handleSubmit(onSubmit)} 
          isLoading={isSubmitting} 
          className="w-full shadow-glow"
        />
      </AnimatedContainer>
    </ScreenContainer>
  );
}
