import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { Card } from '../../components/ui/Card';
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Moon, Sun, Monitor } from 'lucide-react-native';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useThemeStore, ThemeMode } from '../../features/theme/store/themeStore';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';

const SettingsRow = ({ icon: Icon, label, danger = false, onPress, colors }: any) => (
  <TouchableOpacity 
    className="flex-row items-center justify-between py-4"
    style={{ borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View className="flex-row items-center">
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: danger ? `${colors.danger}1A` : colors.surfaceElevated }}
      >
        <Icon size={20} color={danger ? colors.danger : colors.textPrimary} />
      </View>
      <Text style={{ color: danger ? colors.danger : colors.textPrimary }} className="text-base font-medium">
        {label}
      </Text>
    </View>
    <ChevronRight size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

const ThemeSelector = ({ currentTheme, onSelect, colors }: { currentTheme: ThemeMode, onSelect: (m: ThemeMode) => void, colors: any }) => {
  const options: { label: string, value: ThemeMode, icon: any }[] = [
    { label: 'System', value: 'system', icon: Monitor },
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
  ];

  return (
    <View className="flex-row bg-black/5 rounded-2xl p-1 mt-3" style={{ backgroundColor: colors.surfaceElevated }}>
      {options.map((opt) => {
        const isActive = currentTheme === opt.value;
        const Icon = opt.icon;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl transition-all"
            style={{ 
              backgroundColor: isActive ? colors.surface : 'transparent',
              borderColor: isActive ? colors.borderHighlight : 'transparent',
              borderWidth: isActive ? StyleSheet.hairlineWidth : 0,
            }}
          >
            <Icon size={16} color={isActive ? colors.primary : colors.textMuted} />
            <Text 
              style={{ color: isActive ? colors.primary : colors.textMuted }} 
              className={`ml-2 text-sm ${isActive ? 'font-bold' : 'font-medium'}`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const { themeMode, setThemeMode } = useThemeStore();
  const colors = useThemeColors();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <AnimatedContainer delay={100} className="mb-8 mt-6">
          <View className="flex-row items-center">
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mr-5 shadow-glow"
              style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 2 }}
            >
              <User size={32} color={colors.accent} strokeWidth={2} />
            </View>
            <View>
              <Text style={{ color: colors.textPrimary }} className="text-3xl font-bold tracking-tight">Smart User</Text>
              <Text style={{ color: colors.textSecondary }} className="text-base font-medium mt-1 uppercase tracking-widest">Premium Tier</Text>
            </View>
          </View>
        </AnimatedContainer>

        <AnimatedContainer delay={200} className="mb-6">
          <Card variant="glass">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest mb-2">Appearance</Text>
            <ThemeSelector currentTheme={themeMode} onSelect={setThemeMode} colors={colors} />
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={300}>
          <Card variant="glass">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest mb-2">Account</Text>
            <SettingsRow icon={Settings} label="Preferences" colors={colors} />
            <SettingsRow icon={Bell} label="Notifications" colors={colors} />
            <SettingsRow icon={Shield} label="Security" colors={colors} />
            <View className="mt-2 pt-2">
              <SettingsRow icon={LogOut} label="Sign Out" danger onPress={logout} colors={colors} />
            </View>
          </Card>
        </AnimatedContainer>
      </ScrollView>
    </ScreenContainer>
  );
}
