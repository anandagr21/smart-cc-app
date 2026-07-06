import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useCards } from '@/features/cards/hooks/useCards';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { ProfileSummaryCard } from '@/features/profile/components/ProfileSummaryCard';
import { tokens } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const colors = useThemeColors();

  const { data: cards, isLoading: isLoadingCards } = useCards();
  const { data: transactionsData, isLoading: isLoadingTransactions } = useTransactions();

  const cardCount = cards?.length || 0;
  const txCount = transactionsData?.pages.flatMap((page) => page.data).length || 0;

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string, email: string) => {
    if (name && name !== 'User' && name !== 'Smart CC User') {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'ME';
  };

  const ThemePill = ({ mode, icon, label }: { mode: 'light' | 'dark' | 'system', icon: string, label: string }) => {
    const isActive = themeMode === mode;
    return (
      <TouchableOpacity
        onPress={() => setThemeMode(mode)}
        activeOpacity={0.7}
        style={[
          styles.themePillBtn,
          isActive && { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 }
        ]}
      >
        <DynamicIcon name={icon} size={14} color={isActive ? colors.primary : colors.textMuted} style={styles.themePillIcon} />
        <Text style={[
          styles.themePillText,
          {
            color: isActive ? colors.primary : colors.textMuted,
            fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium
          }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SettingsRow = ({ icon, label, onPress, danger = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.settingsRow,
        { borderBottomColor: colors.border }
      ]}
    >
      <View style={[styles.settingsIconWrap, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceElevated }]}>
        <DynamicIcon name={icon} size={18} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <Text style={[styles.settingsLabel, { color: danger ? colors.danger : colors.textPrimary }]}>
        {label}
      </Text>
      {!danger && <DynamicIcon name="ChevronRight" size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header / Avatar */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroSection}>
          <LinearGradient
            colors={[colors.primary, '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarWrap}
          >
            <Text style={styles.avatarText}>{getInitials(user?.full_name || '', user?.email || '')}</Text>
          </LinearGradient>
          <Text style={[styles.userEmail, { color: colors.textPrimary }]}>
            {user?.full_name || user?.email || 'User'}
          </Text>

          <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.borderHighlight }]}>
            <View style={styles.statItem}>
              {isLoadingCards ? (
                <SkeletonBox width={24} height={28} style={{ marginBottom: 4 }} borderRadius={4} />
              ) : (
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cardCount}</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cards</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.borderHighlight }]} />
            <View style={styles.statItem}>
              {isLoadingTransactions ? (
                <SkeletonBox width={24} height={28} style={{ marginBottom: 4 }} borderRadius={4} />
              ) : (
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{txCount}</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Transactions</Text>
            </View>
          </View>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <ProfileSummaryCard />
        </Animated.View>

        {/* Theme Settings */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemePill mode="system" icon="Monitor" label="System" />
            <ThemePill mode="light" icon="Sun" label="Light" />
            <ThemePill mode="dark" icon="Moon" label="Dark" />
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingsRow icon="Bell" label="Notifications" onPress={() => router.push('/notifications')} />
            <SettingsRow icon="Settings" label="Preferences" onPress={() => router.push('/preferences')} />
            <SettingsRow icon="Shield" label="Security" onPress={() => router.push('/security')} />
          </View>
        </Animated.View>

        {/* Admin Tools */}
        {user?.role === 'ADMIN' && (
          <Animated.View entering={FadeInDown.delay(175).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Admin</Text>
            <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SettingsRow icon="Shield" label="Feedback Dashboard" onPress={() => router.push('/admin/feedback')} />
              <SettingsRow icon="Monitor" label="Card Operations" onPress={() => router.push('/admin/operations')} />
            </View>
          </Animated.View>
        )}

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingsRow icon="LogOut" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </Animated.View>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Card Optimiser • v1.0.9
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...tokens.elevation.level2,
  },
  avatarText: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFF',
    letterSpacing: 1,
  },
  userEmail: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
    marginLeft: 16,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  themePillBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePillIcon: {
    marginRight: 6,
  },
  themePillText: {
    fontSize: tokens.fontSize.caption,
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
  versionText: {
    textAlign: 'center',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginTop: 20,
    marginBottom: 40,
  },
});
