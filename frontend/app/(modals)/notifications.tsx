import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Bell, ShieldAlert, Zap } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function NotificationsModal() {
  const router = useRouter();
  const colors = useThemeColors();

  const MOCK_NOTIFS = [
    {
      id: '1',
      title: 'New optimization insight',
      body: 'You could have saved ₹120 on your last Starbucks purchase.',
      time: '2h ago',
      icon: Zap,
      color: colors.warning,
      bg: colors.warningSoft,
    },
    {
      id: '2',
      title: 'Security Alert',
      body: 'New login detected from Mac OS device.',
      time: '1d ago',
      icon: ShieldAlert,
      color: colors.danger,
      bg: colors.dangerSoft,
    },
    {
      id: '3',
      title: 'Welcome to Smart CC',
      body: 'Your intelligent wallet is ready to use.',
      time: '2d ago',
      icon: Bell,
      color: colors.primary,
      bg: colors.primarySoft,
    },
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surface }]}
        >
          {/* @ts-ignore */}
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {MOCK_NOTIFS.map((n, i) => (
          <Animated.View
            key={n.id}
            entering={FadeInDown.delay(i * 100).springify()}
            style={[styles.notifRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: n.bg }]}>
              {/* @ts-ignore */}
              <n.icon size={20} color={n.color} />
            </View>
            <View style={styles.content}>
              <View style={styles.contentHeader}>
                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{n.title}</Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>{n.time}</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{n.body}</Text>
            </View>
          </Animated.View>
        ))}
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
  notifRow: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
  },
  time: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.4,
  },
});
