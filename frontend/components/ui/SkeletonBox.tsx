import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';

interface SkeletonBoxProps {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

/**
 * Premium shimmering skeleton box.
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
      withTiming(1, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      false
    );
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
          backgroundColor: colors.borderHighlight, // Base subtle color
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {layoutWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0.2)',
              'rgba(255, 255, 255, 0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
};
