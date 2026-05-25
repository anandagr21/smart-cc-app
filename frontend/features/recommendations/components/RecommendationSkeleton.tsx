import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SkeletonBox } from '../../../components/ui/SkeletonBox';
import { tokens } from '../../../theme/tokens';
import { useThemeColors } from '../../theme/hooks/useThemeColors';

export const RecommendationSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
      <SkeletonBox height={24} width={150} style={styles.titleSkeleton} />

      {/* Top Recommendation Skeleton */}
      <View style={[styles.topCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.topHeader}>
          <View>
            <SkeletonBox height={24} width={150} style={{ marginBottom: 8 }} />
            <SkeletonBox height={16} width={90} />
          </View>
          <SkeletonBox height={28} width={80} borderRadius={16} />
        </View>
        <View style={styles.topBody}>
          <SkeletonBox height={14} width={120} style={{ marginBottom: 16 }} />
          <SkeletonBox height={48} width={180} />
        </View>
      </View>

      {/* Backup Recommendation Skeletons */}
      {[1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.subCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.subCardLeft}>
            <SkeletonBox height={20} width={120} style={{ marginBottom: 8 }} />
            <SkeletonBox height={14} width={80} />
          </View>
          <SkeletonBox height={24} width={70} />
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  titleSkeleton: {
    marginBottom: 16,
  },
  topCard: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topBody: {
    padding: 24,
    alignItems: 'center',
  },
  subCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  subCardLeft: {
    flex: 1,
  },
});
