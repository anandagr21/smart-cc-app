import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, noPadding = false, className, ...props }) => {
  return (
    <SafeAreaView className={`flex-1 bg-background ${className}`} {...props}>
      <View className={`flex-1 ${noPadding ? '' : 'px-6 py-2'}`}>
        {children}
      </View>
    </SafeAreaView>
  );
};
