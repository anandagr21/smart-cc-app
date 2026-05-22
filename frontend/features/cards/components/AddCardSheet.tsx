import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { CardCatalogResponse } from '../types/api';
import { useCardCatalog } from '../hooks/useCardCatalog';
import { useAddCard } from '../hooks/useAddCard';
import { CardCatalogList } from './CardCatalogList';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../theme/colors';

interface AddCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCardSheet: React.FC<AddCardSheetProps> = ({ visible, onClose }) => {
  const { data: catalog, isLoading: isCatalogLoading } = useCardCatalog();
  const { mutateAsync: addCard, isPending } = useAddCard();
  
  const [selectedCard, setSelectedCard] = useState<CardCatalogResponse | null>(null);
  const [nickname, setNickname] = useState('');

  const handleClose = () => {
    setSelectedCard(null);
    setNickname('');
    onClose();
  };

  const handleSave = async () => {
    if (!selectedCard) return;
    try {
      await addCard({
        card_catalog_id: selectedCard.id,
        nickname: nickname.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      alert('Failed to add card. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full h-[85%]"
        >
          <View className="flex-1 bg-background rounded-t-3xl border-t border-white/10 overflow-hidden shadow-2xl">
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-5 border-b border-white/5">
              <Text className="text-xl font-bold text-textPrimary tracking-tight">
                {selectedCard ? 'Configure Card' : 'Add New Card'}
              </Text>
              <TouchableOpacity onPress={handleClose} className="p-2 -mr-2 rounded-full bg-white/5">
                {/* @ts-ignore */}
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {selectedCard ? (
              <View className="flex-1 px-6 pt-6">
                <View className="bg-surface p-5 rounded-2xl border border-white/5 mb-8 shadow-sm">
                  <Text className="text-textSecondary text-xs uppercase tracking-widest mb-1">Selected Card</Text>
                  <Text className="text-textPrimary text-lg font-bold">{selectedCard.card_name}</Text>
                  <Text className="text-textMuted text-sm mt-1">{selectedCard.bank_name} • {selectedCard.network}</Text>
                </View>

                <Input
                  label="CARD NICKNAME (OPTIONAL)"
                  placeholder="e.g. Travel Rewards"
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="words"
                />

                <View className="mt-auto pb-10 pt-4">
                  <Button 
                    label="Save Card to Wallet" 
                    onPress={handleSave} 
                    isLoading={isPending}
                    className="shadow-glow"
                  />
                  <TouchableOpacity onPress={() => setSelectedCard(null)} className="mt-4 p-4 items-center">
                    <Text className="text-textSecondary font-medium text-sm">Choose a different card</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-1 pt-4">
                {isCatalogLoading ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                ) : (
                  <CardCatalogList 
                    catalog={catalog || []} 
                    onSelect={setSelectedCard} 
                  />
                )}
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
