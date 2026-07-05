import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CardCatalogResponse } from '../types/api';
import { useCards } from '../hooks/useCards';
import { useCardCatalog } from '../hooks/useCardCatalog';
import { useAddCard } from '../hooks/useAddCard';
import { CardCatalogList } from './CardCatalogList';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface AddCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCardSheet: React.FC<AddCardSheetProps> = ({ visible, onClose }) => {
  const { data: catalog, isLoading: isCatalogLoading } = useCardCatalog(visible);
  const { data: cards } = useCards();
  const { mutateAsync: addCard, isPending } = useAddCard();
  const colors = useThemeColors();

  // Cards the user already owns — used to filter/hide from catalog
  const ownedCatalogIds = useMemo(
    () => new Set((cards || []).map((c) => String(c.card_catalog_id))),
    [cards],
  );
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const insets = useSafeAreaInsets();

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
    } catch (err: any) {
      if (err?.response?.status === 409) {
        Alert.alert('Already Added', 'This card is already in your wallet.');
        handleClose(); // Close anyway since it's already there
      } else {
        Alert.alert('Error', 'Failed to add card. Please try again.');
      }
    }
  };

  const gradient = selectedCard
    ? (getNetworkGradient(selectedCard.network, isDark) as [string, string])
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.tapOutside} activeOpacity={1} onPress={handleClose} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
        >
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={isDark ? 85 : 95}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
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

          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {selectedCard ? 'Configure Card' : 'Add New Card'}
            </Text>
            {selectedCard ? (
              <TouchableOpacity
                onPress={() => setSelectedCard(null)}
                style={[styles.iconBtn, { backgroundColor: colors.glassSurface }]}
              >
                <DynamicIcon name="ArrowLeft" size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.iconBtn, { backgroundColor: colors.glassSurface }]}
              >
                <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {selectedCard ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.configContent}
            >
              <View style={styles.cardPreviewContainer}>
                {gradient && (
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardPreview}
                  >
                    <View style={styles.previewTopEdge} />
                    
                    <View style={styles.chipRow}>
                      <DynamicIcon name="Wifi" size={24} color="rgba(255,255,255,0.7)" style={{ transform: [{ rotate: '90deg' }] }} />
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.previewBankName}>{selectedCard.bank_name}</Text>
                      <Text style={styles.previewCardName} numberOfLines={1}>
                        {selectedCard.card_name}
                      </Text>
                      <Text style={styles.previewNetwork}>
                        {networkOverride || selectedCard.network}
                      </Text>
                    </View>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Input
                    label="Card Nickname (Optional)"
                    placeholder="e.g. Travel Rewards"
                    value={nickname}
                    onChangeText={setNickname}
                    autoCapitalize="words"
                    hint="A friendly name to identify this card"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Input
                    label="Last 4 Digits (Optional)"
                    placeholder="e.g. 1234"
                    value={last4Digits}
                    onChangeText={setLast4Digits}
                    keyboardType="numeric"
                    maxLength={4}
                    hint="Helps differentiate identical cards"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.networkLabel, { color: colors.textMuted }]}>CARD NETWORK</Text>
                  <View style={styles.networkPills}>
                    {['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS CLUB'].map((net) => {
                      const isActive = networkOverride === net || (!networkOverride && selectedCard.network.toUpperCase() === net);
                      return (
                        <TouchableOpacity
                          key={net}
                          onPress={() => setNetworkOverride(net)}
                          style={[
                            styles.networkPill,
                            { borderColor: colors.border, backgroundColor: colors.background },
                            isActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }
                          ]}
                        >
                          <Text style={[
                            styles.networkPillText,
                            { color: isActive ? colors.primary : colors.textSecondary },
                            isActive && { fontWeight: tokens.fontWeight.bold }
                          ]}>
                            {net}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button
                  label="Add to Wallet"
                  onPress={handleSave}
                  isLoading={isPending}
                  size="lg"
                  style={styles.saveBtn}
                  icon={<DynamicIcon name="Wallet" size={20} color="#FFFFFF" />}
                />
              </View>
            </ScrollView>
          ) : (
            <View style={styles.catalogView}>
              {isCatalogLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <CardCatalogList catalog={catalog || []} onSelect={setSelectedCard} ownedCatalogIds={ownedCatalogIds} />
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
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  tapOutside: {
    flex: 1,
  },
  sheet: {
    height: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tight,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  cardPreviewContainer: {
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPreview: {
    width: '95%',
    aspectRatio: 1.58,
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  previewTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewBankName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewCardName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tight,
    marginBottom: 16,
  },
  previewNetwork: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    alignSelf: 'flex-end',
  },
  formSection: {
    gap: 24,
    marginBottom: 40,
  },
  inputGroup: {},
  networkLabel: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 12,
    letterSpacing: tokens.letterSpacing.widest,
  },
  networkPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  networkPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  networkPillText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  actionRow: {
    marginTop: 'auto',
  },
  saveBtn: {
    width: '100%',
  },
  catalogView: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
