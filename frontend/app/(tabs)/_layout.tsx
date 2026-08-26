import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { DynamicIcon } from '@/components/DynamicIcon';

const TABS = [
  { name: 'index', route: '/', icon: 'House', label: 'Home' },
  { name: 'cards', route: '/cards', icon: 'Wallet', label: 'Wallet' },
  { name: 'history', route: '/history', icon: 'BarChart2', label: 'Activity' },
  { name: 'profile', route: '/profile', icon: 'User', label: 'Profile' },
];

interface TabButtonProps {
  tab: typeof TABS[0];
  isActive: boolean;
  onPress: () => void;
  colors: any;
  isDark: boolean;
  unreadCount?: number;
}

function TabButton({ tab, isActive, onPress, colors, isDark, unreadCount }: TabButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, tokens.spring.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, tokens.spring.calm);
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = isActive
    ? '#8B5CF6'
    : (isDark ? '#6B7280' : '#9CA3AF');

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabBtn}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabBtnInner, animStyle]}>
        <View style={styles.iconContainer}>
          {isActive && (
            <View style={styles.activeIconGlow} />
          )}
          <DynamicIcon
            name={tab.icon}
            size={22}
            color={iconColor}
            strokeWidth={isActive ? 2.4 : 1.6}
          />
          {!!unreadCount && unreadCount > 0 && (
            <View style={[styles.badgeContainer, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isActive ? '#8B5CF6' : iconColor,
              fontWeight: isActive ? tokens.fontWeight.bold : tokens.fontWeight.medium,
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
      {/* Active indicator — dot below */}
      {isActive && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );
}

function TabBar() {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isDark = colors.isDark;

  const isActive = (tabRoute: string) => {
    if (tabRoute === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(tabRoute);
  };

  const { data: notificationsData } = useNotifications();
  const unreadCount = notificationsData?.unread_count || 0;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isDark ? '#0D0F1A' : colors.surface,
          borderTopColor: isDark ? 'rgba(139, 92, 246, 0.15)' : colors.border,
          borderTopWidth: isDark ? 1 : StyleSheet.hairlineWidth,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={isActive(tab.route)}
            onPress={() => router.push(tab.route as any)}
            colors={colors}
            isDark={isDark}
            unreadCount={tab.name === 'profile' ? unreadCount : 0}
          />
        ))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 6,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 56,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 30,
  },
  activeIconGlow: {
    position: 'absolute',
    width: 36,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 3,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
