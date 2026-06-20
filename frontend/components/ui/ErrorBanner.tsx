import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

type ErrorBannerVariant = 'error' | 'warning' | 'info';

const VARIANT_ICON: Record<ErrorBannerVariant, string> = {
  error: 'AlertTriangle',
  warning: 'AlertTriangle',
  info: 'Info',
};

interface ErrorBannerProps {
  message: string;
  variant?: ErrorBannerVariant;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const COLOR_MAP = {
  error: (c: ReturnType<typeof useThemeColors>) => ({
    bg: c.dangerSoft,
    border: c.danger,
    text: c.danger,
    icon: c.danger,
  }),
  warning: (c: ReturnType<typeof useThemeColors>) => ({
    bg: c.warningSoft,
    border: c.warning,
    text: c.warning,
    icon: c.warning,
  }),
  info: (c: ReturnType<typeof useThemeColors>) => ({
    bg: c.primarySoft,
    border: c.primary,
    text: c.textPrimary,
    icon: c.primary,
  }),
};

/**
 * Standardized error/warning/info banner.
 * Used for connectivity errors, validation summaries, and transient notifications.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  variant = 'error',
  onRetry,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const { bg, border, text, icon } = COLOR_MAP[variant](colors);

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify()}
      exiting={SlideOutUp.duration(200)}
      style={[styles.container, { backgroundColor: bg, borderColor: border }]}
    >
      <View style={styles.content}>
        <DynamicIcon name={VARIANT_ICON[variant]} size={18} color={icon} style={styles.icon} strokeWidth={2} />
        <Text style={[styles.message, { color: text }]} numberOfLines={3}>
          {message}
        </Text>
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.7}
            style={styles.actionBtn}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <DynamicIcon name="RefreshCw" size={16} color={icon} strokeWidth={2} />
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            style={styles.actionBtn}
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
          >
            <DynamicIcon name="X" size={16} color={icon} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    gap: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.body * 1.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
