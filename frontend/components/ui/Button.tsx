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
  className,
  disabled,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary';
      case 'secondary':
        return 'bg-card border border-border';
      case 'ghost':
        return 'bg-transparent';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-white font-semibold';
      case 'secondary':
        return 'text-textPrimary font-medium';
      case 'ghost':
        return 'text-primary font-medium';
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-xl py-4 px-6 ${getVariantStyles()} ${disabled || isLoading ? 'opacity-50' : 'opacity-100'} ${className}`}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFF' : '#3B82F6'} />
      ) : (
        <Text className={`text-base ${getTextStyles()}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
