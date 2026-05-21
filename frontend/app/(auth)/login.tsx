import React, { useEffect } from 'react';
import { apiClient } from '../../services/api/client';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { useAuthStore } from '../../features/auth/store/authStore';
import { colors } from '../../theme/colors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Subtle ambient background motion
const AmbientBackground = () => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <View className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" style={{ zIndex: -1 }}>
      <Animated.View 
        style={[{ width: 300, height: 300, borderRadius: 150, backgroundColor: colors.accent, position: 'absolute', top: -100, right: -50 }, animatedStyle]}
        className="opacity-30 blur-3xl shadow-glow"
      />
    </View>
  );
};

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

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
      <AmbientBackground />
      
      <AnimatedContainer delay={100} className="mb-12">
        <Text className="text-accent font-bold text-sm tracking-widest uppercase mb-4 opacity-80">
          Smart CC Intelligence
        </Text>
        <Text className="text-5xl font-bold text-textPrimary mb-4 tracking-tighter leading-tight">
          Optimize every transaction.
        </Text>
        <Text className="text-textSecondary text-lg leading-6 font-medium max-w-[85%]">
          Connect your wallet to unlock AI-powered financial insights.
        </Text>
      </AnimatedContainer>

      <AnimatedContainer delay={200} className="w-full">
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
            />
          )}
        />
      </AnimatedContainer>

      <AnimatedContainer delay={300}>
        <Button 
          label="Sign In" 
          onPress={handleSubmit(onSubmit)} 
          isLoading={isSubmitting} 
          className="mt-8 shadow-glow"
        />
      </AnimatedContainer>
    </ScreenContainer>
  );
}
