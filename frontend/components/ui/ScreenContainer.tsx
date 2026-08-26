import React from 'react';
import { View, ViewProps, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  noPadding = false,
  style,
  ...props
}) => {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
        style,
      ]}
      {...props}
    >
      <View
        style={[
          styles.innerContainer,
          {
            paddingHorizontal: noPadding ? 0 : tokens.layout.screenPadding,
            paddingTop: noPadding ? 0 : 8,
          },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 640 : '100%',
    flex: 1,
  },
});
