import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';

interface SkeletonBoxProps {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

/**
 * Centralized skeleton shimmer box.
 * Use this everywhere instead of duplicating shimmer logic.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  height,
  width,
  borderRadius = 8,
  style,
}) => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750 }),
        withTiming(0.35, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          width: width ?? '100%',
          borderRadius,
          backgroundColor: colors.border,
        },
        style,
        animStyle,
      ]}
    />
  );
};
