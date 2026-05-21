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
        { height, width, backgroundColor: colors.border, borderRadius: 8 }, 
        style, 
        animatedStyle
      ]} 
      className={className} 
    />
  );
};

export const RecommendationSkeleton: React.FC = () => {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} className="mt-8">
      <SkeletonItem height={24} width={150} className="mb-4" />
      
      {/* Top Recommendation Skeleton */}
      <View className="bg-surface border border-white/5 rounded-3xl p-6 mb-4 shadow-sm shadow-black/10">
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <SkeletonItem height={24} width={150} className="mb-2" />
            <SkeletonItem height={16} width={90} />
          </View>
          <SkeletonItem height={28} width={80} style={{ borderRadius: 16 }} />
        </View>
        <View className="bg-white/5 rounded-2xl p-6 mt-2">
          <SkeletonItem height={14} width={120} className="mb-4" />
          <SkeletonItem height={48} width={180} />
        </View>
      </View>

      {/* Backup Recommendation Skeletons */}
      {[1, 2].map((i) => (
        <View key={i} className="bg-surfaceElevated border border-white/5 rounded-2xl p-5 mb-4 flex-row justify-between items-center opacity-80">
          <View>
            <SkeletonItem height={20} width={120} className="mb-2" />
            <SkeletonItem height={14} width={80} />
          </View>
          <SkeletonItem height={24} width={70} />
        </View>
      ))}
    </Animated.View>
  );
};
