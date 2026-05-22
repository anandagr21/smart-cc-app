import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X, Search } from 'lucide-react-native';
import { useCards } from '../../cards/hooks/useCards';
import { useCreateTransaction } from '../hooks/useTransactions';
import { PaymentMode } from '../types/transaction.types';

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddTransactionSheetProps) {
  const { data: cardsData } = useCards();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.ONLINE);

  const handleSave = () => {
    if (!amount || !merchant || !selectedCardId) return;

    createTransaction(
      {
        user_card_id: selectedCardId,
        merchant_name: merchant,
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        transaction_date: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          setAmount('');
          setMerchant('');
          setSelectedCardId(null);
          setPaymentMode(PaymentMode.ONLINE);
          onClose();
        },
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-surfaceElevated rounded-t-3xl pt-6 pb-10 px-6 h-[80%] border-t border-white/10 shadow-lg shadow-black">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-textPrimary">Add Transaction</Text>
            <Pressable onPress={onClose} className="p-2 bg-white/5 rounded-full">
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Amount Input */}
            <View className="items-center mb-8 mt-4">
              <Text className="text-textSecondary text-sm mb-2 uppercase tracking-widest font-semibold">Amount</Text>
              <View className="flex-row items-center">
                <Text className="text-textPrimary text-4xl font-light mr-2">₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  className="text-textPrimary text-5xl font-bold p-0 m-0 w-48 text-center"
                  autoFocus
                />
              </View>
            </View>

            {/* Merchant Input */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-2 font-medium">Merchant Name</Text>
              <View className="flex-row items-center bg-surface/50 border border-white/5 rounded-2xl px-4 py-3">
                <Search size={20} color="#666" className="mr-3" />
                <TextInput
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Where did you spend?"
                  placeholderTextColor="#666"
                  className="flex-1 text-textPrimary text-lg h-8"
                />
              </View>
            </View>

            {/* Card Selection */}
            <View className="mb-6">
              <Text className="text-textSecondary text-sm mb-3 font-medium">Select Card</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {cardsData?.map((card) => {
                  const isSelected = selectedCardId === card.id;
                  const name = card.nickname || card.card_details?.card_name || 'Card';
                  const network = card.card_details?.network || '';
                  
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => setSelectedCardId(card.id)}
                      className={`mr-3 p-4 rounded-2xl border min-w-[140px] ${
                        isSelected ? 'bg-accent/20 border-accent/50' : 'bg-surface/50 border-white/5'
                      }`}
                    >
                      <Text className={`text-sm mb-1 ${isSelected ? 'text-accent' : 'text-textMuted'}`}>{network}</Text>
                      <Text className="text-textPrimary font-semibold" numberOfLines={1}>{name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Payment Mode */}
            <View className="mb-8">
              <Text className="text-textSecondary text-sm mb-3 font-medium">Payment Mode</Text>
              <View className="flex-row flex-wrap gap-2">
                {Object.values(PaymentMode).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => setPaymentMode(mode)}
                    className={`px-4 py-2 rounded-full border ${
                      paymentMode === mode ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5'
                    }`}
                  >
                    <Text className={paymentMode === mode ? 'text-textPrimary' : 'text-textMuted capitalize'}>
                      {mode}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={isPending || !amount || !merchant || !selectedCardId}
              className={`py-4 rounded-2xl items-center justify-center flex-row ${
                isPending || !amount || !merchant || !selectedCardId ? 'bg-white/10' : 'bg-accent'
              }`}
            >
              {isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className={`text-lg font-bold ${
                  !amount || !merchant || !selectedCardId ? 'text-textMuted' : 'text-black'
                }`}>
                  Add Transaction
                </Text>
              )}
            </Pressable>
            <View className="h-10" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
