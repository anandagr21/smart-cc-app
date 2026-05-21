import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { User, Settings, Bell, Shield, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../features/auth/store/authStore';
import { colors } from '../../theme/colors';

const SettingsRow = ({ icon: Icon, label, danger = false, onPress }: any) => (
  <TouchableOpacity 
    className="flex-row items-center justify-between py-4 border-b border-white/5"
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View className="flex-row items-center">
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${danger ? 'bg-danger/10' : 'bg-surfaceElevated'}`}>
        <Icon size={20} color={danger ? colors.danger : colors.textPrimary} />
      </View>
      <Text className={`text-base font-medium ${danger ? 'text-danger' : 'text-textPrimary'}`}>
        {label}
      </Text>
    </View>
    <ChevronRight size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScreenContainer>
      <AnimatedContainer delay={100} className="mb-8 mt-6">
        <View className="flex-row items-center">
          <View className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent items-center justify-center mr-5 shadow-glow">
            <User size={32} color={colors.accent} strokeWidth={2} />
          </View>
          <View>
            <Text className="text-3xl font-bold text-textPrimary tracking-tight">Smart User</Text>
            <Text className="text-textSecondary text-base font-medium mt-1">Premium Tier</Text>
          </View>
        </View>
      </AnimatedContainer>

      <AnimatedContainer delay={200} className="bg-surface border border-white/5 rounded-3xl p-6 shadow-sm shadow-black/10">
        <Text className="text-textMuted text-xs font-bold uppercase tracking-widest mb-2">Account</Text>
        <SettingsRow icon={Settings} label="Preferences" />
        <SettingsRow icon={Bell} label="Notifications" />
        <SettingsRow icon={Shield} label="Security" />
        <View className="mt-4 pt-2">
          <SettingsRow icon={LogOut} label="Sign Out" danger onPress={logout} />
        </View>
      </AnimatedContainer>
    </ScreenContainer>
  );
}
