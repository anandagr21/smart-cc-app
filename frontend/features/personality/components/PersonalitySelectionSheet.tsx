import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X, Sparkles, Plane, ShieldAlert, Scale, LayoutList } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { OptimizationPersonality, useUpdatePersonality } from '../api/personalityApi';

interface PersonalitySelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  activePersonality: OptimizationPersonality;
}

export const PersonalitySelectionSheet: React.FC<PersonalitySelectionSheetProps> = ({
  visible,
  onClose,
  activePersonality,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const { mutateAsync: updatePersonality } = useUpdatePersonality();

  const handleSelect = async (personality: OptimizationPersonality) => {
    if (personality !== activePersonality) {
      try {
        await updatePersonality(personality);
      } catch (e) {
        console.error("Failed to update personality:", e);
      }
    }
    onClose();
  };

  const options = [
    {
      id: OptimizationPersonality.MAXIMIZE_REWARDS,
      title: 'Maximize Rewards',
      description: 'Focused on extracting the highest immediate return from every transaction.',
      icon: <Sparkles size={20} color={colors.primary} />,
      color: colors.primary,
      disabled: false,
    },
    {
      id: OptimizationPersonality.FEE_MINIMIZATION,
      title: 'Fee Minimization',
      description: 'Focused on preserving fee waivers and reducing annual fee leakage.',
      icon: <ShieldAlert size={20} color={colors.warning} />,
      color: colors.warning,
      disabled: false,
    },
    {
      id: OptimizationPersonality.BALANCED_INTELLIGENCE,
      title: 'Balanced Intelligence',
      description: 'Blends immediate rewards with long-term portfolio health and fee protection.',
      icon: <Scale size={20} color={colors.textSecondary} />,
      color: colors.textSecondary,
      disabled: false,
    },
    {
      id: OptimizationPersonality.TRAVEL_OPTIMIZATION,
      title: 'Travel Optimization',
      description: 'Focused on accelerating long-term travel milestones and premium reward unlocks.',
      icon: <Plane size={20} color={colors.success} />,
      color: colors.success,
      disabled: true,
    },
    {
      id: OptimizationPersonality.WALLET_SIMPLICITY,
      title: 'Wallet Simplicity',
      description: 'Minimizes cognitive load by favoring fewer cards and simpler reward structures.',
      icon: <LayoutList size={20} color={colors.textMuted} />,
      color: colors.textMuted,
      disabled: true,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
          <View
            style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]}
            pointerEvents="none"
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Portfolio Philosophy
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text style={[styles.supportingCopy, { color: colors.textSecondary }]}>
              Select the strategic lens you want the system to optimize for.
            </Text>

            <View style={styles.optionsList}>
              {options.map((option) => {
                const isActive = option.id === activePersonality;
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.7}
                    onPress={() => !option.disabled && handleSelect(option.id)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                        borderColor: isActive ? option.color : 'rgba(255,255,255,0.05)',
                        opacity: option.disabled ? 0.4 : 1,
                      }
                    ]}
                    disabled={option.disabled}
                  >
                    <View style={styles.optionHeaderRow}>
                      <View style={styles.optionIconWrap}>
                        {option.icon}
                      </View>
                      <Text style={[styles.optionTitle, { color: isActive ? option.color : colors.textPrimary }]}>
                        {option.title}
                      </Text>
                      {option.disabled && (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: 'bold' }}>COMING SOON</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
    maxHeight: '90%',
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  supportingCopy: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: 16,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  optionIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
  },
  optionDescription: {
    fontSize: tokens.fontSize.caption,
    lineHeight: 20,
  }
});
