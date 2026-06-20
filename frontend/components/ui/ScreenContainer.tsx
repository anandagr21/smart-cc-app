import React from 'react';
import { View, ViewProps, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

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
      style={[
        { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
        style
      ]}
      {...props}
    >
      <View style={{ width: '100%', maxWidth: Platform.OS === 'web' ? 600 : '100%', flex: 1, position: 'relative' }}>
        {/* Ambient orb — top right, brand indigo */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -height * 0.12,
            right: -width * 0.25,
            width: Math.min(width * 0.8, 400),
            height: Math.min(width * 0.8, 400),
            borderRadius: Math.min(width * 0.4, 200),
            backgroundColor: colors.primarySoft,
            ...(Platform.OS === 'web' ? { filter: 'blur(100px)' } as any : { filter: [{ blur: 100 } as any] }),
            opacity: 0.6,
          }}
        />
        {/* Ambient orb — bottom left, slightly accent-tinted */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -height * 0.1,
            left: -width * 0.2,
            width: Math.min(width * 0.6, 300),
            height: Math.min(width * 0.6, 300),
            borderRadius: Math.min(width * 0.3, 150),
            backgroundColor: colors.accentSoft,
            ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } as any : { filter: [{ blur: 120 } as any] }),
            opacity: 0.6,
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
      </View>
    </SafeAreaView>
  );
};
