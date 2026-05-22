import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { CardCatalogResponse } from '../types/api';
import { useCardCatalog } from '../hooks/useCardCatalog';
import { useAddCard } from '../hooks/useAddCard';
import { CardCatalogList } from './CardCatalogList';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { useThemeStore } from '../../theme/store/themeStore';

interface AddCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCardSheet: React.FC<AddCardSheetProps> = ({ visible, onClose }) => {
  const { data: catalog, isLoading: isCatalogLoading } = useCardCatalog();
  const { mutateAsync: addCard, isPending } = useAddCard();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0B0E14');
  
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
          <BlurView 
            tint={isDark ? 'dark' : 'light'} 
            intensity={80}
            className="flex-1 rounded-t-[36px] overflow-hidden"
            style={[
              tokens.elevation.level3,
              { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder, borderWidth: StyleSheet.hairlineWidth }
            ]}
          >
            {/* Metallic Top Highlight */}
            <View className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: colors.glassHighlight }} />
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-5 mb-2">
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

          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
