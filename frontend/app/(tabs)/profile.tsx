import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useCards } from '@/features/cards/hooks/useCards';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { tokens } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const { data: cards, isLoading: isLoadingCards } = useCards();
  const { data: transactionsData, isLoading: isLoadingTransactions } = useTransactions();
  const now = new Date();
  const { data: monthly, isLoading: isLoadingMonthly } = useMonthlyIntelligence(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const cardCount = cards?.length || 0;
  const txCount = transactionsData?.pages.flatMap((page) => page.data).length || 0;
  const optimizationRate = monthly?.optimization_rate || 0;

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string, email: string) => {
    if (name && name !== 'User' && name !== 'Card Analyser User') {
      const parts = name.trim().split(' ');
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'ME';
  };

  const ThemePill = ({ mode, icon, label }: { mode: 'light' | 'dark' | 'system'; icon: string; label: string }) => {
    const isActive = themeMode === mode;
    return (
      <TouchableOpacity
        onPress={() => setThemeMode(mode)}
        activeOpacity={0.7}
        style={[
          styles.themePillBtn,
          isActive && {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
      >
        <DynamicIcon
          name={icon}
          size={14}
          color={isActive ? (isDark ? '#FFFFFF' : colors.primary) : colors.textMuted}
          style={styles.themePillIcon}
        />
        <Text
          style={[
            styles.themePillText,
            {
              color: isActive ? (isDark ? '#FFFFFF' : colors.primary) : colors.textMuted,
              fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SettingsRow = ({ icon, label, subtitle, onPress, danger = false }: any) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.settingsRow, { borderBottomColor: colors.border }]}
      >
        <View
          style={[
            styles.settingsIconWrap,
            {
              backgroundColor: danger
                ? colors.dangerSoft
                : isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <DynamicIcon
            name={icon}
            size={18}
            color={danger ? colors.danger : colors.textPrimary}
            strokeWidth={1.8}
          />
        </View>

        <View style={styles.settingsLabelWrap}>
          <Text style={[styles.settingsLabel, { color: danger ? colors.danger : colors.textPrimary }]}>
            {label}
          </Text>
          {subtitle && (
            <Text style={[styles.settingsSub, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {!danger && <DynamicIcon name="ChevronRight" size={16} color={colors.textMuted} strokeWidth={2} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Executive Membership Card ──────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.membershipSection}>
          <LinearGradient
            colors={['#2D1B69', '#0F0A24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.membershipCard}
          >
            <View style={styles.membershipTop}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarInitials}>
                  {getInitials(user?.full_name || '', user?.email || '')}
                </Text>
              </View>

              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>Beta</Text>
              </View>
            </View>

            <View style={styles.membershipBottom}>
              <Text style={styles.userNameText}>
                {user?.full_name || 'Card Analyser user'}
              </Text>
              <Text style={styles.userEmailText}>
                {user?.email || 'hello@akaovia.com'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Portfolio 3-Column Metric Bar ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.metricGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>CARDS</Text>
            {isLoadingCards ? (
              <SkeletonBox width={32} height={24} borderRadius={4} />
            ) : (
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{cardCount}</Text>
            )}
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>TXNS</Text>
            {isLoadingTransactions ? (
              <SkeletonBox width={32} height={24} borderRadius={4} />
            ) : (
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{txCount}</Text>
            )}
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>EFFICIENCY</Text>
            {isLoadingMonthly ? (
              <SkeletonBox width={32} height={24} borderRadius={4} />
            ) : (
              <Text style={[styles.metricValue, { color: '#10B981' }]}>
                {optimizationRate ? `${Math.round(optimizationRate)}%` : '—'}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* ── Appearance Segmented Control ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>
          <View
            style={[
              styles.themeRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemePill mode="system" icon="Monitor" label="System" />
            <ThemePill mode="light" icon="Sun" label="Light" />
            <ThemePill mode="dark" icon="Moon" label="Dark" />
          </View>
        </Animated.View>

        {/* ── Preferences & Account ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREFERENCES
          </Text>
          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow
              icon="Bell"
              label="Notifications"
              subtitle="Alerts & recommendations"
              onPress={() => router.push('/notifications')}
            />
            <SettingsRow
              icon="Sliders"
              label="Card preferences"
              subtitle="Reward focus & fee protection"
              onPress={() => router.push('/preferences')}
            />
            <SettingsRow
              icon="Globe"
              label="Akaovia Portal"
              subtitle="Web dashboard & documentation"
              onPress={() => Linking.openURL('https://app.akaovia.com')}
            />
          </View>
        </Animated.View>

        {/* ── Admin Management ───────────────────────────────────────────── */}
        {user?.role === 'ADMIN' && (
          <Animated.View entering={FadeInDown.delay(110).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ADMIN CONSOLE
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <SettingsRow icon="MessageSquare" label="Feedback Dashboard" onPress={() => router.push('/admin/feedback')} />
              <SettingsRow icon="Cpu" label="Card Operations" onPress={() => router.push('/admin/operations')} />
            </View>
          </Animated.View>
        )}

        {/* ── Sign Out ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow icon="LogOut" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </Animated.View>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Card Analyser • v1.0.1
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 12,
  },
  membershipSection: {
    marginBottom: 20,
  },
  membershipCard: {
    borderRadius: tokens.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  membershipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarInitials: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFFFFF',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  tierPillCrown: {
    fontSize: 12,
  },
  tierPillText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
  },
  membershipBottom: {},
  userNameText: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  userEmailText: {
    fontSize: tokens.fontSize.caption,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.4,
    marginBottom: 8,
    marginLeft: 6,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themePillBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
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
    borderWidth: 1,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsLabelWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },
  settingsSub: {
    fontSize: tokens.fontSize.caption,
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 40,
  },
});
