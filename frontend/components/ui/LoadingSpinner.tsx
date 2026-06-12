import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'large',
  color 
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color || colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    marginTop: 16,
    fontWeight: tokens.fontWeight.medium,
    fontSize: tokens.fontSize.body,
  },
});
