import React, { useEffect } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps extends Omit<TextInputProps, 'value'> {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  formatter,
  style,
  ...props
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);
  const colors = useThemeColors();

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.exp),
    });
  }, [value, duration]);

  const animatedProps = useAnimatedProps(() => {
    const currentValue = Math.round(animatedValue.value);
    const formattedValue = formatter ? formatter(currentValue) : currentValue.toLocaleString('en-IN');
    const text = `${prefix}${formattedValue}${suffix}`;
    
    return {
      text,
      // defaultValue is needed as a workaround for Android/iOS text input behavior
      defaultValue: text,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={[styles.input, { color: colors.textPrimary }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
});
