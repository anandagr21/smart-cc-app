import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 ${className}`}>
      {label && <Text className="text-textSecondary text-sm mb-1 ml-1">{label}</Text>}
      <TextInput
        className={`bg-card text-textPrimary px-4 py-4 rounded-xl border ${
          error ? 'border-danger' : isFocused ? 'border-primary' : 'border-border'
        }`}
        placeholderTextColor={colors.textSecondary}
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
      {error && <Text className="text-danger text-xs mt-1 ml-1">{error}</Text>}
    </View>
  );
};
