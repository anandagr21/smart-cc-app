import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import Animated, { FadeInUp } from 'react-native-reanimated';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface GlossarySheetProps {
  visible: boolean;
  onClose: () => void;
}

export const GlossarySheet: React.FC<GlossarySheetProps> = ({ visible, onClose }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={95}
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
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Animated.View entering={FadeInUp.duration(400)}>
              
              <View style={styles.titleRow}>
                <DynamicIcon name="BookOpen" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Intelligence Engine</Text>
              </View>
              
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                How Smart CC calculates long-term financial value beyond simple cashback.
              </Text>

              {/* VALUE AT RISK */}
              <View style={[styles.termBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.termHeader}>
                  <DynamicIcon name="AlertTriangle" size={18} color="#F59E0B" style={styles.termIcon} />
                  <Text style={[styles.termTitle, { color: '#F59E0B' }]}>Value at Risk (VaR)</Text>
                </View>
                <Text style={[styles.termDescription, { color: colors.textPrimary }]}>
                  The amount of real money you stand to lose if you fail to hit your fee waiver target.
                </Text>
                <Text style={[styles.termExplanation, { color: colors.textSecondary }]}>
                  It's not just the annual fee. The engine looks at your current spending velocity to calculate your probability of hitting the waiver organically. If you are far behind your target, the Value at Risk is higher.
                </Text>
                <View style={[styles.mathBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.mathText, { color: colors.textSecondary }]}>
                    VaR = Annual Fee × (1 - Completion Probability)
                  </Text>
                </View>
              </View>

              {/* URGENCY MULTIPLIER */}
              <View style={[styles.termBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.termHeader}>
                  <DynamicIcon name="Zap" size={18} color="#EF4444" style={styles.termIcon} />
                  <Text style={[styles.termTitle, { color: '#EF4444' }]}>Urgency Multiplier</Text>
                </View>
                <Text style={[styles.termDescription, { color: colors.textPrimary }]}>
                  A behavioral weight that forces the engine to prioritize saving a fee when time is running out.
                </Text>
                <Text style={[styles.termExplanation, { color: colors.textSecondary }]}>
                  As your card renewal date gets closer (e.g., less than 30 days left) and the remaining spend is still achievable, the financial consequence of putting spend on the wrong card increases dramatically. The engine applies a multiplier (up to 2.0x) to the Value at Risk to ensure it heavily outweighs raw cashback on other cards.
                </Text>
              </View>

            </Animated.View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
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
    height: '75%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerSpacer: { width: 36 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    marginBottom: 24,
  },
  termBox: {
    padding: 20,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: 16,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  termIcon: {
    marginRight: 8,
  },
  termTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  termDescription: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 24,
    marginBottom: 8,
  },
  termExplanation: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
    marginBottom: 16,
  },
  mathBox: {
    padding: 12,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  mathText: {
    fontFamily: 'Courier',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  }
});
