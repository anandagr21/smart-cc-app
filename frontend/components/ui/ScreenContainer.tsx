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

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, noPadding = false, className, style, ...props }) => {
  const colors = useThemeColors();

  return (
    <SafeAreaView 
      className={`flex-1 ${className || ''}`} 
      style={[{ backgroundColor: colors.background }, style]} 
      {...props}
    >
      {/* Calm, Static Ambient Lighting */}
      <View className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none">
        <View 
          style={{
            position: 'absolute',
            top: -height * 0.15,
            right: -width * 0.3,
            width: width,
            height: width,
            borderRadius: width / 2,
            backgroundColor: colors.primarySoft,
            filter: [{ blur: 80 }], 
          }} 
        />
      </View>

      <View 
        className="flex-1"
        style={{ paddingHorizontal: noPadding ? 0 : tokens.layout.screenPadding, paddingTop: noPadding ? 0 : 8 }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
