import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';

import { BlurView } from 'expo-blur';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { DynamicIcon } from '@/components/DynamicIcon';

const TABS = [
  { name: 'index', route: '/', icon: 'Sparkles', label: 'Analyze' },
  { name: 'cards', route: '/cards', icon: 'CreditCard', label: 'Wallet' },
  { name: 'history', route: '/history', icon: 'History', label: 'Activity' },
  { name: 'profile', route: '/profile', icon: 'User', label: 'Profile' },
];

interface TabButtonProps {
  tab: typeof TABS[0];
  isActive: boolean;
  onPress: () => void;
  colors: any;
  unreadCount?: number;
}

function TabButton({ tab, isActive, onPress, colors, unreadCount }: TabButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.88, tokens.spring.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, tokens.spring.calm);
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabBtn}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabBtnInner, animStyle]}>
        {/* Active pill background */}
        {isActive && (
          <View
            style={[
              styles.activePill,
              { backgroundColor: colors.primarySoft },
            ]}
          />
        )}
        <View>
          <DynamicIcon
            name={tab.icon}
            size={22}
            color={isActive ? colors.primary : colors.textMuted}
            strokeWidth={isActive ? 2.5 : 1.8}
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
              color: isActive ? colors.primary : colors.textMuted,
              fontWeight: isActive
                ? tokens.fontWeight.bold
                : tokens.fontWeight.medium,
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function FloatingTabBar() {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && colors.background === '#0A0E17');

  const isActive = (tabRoute: string) => {
    if (tabRoute === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(tabRoute);
  };

  const { data: notificationsData } = useNotifications();
  const unreadCount = notificationsData?.unread_count || 0;

  return (
    <View
      style={[
        styles.barWrapper,
        {
          bottom: Math.max(insets.bottom, 20),
          ...tokens.elevation.level4,
        },
      ]}
    >
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={85}
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: tokens.radius.sheet,
            backgroundColor: colors.glassSurface,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          },
        ]}
      />
      {/* Metallic top edge */}
      <View
        style={[
          styles.topEdge,
          { backgroundColor: colors.glassHighlight },
        ]}
        pointerEvents="none"
      />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={isActive(tab.route)}
            onPress={() => router.push(tab.route as any)}
            colors={colors}
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
      tabBar={() => <FloatingTabBar />}
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
  barWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 72,
    borderRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBtn: {
    flex: 1,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.lg,
    minWidth: 56,
  },
  activePill: {
    position: 'absolute',
    inset: 0,
    borderRadius: tokens.radius.lg,
  },
  tabLabel: {
    fontSize: tokens.fontSize.micro,
    letterSpacing: 0.4,
    marginTop: 3,
    textTransform: 'uppercase',
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
