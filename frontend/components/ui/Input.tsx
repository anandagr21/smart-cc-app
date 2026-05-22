import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, StyleSheet } from 'react-native';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', style, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();

  return (
    <View className={`mb-5 ${className}`}>
      {label && <Text style={{ color: colors.textSecondary }} className="text-sm mb-2 ml-2 font-medium">{label}</Text>}
      <TextInput
        style={[
          {
            backgroundColor: isFocused ? colors.surfaceElevated : colors.surface,
            color: colors.textPrimary,
            borderColor: error 
              ? colors.danger 
              : isFocused 
                ? colors.primary 
                : colors.border,
            borderWidth: isFocused ? 2 : StyleSheet.hairlineWidth,
          },
          style
        ]}
        className={`px-5 py-4 rounded-2xl transition-colors`}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text style={{ color: colors.danger }} className="text-xs mt-2 ml-2 font-medium">{error}</Text>}
    </View>
  );
};
