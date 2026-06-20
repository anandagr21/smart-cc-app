import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/features/notifications/hooks/useNotifications';
import { NotificationType } from '@/features/notifications/types/api';
import { DynamicIcon } from '@/components/DynamicIcon';

const getIconNameForType = (type: NotificationType): string => {
  switch (type) {
    case 'SECURITY': return 'ShieldAlert';
    case 'INSIGHT': return 'Zap';
    case 'CARD_INTELLIGENCE': return 'CreditCard';
    case 'RECOMMENDATION': return 'Sparkles';
    case 'WORKSPACE': return 'FolderKanban';
    case 'SYSTEM':
    default: return 'Bell';
  }
};

const getColorForType = (type: NotificationType, colors: any) => {
  switch (type) {
    case 'SECURITY': return { color: colors.danger, bg: colors.dangerSoft };
    case 'INSIGHT': return { color: colors.warning, bg: colors.warningSoft };
    case 'RECOMMENDATION': return { color: colors.success, bg: colors.successSoft };
    case 'CARD_INTELLIGENCE':
    case 'WORKSPACE':
    case 'SYSTEM':
    default: return { color: colors.primary, bg: colors.primarySoft };
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function NotificationsModal() {
  const router = useRouter();
  const colors = useThemeColors();
  
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleNotificationPress = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const notifications = data?.notifications || [];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {notifications.some(n => !n.is_read) && (
            <TouchableOpacity onPress={() => markAllAsRead.mutate()}>
              <Text style={{ color: colors.primary, fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium }}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
          >
            <DynamicIcon name="X" size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <DynamicIcon name="Bell" size={48} color={colors.border} style={{ marginBottom: 16 }} />
          <Text style={{ color: colors.textSecondary, fontSize: tokens.fontSize.bodyLg, textAlign: 'center' }}>
            You're all caught up!
          </Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {notifications.map((n, i) => {
            const iconName = getIconNameForType(n.type);
            const { color, bg } = getColorForType(n.type, colors);
            
            return (
              <Animated.View
                key={n.id}
                entering={FadeInDown.delay(Math.min(i, 10) * 50).springify()}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleNotificationPress(n)}
                  style={[
                    styles.notifRow, 
                    { backgroundColor: n.is_read ? colors.background : colors.surface, borderColor: colors.border },
                    !n.is_read && { shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 }
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                    <DynamicIcon name={iconName} size={20} color={color} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.contentHeader}>
                      <Text style={[styles.notifTitle, { color: n.is_read ? colors.textSecondary : colors.textPrimary }]}>{n.title}</Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime(n.created_at)}</Text>
                    </View>
                    <Text style={[styles.body, { color: n.is_read ? colors.textMuted : colors.textSecondary }]} numberOfLines={2}>{n.body}</Text>
                  </View>
                  {!n.is_read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
    alignSelf: 'center',
  },
});
