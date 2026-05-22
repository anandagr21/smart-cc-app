import React, { useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X, Search } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useForm, Controller } from 'react-hook-form';
import { useCards } from '../../cards/hooks/useCards';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useUpdateTransaction } from '../hooks/useUpdateTransaction';
import { PaymentMode, TransactionResponse } from '../types/transaction.types';

interface TransactionFormSheetProps {
  visible: boolean;
  onClose: () => void;
  initialData?: TransactionResponse | null;
}

interface FormData {
  amount: string;
  merchant: string;
  selectedCardId: string;
  paymentMode: PaymentMode;
  transactionDate: string;
  description: string;
  status: string;
}

export function TransactionFormSheet({ visible, onClose, initialData }: TransactionFormSheetProps) {
  const { data: cardsData } = useCards();
  const { mutate: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();

  const isEditing = !!initialData;
  const isPending = isCreating || isUpdating;

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      amount: '',
      merchant: '',
      selectedCardId: '',
      paymentMode: PaymentMode.ONLINE,
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      status: 'posted', // Default assuming they added it later, or pending. We'll use posted.
    },
  });

  const watchAmount = watch('amount');
  const watchMerchant = watch('merchant');
  const watchSelectedCardId = watch('selectedCardId');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        reset({
          amount: initialData.amount.toString(),
          merchant: initialData.merchant_name,
          selectedCardId: initialData.user_card_id,
          paymentMode: initialData.payment_mode || PaymentMode.ONLINE,
          transactionDate: initialData.transaction_date,
          description: initialData.description || '',
          status: initialData.status,
        });
      } else {
        reset({
          amount: '',
          merchant: '',
          selectedCardId: cardsData?.[0]?.id || '',
          paymentMode: PaymentMode.ONLINE,
          transactionDate: new Date().toISOString().split('T')[0],
          description: '',
          status: 'posted',
        });
      }
    }
  }, [visible, initialData, reset, cardsData]);

  const onSubmit = (data: FormData) => {
    if (!data.amount || !data.merchant || !data.selectedCardId) return;

    if (isEditing) {
      updateTransaction(
        {
          id: initialData!.id,
          data: {
            user_card_id: data.selectedCardId,
            merchant_name: data.merchant,
            amount: parseFloat(data.amount),
            payment_mode: data.paymentMode,
            transaction_date: data.transactionDate,
            description: data.description,
            status: data.status as any,
          }
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createTransaction(
        {
          user_card_id: data.selectedCardId,
          merchant_name: data.merchant,
          amount: parseFloat(data.amount),
          payment_mode: data.paymentMode,
          transaction_date: data.transactionDate,
          description: data.description,
          // create schema defaults to status="posted" implicitly if not provided, or we pass it if schema allows
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  const isSaveDisabled = isPending || !watchAmount || !watchMerchant || !watchSelectedCardId;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60"
      >
        <BlurView 
          tint={Platform.OS === 'ios' ? 'dark' : 'dark'} // Expo blur handles 'dark' differently
          intensity={80}
          className="rounded-t-[36px] pt-6 h-[85%] border-t overflow-hidden"
          style={{ borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(18, 22, 32, 0.85)' }}
        >
          {/* Metallic Top Highlight */}
          <View className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

          {/* Header (Fixed) */}
          <View className="flex-row justify-between items-center px-6 mb-6">
            <Text className="text-2xl font-bold text-textPrimary tracking-tight">
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <Pressable onPress={onClose} className="p-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <X size={20} color="#F1F5F9" />
            </Pressable>
          </View>

          {/* Scrollable Body */}
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 120 }} // Space for sticky CTA
          >
            {/* Amount Input */}
            <View className="items-center mb-8 mt-4">
              <Text className="text-textSecondary text-sm mb-2 uppercase tracking-widest font-semibold">Amount</Text>
              <View className="flex-row items-center">
                <Text className="text-textPrimary text-4xl font-light mr-2">₹</Text>
                <Controller
                  control={control}
                  name="amount"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#666"
                      className="text-textPrimary text-5xl font-bold p-0 m-0 w-48 text-center"
                      autoFocus={!isEditing}
                    />
                  )}
                />
              </View>
            </View>

            {/* Merchant Input */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-2 font-medium">Merchant Name</Text>
              <View className="flex-row items-center bg-surface/50 border border-white/5 rounded-2xl px-4 py-3">
                <Search size={20} color="#666" className="mr-3" />
                <Controller
                  control={control}
                  name="merchant"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Where did you spend?"
                      placeholderTextColor="#666"
                      className="flex-1 text-textPrimary text-lg h-8"
                    />
                  )}
                />
              </View>
            </View>

            {/* Card Selection */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-3 font-medium">Select Card</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <Controller
                  control={control}
                  name="selectedCardId"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <>
                      {cardsData?.map((card) => {
                        const isSelected = value === card.id;
                        const name = card.nickname || card.card_details?.card_name || 'Card';
                        const network = card.card_details?.network || '';
                        
                        return (
                          <Pressable
                            key={card.id}
                            onPress={() => onChange(card.id)}
                            className={`mr-3 p-4 rounded-2xl border min-w-[140px] ${
                              isSelected ? 'bg-accent/20 border-accent/50' : 'bg-surface/50 border-white/5'
                            }`}
                          >
                            <Text className={`text-sm mb-1 ${isSelected ? 'text-accent' : 'text-textMuted'}`}>{network}</Text>
                            <Text className="text-textPrimary font-semibold" numberOfLines={1}>{name}</Text>
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                />
              </ScrollView>
            </View>

            {/* Date Input */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-2 font-medium">Date</Text>
              <View className="flex-row items-center bg-surface/50 border border-white/5 rounded-2xl px-4 py-3">
                <Controller
                  control={control}
                  name="transactionDate"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#666"
                      className="flex-1 text-textPrimary text-lg h-8"
                    />
                  )}
                />
              </View>
            </View>

            {/* Description Input */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-2 font-medium">Description</Text>
              <View className="flex-row items-center bg-surface/50 border border-white/5 rounded-2xl px-4 py-3">
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional notes"
                      placeholderTextColor="#666"
                      className="flex-1 text-textPrimary text-lg h-8"
                    />
                  )}
                />
              </View>
            </View>

            {/* Payment Mode */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-3 font-medium">Payment Mode</Text>
              <View className="flex-row flex-wrap gap-2">
                <Controller
                  control={control}
                  name="paymentMode"
                  render={({ field: { onChange, value } }) => (
                    <>
                      {Object.values(PaymentMode).map((mode) => (
                        <Pressable
                          key={mode}
                          onPress={() => onChange(mode)}
                          className={`px-4 py-2 rounded-full border ${
                            value === mode ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5'
                          }`}
                        >
                          <Text className={value === mode ? 'text-textPrimary' : 'text-textMuted capitalize'}>
                            {mode}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                />
              </View>
            </View>

            {/* Status Mode */}
            <View className="mb-8">
              <Text className="text-textSecondary text-sm mb-3 font-medium">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                <Controller
                  control={control}
                  name="status"
                  render={({ field: { onChange, value } }) => (
                    <>
                      {['pending', 'posted'].map((statusOption) => (
                        <Pressable
                          key={statusOption}
                          onPress={() => onChange(statusOption)}
                          className={`px-4 py-2 rounded-full border ${
                            value === statusOption ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5'
                          }`}
                        >
                          <Text className={value === statusOption ? 'text-textPrimary' : 'text-textMuted capitalize'}>
                            {statusOption}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                />
              </View>
            </View>

          </ScrollView>

          {/* Sticky Save Button */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pt-4 pb-8" style={{ backgroundColor: 'rgba(18, 22, 32, 0.95)' }}>
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSaveDisabled}
              className={`py-4 rounded-2xl items-center justify-center flex-row ${
                isSaveDisabled ? 'bg-white/10' : 'bg-accent'
              }`}
            >
              {isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className={`text-lg font-bold ${
                  isSaveDisabled ? 'text-textMuted' : 'text-white'
                }`}>
                  {isEditing ? 'Save Changes' : 'Add Transaction'}
                </Text>
              )}
            </Pressable>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
