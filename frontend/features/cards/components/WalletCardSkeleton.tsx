import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

const SkeletonItem = ({ height, width, style }: any) => {
  const colors = useThemeColors();
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
    />
  );
};

export const WalletCardSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
      {[1, 2, 3].map((i) => (
        <View 
          key={i} 
          style={[
            styles.skeletonCard, 
            { 
              backgroundColor: colors.surface, 
              borderColor: colors.border 
            }
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <SkeletonItem height={28} width={180} style={styles.titleSkeleton} />
              <SkeletonItem height={16} width={120} />
            </View>
            <SkeletonItem height={40} width={40} style={styles.circleSkeleton} />
          </View>
          <View style={styles.footerRow}>
            <View>
              <SkeletonItem height={12} width={60} style={styles.metaLabelSkeleton} />
              <SkeletonItem height={20} width={90} />
            </View>
            <SkeletonItem height={24} width={80} style={styles.pillSkeleton} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  skeletonCard: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  circleSkeleton: {
    borderRadius: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaLabelSkeleton: {
    marginBottom: 8,
  },
  pillSkeleton: {
    borderRadius: 12,
  },
});
