import React from 'react';
import { Text, TouchableOpacityProps, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  variant = 'primary', 
  isLoading = false, 
  className = '',
  disabled,
  onPressIn,
  onPressOut,
  ...props 
}) => {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.97, tokens.spring.snappy);
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, tokens.spring.calm);
    if (onPressOut) onPressOut(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          ...tokens.elevation.level2,
        };
      case 'secondary':
        return {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderHighlight,
          borderWidth: StyleSheet.hairlineWidth,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return { color: '#FFFFFF' }; // Primary is always white text for contrast
      case 'secondary':
        return { color: colors.textPrimary };
      case 'ghost':
        return { color: colors.primary };
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      {...props}
    >
      <Animated.View
        style={[
          getVariantStyles(),
          animatedStyle,
          { opacity: disabled || isLoading ? 0.6 : 1 }
        ]}
        className={`flex-row items-center justify-center rounded-full py-4 px-8 ${className}`}
      >
        {isLoading ? (
          <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.primary} />
        ) : (
          <Text style={[getTextStyles()]} className="text-base font-bold tracking-wide">
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};
