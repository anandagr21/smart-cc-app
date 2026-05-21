import React from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { useAuthStore } from '../../features/auth/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    await login('dummy_token_123', { email: data.email });
  };

  return (
    <ScreenContainer className="justify-center">
      <AnimatedContainer delay={100}>
        <View className="mb-10">
          <Text className="text-4xl font-bold text-textPrimary mb-2">Smart CC</Text>
          <Text className="text-textSecondary text-lg">Sign in to optimize your rewards</Text>
        </View>
      </AnimatedContainer>

      <AnimatedContainer delay={200}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="Enter your email"
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
              label="Password"
              placeholder="Enter your password"
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
          className="mt-6"
        />
      </AnimatedContainer>
    </ScreenContainer>
  );
}
