import React from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { ViewProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { tokens } from '../../theme/tokens';

cssInterop(Animated.View, { className: 'style' });

interface AnimatedContainerProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({ children, delay = 0, style, ...props }) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(tokens.duration.normal).delay(delay).springify()}
      exiting={FadeOut.duration(tokens.duration.fast)}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
};
