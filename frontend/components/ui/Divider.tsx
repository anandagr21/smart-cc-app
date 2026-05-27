import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';

interface DividerProps {
  style?: any;
}

export const Divider: React.FC<DividerProps> = ({ style }) => {
  const colors = useThemeColors();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
        style,
      ]}
    />
  );
};
