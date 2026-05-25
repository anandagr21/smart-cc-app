import React from 'react';
import { View, ViewProps, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { tokens } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  noPadding = false,
  className,
  style,
  ...props
}) => {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      {...props}
    >
      {/* Ambient orb — top right, brand indigo */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -height * 0.12,
          right: -width * 0.25,
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: width * 0.4,
          backgroundColor: colors.primarySoft,
          // @ts-ignore - expo filter API
          filter: [{ blur: 100 }],
        }}
      />
      {/* Ambient orb — bottom left, slightly accent-tinted */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -height * 0.1,
          left: -width * 0.2,
          width: width * 0.6,
          height: width * 0.6,
          borderRadius: width * 0.3,
          backgroundColor: colors.accentSoft,
          // @ts-ignore
          filter: [{ blur: 120 }],
        }}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: noPadding ? 0 : tokens.layout.screenPadding,
          paddingTop: noPadding ? 0 : 8,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
