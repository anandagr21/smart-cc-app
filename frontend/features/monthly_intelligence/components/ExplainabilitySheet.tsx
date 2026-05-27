import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Info, TrendingUp, CreditCard } from 'lucide-react-native';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';

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

  if (!data) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={100}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
              },
            ]}
          />
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          <View style={styles.header}>
            <View style={styles.titleRow}>
              {/* @ts-ignore */}
              <Info size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Intelligence Insight</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.contextTitle, { color: colors.textPrimary }]}>{data.title}</Text>
            
            <View style={[styles.reasoningCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.reasoningText, { color: colors.textSecondary }]}>
                {data.reasoning}
              </Text>
            </View>

            {data.metrics && Object.keys(data.metrics).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUPPORTING METRICS</Text>
                {Object.entries(data.metrics).map(([key, val]) => (
                  <View key={key} style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.supportingEntities && data.supportingEntities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEY CONTRIBUTORS</Text>
                {data.supportingEntities.map((entity, idx) => (
                  <View key={idx} style={styles.entityRow}>
                    {/* @ts-ignore */}
                    <CreditCard size={14} color={colors.textMuted} />
                    <Text style={[styles.entityText, { color: colors.textSecondary }]}>{entity}</Text>
                  </View>
                ))}
              </View>
            )}
            
          </ScrollView>
        </View>
      </View>
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
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
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
    width: 36, height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center', justifyContent: 'center',
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
    borderWidth: StyleSheet.hairlineWidth,
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
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  metricLabel: {
    fontSize: tokens.fontSize.body,
    textTransform: 'capitalize',
  },
  metricValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
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
