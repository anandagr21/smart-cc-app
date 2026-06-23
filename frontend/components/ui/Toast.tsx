import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastData {
  id: number;
  message: string;
  variant: ToastVariant;
}

let _nextToastId = 1;
let _showToast: ((message: string, variant?: ToastVariant) => void) | null = null;

/**
 * Imperatively show a toast from anywhere in the app.
 * Toast auto-dismisses after 3 seconds.
 */
export function showToast(message: string, variant: ToastVariant = 'success') {
  _showToast?.(message, variant);
}

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; accentKey: string }> = {
  success: { icon: 'CheckCircle', accentKey: 'success' },
  error:   { icon: 'AlertCircle',  accentKey: 'danger' },
  info:    { icon: 'Info',         accentKey: 'primary' },
};

/**
 * Toast banner that renders at the bottom of the screen.
 * Place this inside a screen to enable toasts for that screen.
 */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export const ToastOverlay: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const bottomPosition = insets.bottom + TAB_BAR_HEIGHT + 12;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = _nextToastId++;
    setToast({ id, message, variant });
  }, []);

  useEffect(() => {
    _showToast = show;
    return () => { _showToast = null; };
  }, [show]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;

  const config = VARIANT_CONFIG[toast.variant];
  const accent = (colors as any)[config.accentKey] || colors.primary;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(250)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, bottom: bottomPosition }]}
      pointerEvents="box-none"
    >
      {/* Left accent stripe */}
      <View style={[styles.accentStripe, { backgroundColor: accent }]} pointerEvents="none" />

      <DynamicIcon name={config.icon} size={18} color={accent} strokeWidth={2} />
      <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={() => setToast(null)}
        activeOpacity={0.7}
        style={styles.dismissBtn}
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
      >
        <DynamicIcon name="X" size={16} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.border.thin,
    overflow: 'hidden',
    gap: 10,
    // Solid shadow for depth above tab bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  message: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
