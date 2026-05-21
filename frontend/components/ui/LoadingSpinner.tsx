import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '../../theme/colors';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'large',
  color = colors.primary 
}) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-textSecondary mt-4 font-medium">{message}</Text>
      )}
    </View>
  );
};
