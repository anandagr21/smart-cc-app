import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { CreditCard, History, User, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { useThemeStore } from '../../features/theme/store/themeStore';
import { tokens } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'index', route: '/', icon: Sparkles },
  { name: 'wallet', route: '/wallet', icon: CreditCard },
  { name: 'history', route: '/history', icon: History },
  { name: 'profile', route: '/profile', icon: User },
];

function FloatingTabBar() {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0B0E14');

  const isActive = (tabRoute: string) => {
    if (tabRoute === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(tabRoute);
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 24),
        left: 24,
        right: 24,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        ...tokens.elevation.level3,
      }}
    >
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={80}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.glassSurface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder,
            borderRadius: 32,
          },
        ]}
      />
      {/* Metallic top reflection */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.glassHighlight }} />

      {/* Tab buttons */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        {TABS.map((tab) => {
          const active = isActive(tab.route);
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route as any)}
              style={{
                flex: 1,
                height: 64,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  backgroundColor: active ? colors.primarySoft : 'transparent',
                }}
              >
                <Icon
                  size={22}
                  color={active ? colors.primary : colors.textSecondary}
                  strokeWidth={active ? 2.5 : 2}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <FloatingTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
