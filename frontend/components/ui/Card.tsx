import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'solid' | 'elevated' | 'glass';
  accentColor?: string;   // left vertical stripe color
  interactive?: boolean;  // reserved for future press-scale integration
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  className = '',
  style,
  variant = 'elevated',
  accentColor,
  interactive = false,
  ...props
}) => {
  const colors = useThemeColors();

  const padding = padded ? 20 : 0;

  const getSurface = () => {
    switch (variant) {
      case 'elevated':
        return colors.surface;
      case 'glass':
        return colors.glassSurface;
      case 'solid':
      default:
        return colors.surface;
    }
  };

  const getShadow = () => {
    switch (variant) {
      case 'elevated':
        return tokens.elevation.level2;
      case 'glass':
        return tokens.elevation.level3;
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
      {/* Top metallic highlight line */}
      <View
        style={[
          styles.topHighlight,
          { backgroundColor: colors.glassHighlight },
        ]}
        pointerEvents="none"
      />

      {/* Left accent stripe */}
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
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
});
