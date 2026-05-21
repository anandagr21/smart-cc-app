import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

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
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-accent shadow-lg shadow-accent/30';
      case 'secondary':
        return 'bg-surfaceElevated border border-white/10';
      case 'ghost':
        return 'bg-transparent';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-[#09090B] font-bold tracking-wide';
      case 'secondary':
        return 'text-textPrimary font-semibold tracking-wide';
      case 'ghost':
        return 'text-accent font-semibold tracking-wide';
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-2xl py-4 px-6 ${getVariantStyles()} ${disabled || isLoading ? 'opacity-50' : 'opacity-100'} ${className}`}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#09090B' : '#10B981'} />
      ) : (
        <Text className={`text-base ${getTextStyles()}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
