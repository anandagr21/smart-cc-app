import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'solid' | 'elevated' | 'glass';
  accentColor?: string;   // left vertical stripe color
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  style,
  variant = 'elevated',
  accentColor,
  interactive = false,
  ...props
}) => {
  const colors = useThemeColors();

  const padding = padded ? 18 : 0;

  const getSurface = () => {
    switch (variant) {
      case 'glass':
        return colors.glassSurface;
      case 'solid':
        return colors.surface;
      case 'elevated':
      default:
        return colors.surface;
    }
  };

  const getShadow = () => {
    switch (variant) {
      case 'elevated':
        return tokens.elevation.level2;
      case 'glass':
        return tokens.elevation.level1;
      case 'solid':
      default:
        return tokens.elevation.level1;
    }
  };

  return (
    <View
      style={[
        styles.card,
        getShadow(),
        {
          backgroundColor: getSurface(),
          borderColor: colors.border,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {/* Left accent stripe — restrained */}
      {accentColor && (
        <View
          style={[styles.accentStripe, { backgroundColor: accentColor }]}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
});
