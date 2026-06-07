import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CardCatalogResponse } from '../types/api';
import { useCardCatalog } from '../hooks/useCardCatalog';
import { useAddCard } from '../hooks/useAddCard';
import { CardCatalogList } from './CardCatalogList';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

interface AddCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCardSheet: React.FC<AddCardSheetProps> = ({ visible, onClose }) => {
  const { data: catalog, isLoading: isCatalogLoading } = useCardCatalog();
  const { mutateAsync: addCard, isPending } = useAddCard();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const [selectedCard, setSelectedCard] = useState<CardCatalogResponse | null>(null);
  const [nickname, setNickname] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [networkOverride, setNetworkOverride] = useState('');

  const handleClose = () => {
    setSelectedCard(null);
    setNickname('');
    setLast4Digits('');
    setNetworkOverride('');
    onClose();
  };

  const handleSave = async () => {
    if (!selectedCard) return;
    try {
      await addCard({
        card_catalog_id: selectedCard.id,
        nickname: nickname.trim() || undefined,
        last_4_digits: last4Digits.trim() || undefined,
        network_override: networkOverride || undefined,
      });
      handleClose();
    } catch {
      // error handled by hook
    }
  };

  const gradient = selectedCard
    ? (getNetworkGradient(selectedCard.network, isDark) as [string, string])
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={85}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
              },
            ]}
          />
          {/* Top highlight */}
          <View
            style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]}
            pointerEvents="none"
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {selectedCard ? 'Configure Card' : 'Add New Card'}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}
            >
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {selectedCard ? (
            <View style={styles.configView}>
              {/* Mini card preview */}
              {gradient && (
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardPreview}
                >
                  <View style={styles.previewTopEdge} />
                  <Text style={styles.previewBankName}>{selectedCard.bank_name}</Text>
                  <Text style={styles.previewCardName} numberOfLines={1}>
                    {selectedCard.card_name}
                  </Text>
                  <Text style={styles.previewNetwork}>{selectedCard.network.toUpperCase()}</Text>
                </LinearGradient>
              )}

              <View style={styles.nicknameWrap}>
                <Input
                  label="Card Nickname (Optional)"
                  placeholder="e.g. Travel Rewards"
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="words"
                  hint="A friendly name to identify this card"
                />
              </View>
              
              <View style={styles.nicknameWrap}>
                <Input
                  label="Last 4 Digits (Optional)"
                  placeholder="e.g. 1234"
                  value={last4Digits}
                  onChangeText={setLast4Digits}
                  keyboardType="numeric"
                  maxLength={4}
                  hint="Helps differentiate between multiple cards of the same type"
                />
              </View>

              <View style={styles.nicknameWrap}>
                <Text style={{ fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.bold, color: colors.textMuted, marginBottom: 8, letterSpacing: tokens.letterSpacing.widest }}>CARD NETWORK</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS CLUB'].map((net) => {
                    const isActive = networkOverride === net || (!networkOverride && selectedCard.network.toUpperCase() === net);
                    return (
                      <TouchableOpacity
                        key={net}
                        onPress={() => setNetworkOverride(net)}
                        style={[
                          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                          isActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }
                        ]}
                      >
                        <Text style={{ fontSize: tokens.fontSize.micro, color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium }}>{net}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button
                  label="Save to Wallet"
                  onPress={handleSave}
                  isLoading={isPending}
                  style={styles.saveBtn}
                />
                <TouchableOpacity
                  onPress={() => setSelectedCard(null)}
                  style={styles.backLink}
                >
                  <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>
                    Choose a different card
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.catalogView}>
              {isCatalogLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <CardCatalogList catalog={catalog || []} onSelect={setSelectedCard} />
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '85%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cardPreview: {
    borderRadius: tokens.radius.card,
    padding: 20,
    marginBottom: 24,
    height: 120,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  previewTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  previewBankName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  previewCardName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
  },
  previewNetwork: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
    alignSelf: 'flex-end',
  },
  nicknameWrap: {
    marginBottom: 16,
  },
  actionRow: {
    marginTop: 'auto',
    paddingBottom: 32,
  },
  saveBtn: {
    width: '100%',
    marginBottom: 16,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  catalogView: {
    flex: 1,
    paddingTop: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
