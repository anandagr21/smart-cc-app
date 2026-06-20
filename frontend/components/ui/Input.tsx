import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, StyleProp, TextStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputStyle?: StyleProp<TextStyle>;
  hideBorder?: boolean;
  hideFocusGlow?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();
  const borderOpacity = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: tokens.duration.fast });
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0, { duration: tokens.duration.fast });
    props.onBlur?.(e);
  };

  const focusBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const borderColor = error ? colors.danger : isFocused ? colors.primary : colors.border;
  const borderWidth = isFocused || error ? 1.5 : StyleSheet.hairlineWidth;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: error ? colors.danger : colors.textMuted }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth,
          },
        ]}
      >
        {/* Animated focus glow — behind the input, zIndex: -1 for web safety */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { zIndex: -1 },
            { backgroundColor: colors.primarySoft, borderRadius: tokens.radius.md },
            focusBorderStyle,
          ]}
          pointerEvents="none"
        />

        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              paddingLeft: leftIcon ? 0 : 16,
              paddingRight: rightIcon ? 0 : 16,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>

      {error && (
        <Text style={[styles.helperText, { color: colors.danger }]}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    minHeight: 52,
  },
  focusGlow: {
    opacity: 0,
  },
  input: {
    flex: 1,
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    paddingVertical: 14,
    height: 52,
  },
  iconLeft: {
    paddingLeft: 16,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    paddingRight: 16,
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginTop: 6,
    marginLeft: 4,
  },
});
