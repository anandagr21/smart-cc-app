import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { Narrative, Streak } from '../types/monthly_intelligence.types';

interface OptimizationTimelineProps {
  narratives: Narrative[];
  streaks: Streak[];
  onPressExplain: (item: any) => void;
}

export const OptimizationTimeline: React.FC<OptimizationTimelineProps> = ({ 
  narratives, 
  streaks,
  onPressExplain 
}) => {
  const colors = useThemeColors();

  // Combine and sort. Since they are monthly summaries, we don't have exact timestamps.
  // We'll interleave them to create a narrative flow.
  const timelineItems = [
    ...narratives.map(n => ({ ...n, _kind: 'NARRATIVE' as const })),
    ...streaks.map(s => ({ ...s, _kind: 'STREAK' as const }))
  ];

  if (timelineItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BEHAVIORAL EVOLUTION</Text>
      
      <View style={styles.timeline}>
        <View style={[styles.connector, { backgroundColor: colors.border }]} />
        
        {timelineItems.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.timelineItem}
            activeOpacity={0.7}
            onPress={() => onPressExplain(item)}
          >
            <View style={[styles.marker, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.innerMarker, { backgroundColor: item._kind === 'STREAK' ? colors.primary : colors.textMuted }]} />
            </View>
            
            <View style={styles.content}>
              <Text style={[styles.itemText, { color: colors.textPrimary }]} numberOfLines={3}>
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 20,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 12,
  },
  connector: {
    position: 'absolute',
    left: 17,
    top: 10,
    bottom: 20,
    width: 2,
    opacity: 0.5,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 16,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  itemText: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
});
