import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  isLoading = false,
  icon,
  size = 'md',
  className = '',
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}) => {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.97, tokens.spring.snappy);
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, tokens.spring.calm);
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getContainerStyles = (): any => {
    const base = {
      opacity: disabled || isLoading ? 0.5 : 1,
    };
    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: colors.primary,
          ...tokens.elevation.glow,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.surface,
          borderColor: colors.borderHighlight,
          borderWidth: 1,
        };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent' };
      case 'danger':
        return {
          ...base,
          backgroundColor: colors.dangerSoft,
          borderColor: colors.danger,
          borderWidth: 1,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.textPrimary;
      case 'ghost':
        return colors.primary;
      case 'danger':
        return colors.danger;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 10, paddingHorizontal: 20 };
      case 'md':
        return { paddingVertical: 15, paddingHorizontal: 28 };
      case 'lg':
        return { paddingVertical: 18, paddingHorizontal: 32 };
    }
  };

  const indicatorColor = variant === 'primary' ? '#FFFFFF' : colors.primary;

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      activeOpacity={1}
      {...props}
    >
      <Animated.View
        style={[
          styles.container,
          getContainerStyles(),
          getPadding(),
          animatedStyle,
          style,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={indicatorColor} />
        ) : (
          <>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            <Text style={[styles.label, { color: getTextColor() }]}>
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
  },
  label: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.2,
  },
  iconWrap: {
    marginRight: 8,
  },
});
