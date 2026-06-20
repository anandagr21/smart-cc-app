import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function SecurityModal() {
  const router = useRouter();
  const colors = useThemeColors();

  const SettingsRow = ({ icon, label, RightComponent }: any) => (
    <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingsIconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <DynamicIcon name={icon} size={18} color={colors.textSecondary} />
      </View>
      <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      {RightComponent}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Security</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surface }]}
        >
          <DynamicIcon name="X" size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity activeOpacity={0.7}>
              <SettingsRow
                icon="Lock"
                label="Change Password"
                RightComponent={<DynamicIcon name="ChevronRight" size={18} color={colors.textMuted} />}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Active Sessions</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sessionRow}>
              <View style={[styles.settingsIconWrap, { backgroundColor: colors.successSoft }]}>
                <DynamicIcon name="Smartphone" size={18} color={colors.success} />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>iPhone 14 Pro</Text>
                <Text style={[styles.sessionMeta, { color: colors.success }]}>Current Device • Mumbai, IN</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
    marginLeft: 16,
  },
  cardGroup: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingsLabel: {
    flex: 1,
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionMeta: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginTop: 4,
  },
});
