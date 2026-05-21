import React from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';
import { RecommendationRequest, PaymentMode } from '../types/api';

const recommendationSchema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required'),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  payment_mode: z.enum(['ANY', 'ONLINE', 'OFFLINE', 'INTERNATIONAL']).default('ANY'),
});

type RecommendationFormData = z.infer<typeof recommendationSchema>;

interface RecommendationFormProps {
  onSubmit: (data: RecommendationRequest) => void;
  isLoading: boolean;
}

export const RecommendationForm: React.FC<RecommendationFormProps> = ({ onSubmit, isLoading }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      merchant_name: '',
      payment_mode: 'ANY',
    }
  });

  const onFormSubmit = (data: RecommendationFormData) => {
    onSubmit({
      merchant_name: data.merchant_name,
      amount: data.amount as number,
      payment_mode: data.payment_mode as PaymentMode,
    });
  };

  return (
    <View className="mb-10">
      <AnimatedContainer delay={100}>
        <Controller
          control={control}
          name="merchant_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="MERCHANT"
              placeholder="e.g. Amazon, Uber, Starbucks"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.merchant_name?.message as string}
            />
          )}
        />
      </AnimatedContainer>

      <AnimatedContainer delay={200}>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="ESTIMATED AMOUNT (₹)"
              placeholder="0.00"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value?.toString() || ''}
              error={errors.amount?.message as string}
              className="mb-8"
            />
          )}
        />
      </AnimatedContainer>

      <AnimatedContainer delay={300}>
        <Button 
          label="Analyze Transaction" 
          onPress={handleSubmit(onFormSubmit)} 
          isLoading={isLoading} 
        />
      </AnimatedContainer>
    </View>
  );
};
