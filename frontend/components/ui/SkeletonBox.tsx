import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';

interface SkeletonBoxProps {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

/**
 * Premium shimmering skeleton box.
 * Animation is cleaned up on unmount to prevent GPU waste.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  height,
  width = '100%',
  borderRadius = 8,
  style,
}) => {
  const colors = useThemeColors();
  const [layoutWidth, setLayoutWidth] = useState<number>(0);
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      false,
    );
    return () => cancelAnimation(animValue);
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  const animStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animValue.value,
      [0, 1],
      [-layoutWidth, layoutWidth]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          height,
          width,
          borderRadius,
          backgroundColor: colors.borderHighlight,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {layoutWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.glassHighlight,
                opacity: 0.4,
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
};
