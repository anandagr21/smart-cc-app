import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { colors } from '../../../theme/colors';

const SkeletonItem = ({ height, width, className, style }: any) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        { height, width, backgroundColor: colors.borderHighlight, borderRadius: 8 }, 
        style, 
        animatedStyle
      ]} 
      className={className} 
    />
  );
};

export const WalletCardSkeleton: React.FC = () => {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} className="mt-2">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-surface rounded-3xl border border-white/5 mb-4 overflow-hidden p-6 shadow-sm shadow-black/10">
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <SkeletonItem height={28} width={180} className="mb-2" />
              <SkeletonItem height={16} width={120} />
            </View>
            <SkeletonItem height={40} width={40} style={{ borderRadius: 20 }} />
          </View>
          <View className="flex-row justify-between items-end">
            <View>
              <SkeletonItem height={12} width={60} className="mb-2" />
              <SkeletonItem height={20} width={90} />
            </View>
            <SkeletonItem height={24} width={80} style={{ borderRadius: 12 }} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
};
