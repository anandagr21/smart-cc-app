import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Pressable, AccessibilityInfo } from 'react-native';
import { BlurView } from 'expo-blur';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';
import { formatCurrencyIN } from '@/utils/currency';

interface ExplainabilityData {
  title: string;
  reasoning: string;
  metrics?: Record<string, any>;
  supportingEntities?: string[];
  type?: 'NARRATIVE' | 'FORECAST' | 'STREAK' | 'TREND';
}

interface ExplainabilitySheetProps {
  visible: boolean;
  onClose: () => void;
  data: ExplainabilityData | null;
}

export const ExplainabilitySheet: React.FC<ExplainabilitySheetProps> = ({
  visible,
  onClose,
  data,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const getContextColor = () => {
    if (data?.type === 'NARRATIVE') return colors.primary;
    if (data?.type === 'STREAK') return colors.success;
    if (data?.type === 'FORECAST') return colors.warning;
    return colors.primary;
  };

  // Get a visible contextual background (avoid nearly-invisible hex opacity like '0A')
  const getContextBg = () => {
    const t = data?.type;
    if (t === 'NARRATIVE') return colors.primarySoft;
    if (t === 'STREAK') return colors.successSoft;
    if (t === 'FORECAST') return colors.warningSoft;
    return colors.primarySoft;
  };

  const formatMetricValue = (key: string, val: any) => {
    if (typeof val === 'number') {
      const lowerKey = key.toLowerCase();
      // Exact currency indicators (startsWith avoids false matches like 'delivery_value')
      const isCurrency =
        lowerKey.startsWith('total_') ||
        lowerKey.endsWith('_amount') ||
        lowerKey.endsWith('_spent') ||
        lowerKey.endsWith('_value') ||
        lowerKey.includes('_reward') ||
        lowerKey === 'amount' ||
        lowerKey === 'spend' ||
        lowerKey === 'value' ||
        lowerKey === 'rewards';
      if (isCurrency) {
        return formatCurrencyIN(val);
      }
      if (lowerKey.endsWith('_rate') || lowerKey.endsWith('_pct') || lowerKey === 'rate' || lowerKey === 'percentage') {
        return `${val.toFixed(1)}%`;
      }
      return val % 1 === 0 ? String(val) : val.toFixed(2);
    }
    return String(val);
  };

  if (!data) return null;

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'fade' : 'slide'} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={60}
            style={StyleSheet.absoluteFill}
          />
          {/* Border and highlight rendered on parent views, not BlurView */}
          <View
            style={[
              styles.sheetBorder,
              {
                borderColor: colors.glassBorder,
                backgroundColor: colors.glassSurface,
              },
            ]}
            pointerEvents="none"
          />
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} pointerEvents="none" />

          {/* Grabber Handle */}
          <View style={styles.grabberContainer} pointerEvents="none">
            <View style={[styles.grabber, { backgroundColor: colors.textMuted + '80' }]} />
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <DynamicIcon name="Info" size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Intelligence Insight</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.contextTitle, { color: colors.textPrimary }]}>{data.title}</Text>

            <View style={[
              styles.reasoningCard,
              {
                backgroundColor: getContextBg(),
                borderColor: colors.border,
                borderLeftColor: getContextColor(),
              }
            ]}>
              <Text style={[styles.reasoningText, { color: colors.textSecondary }]}>
                {data.reasoning}
              </Text>
            </View>

            {data.metrics && Object.keys(data.metrics).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUPPORTING METRICS</Text>
                <View style={styles.metricsGrid}>
                  {Object.entries(data.metrics).map(([key, val]) => (
                    <View key={key} style={[styles.metricCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                        {key.replace(/_/g, ' ')}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                        {formatMetricValue(key, val)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {data.supportingEntities && data.supportingEntities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEY CONTRIBUTORS</Text>
                {data.supportingEntities.map((entity, idx) => (
                  <View key={idx} style={styles.entityRow}>
                    <DynamicIcon name="CreditCard" size={14} color={colors.textMuted} />
                    <Text style={[styles.entityText, { color: colors.textSecondary }]}>{entity}</Text>
                  </View>
                ))}
              </View>
            )}

          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '65%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  sheetBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    borderWidth: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    zIndex: 20,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  contextTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    marginBottom: 20,
    lineHeight: 28,
  },
  reasoningCard: {
    padding: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 32,
  },
  reasoningText: {
    fontSize: tokens.fontSize.body,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: tokens.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  entityText: {
    fontSize: tokens.fontSize.body,
  },
});
