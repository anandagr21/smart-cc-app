import React from 'react';
import { Tabs } from 'expo-router';
import { CreditCard, History, User, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { useThemeStore } from '../../features/theme/store/themeStore';
import { tokens } from '../../theme/tokens';

export default function TabLayout() {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0B0E14');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 32,
          left: 40,
          right: 40,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 64,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, tokens.elevation.level4]}>
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={80} // Very high blur for VisionOS style
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 32,
                  overflow: 'hidden',
                  backgroundColor: colors.glassSurface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.glassBorder,
                }
              ]}
            >
              {/* Metallic top reflection */}
              <View className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: colors.glassHighlight }} />
            </BlurView>
          </View>
        ),
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-full ${focused ? 'bg-primary/10' : ''}`}>
              <Sparkles size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-full ${focused ? 'bg-primary/10' : ''}`}>
              <CreditCard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-full ${focused ? 'bg-primary/10' : ''}`}>
              <History size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-full ${focused ? 'bg-primary/10' : ''}`}>
              <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
