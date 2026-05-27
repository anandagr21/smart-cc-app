import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';

export const TransactionListSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
      {/* Date Header Skeleton */}
      <SkeletonBox height={16} width={100} style={styles.headerSkeleton} />

      {/* Transaction Rows */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Icon Skeleton */}
          <SkeletonBox height={44} width={44} borderRadius={22} style={styles.iconSkeleton} />

          {/* Details Skeleton */}
          <View style={styles.details}>
            <SkeletonBox height={16} width={140} style={{ marginBottom: 8 }} />
            <SkeletonBox height={12} width={80} />
          </View>

          {/* Amount Skeleton */}
          <SkeletonBox height={18} width={60} />
        </View>
      ))}

      {/* Another Date Header Skeleton */}
      <SkeletonBox height={16} width={100} style={[styles.headerSkeleton, { marginTop: 16 }]} />
      
      {/* Transaction Row */}
      <View
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <SkeletonBox height={44} width={44} borderRadius={22} style={styles.iconSkeleton} />
        <View style={styles.details}>
          <SkeletonBox height={16} width={140} style={{ marginBottom: 8 }} />
          <SkeletonBox height={12} width={80} />
        </View>
        <SkeletonBox height={18} width={60} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  headerSkeleton: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  iconSkeleton: {
    marginRight: 16,
  },
  details: {
    flex: 1,
    paddingRight: 16,
  },
});
