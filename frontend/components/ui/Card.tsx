import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { useThemeStore } from '../../features/theme/store/themeStore';
import { tokens } from '../../theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'solid' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  padded = true, 
  className = '', 
  style, 
  variant = 'solid', // Default to solid for normal rows to restrict blur usage
  ...props 
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0B0E14');

  const paddingClass = padded ? 'p-6' : '';
  const radiusClass = 'rounded-3xl'; // Softer, more premium radius

  // Base material configuration
  const baseStyle = [
    { 
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    style
  ];

  // Solid or Elevated fallback
  return (
    <View 
      className={`overflow-hidden ${radiusClass} ${paddingClass} ${className}`}
      style={[
        ...baseStyle,
        { backgroundColor: variant === 'elevated' ? colors.surfaceElevated : colors.surface },
        variant === 'elevated' ? tokens.elevation.level2 : tokens.elevation.level1
      ]}
      {...props}
    >
      <View className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: colors.borderHighlight }} />
      {children}
    </View>
  );
};
