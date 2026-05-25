import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { X, CreditCard, IndianRupee, BellRing, ChevronRight } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function PreferencesModal() {
  const router = useRouter();
  const colors = useThemeColors();
  const [smartRouting, setSmartRouting] = useState(true);

  const SettingsRow = ({ icon: Icon, label, value, RightComponent }: any) => (
    <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingsIconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Icon size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.labelWrap}>
        <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {value && (
          <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
      </View>
      {RightComponent}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Preferences</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surface }]}
        >
          {/* @ts-ignore */}
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity activeOpacity={0.7}>
              <SettingsRow
                icon={CreditCard}
                label="Default Payment Mode"
                value="Online"
                RightComponent={<ChevronRight size={18} color={colors.textMuted} />}
              />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <SettingsRow
                icon={IndianRupee}
                label="Display Currency"
                value="INR (₹)"
                RightComponent={<ChevronRight size={18} color={colors.textMuted} />}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AI Engine</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingsRow
              icon={BellRing}
              label="Smart Routing Alerts"
              RightComponent={
                <Switch
                  value={smartRouting}
                  onValueChange={setSmartRouting}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Receive push notifications when the AI engine identifies missed optimization opportunities.
          </Text>
        </Animated.View>
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
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
    marginLeft: 16,
  },
  helperText: {
    fontSize: tokens.fontSize.caption,
    lineHeight: tokens.fontSize.caption * 1.5,
    marginTop: 12,
    marginHorizontal: 16,
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
  labelWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
  },
  settingsValue: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginTop: 2,
  },
});
