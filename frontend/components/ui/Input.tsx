import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-5 ${className}`}>
      {label && <Text className="text-textSecondary text-sm mb-2 ml-1 font-medium">{label}</Text>}
      <TextInput
        className={`bg-surfaceElevated text-textPrimary px-4 py-4 rounded-xl border-2 transition-colors ${
          error 
            ? 'border-danger bg-danger/5' 
            : isFocused 
              ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10' 
              : 'border-white/5'
        }`}
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
      {error && <Text className="text-danger text-xs mt-2 ml-1 font-medium">{error}</Text>}
    </View>
  );
};
