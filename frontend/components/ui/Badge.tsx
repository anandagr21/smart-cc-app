import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const colors = useThemeColors();

  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSoft, text: colors.success, border: `${colors.success}30` };
      case 'warning':
        return { bg: colors.warningSoft, text: colors.warning, border: `${colors.warning}30` };
      case 'danger':
        return { bg: colors.dangerSoft, text: colors.danger, border: `${colors.danger}30` };
      case 'primary':
        return { bg: colors.primarySoft, text: colors.primary, border: `${colors.primary}30` };
      case 'muted':
        return { bg: colors.border, text: colors.textMuted, border: 'transparent' };
      default:
        return { bg: colors.glassSurface, text: colors.textSecondary, border: colors.glassBorder };
    }
  };

  const { bg, text, border } = getStyles();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      <Text
        style={{
          color: text,
          fontSize: isSmall ? tokens.fontSize.micro : tokens.fontSize.caption,
          fontWeight: tokens.fontWeight.bold,
          letterSpacing: tokens.letterSpacing.wider,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: tokens.radius.full,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
});
