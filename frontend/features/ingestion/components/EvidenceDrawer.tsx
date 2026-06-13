import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, FileText, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

export interface FieldSource {
  id: string;
  source_type: string;
  source_url?: string;
  evidence_snippet: string;
  confidence_contribution: number;
}

export interface IngestionField {
  id: string;
  field_name: string;
  extracted_value: string;
  verification_status: 'VERIFIED' | 'CONFLICT' | 'MISSING' | 'MANUALLY_EDITED';
  confidence_score: number;
  sources: FieldSource[];
}

interface EvidenceDrawerProps {
  field: IngestionField | null;
  visible: boolean;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ field, visible, onClose }) => {
  const insets = useSafeAreaInsets();

  if (!field) return null;

  const isVerified = field.verification_status === 'VERIFIED';
  const StatusIcon = isVerified ? CheckCircle : AlertTriangle;
  const statusColor = isVerified ? colors.success : colors.warning;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, tokens.spacing.xl) }]}>
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="dark"
              intensity={80}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopLeftRadius: tokens.radius.sheet,
                  borderTopRightRadius: tokens.radius.sheet,
                  backgroundColor: 'rgba(10, 14, 23, 0.7)',
                },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopLeftRadius: tokens.radius.sheet,
                  borderTopRightRadius: tokens.radius.sheet,
                  backgroundColor: colors.background,
                },
              ]}
            />
          )}

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.fieldName}>{field.field_name}</Text>
              <View style={styles.statusRow}>
                {/* @ts-ignore */}
                <StatusIcon size={14} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {field.verification_status} ({field.confidence_score}% Confidence)
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              {/* @ts-ignore */}
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Current Value */}
            <View style={styles.valueCard}>
              <Text style={styles.label}>Current Extracted Value</Text>
              <Text style={styles.valueText}>{field.extracted_value}</Text>
            </View>

            <Text style={styles.sectionTitle}>Source Evidence ({field.sources?.length || 0})</Text>

            {field.sources?.map((source) => (
              <View key={source.id} style={styles.sourceCard}>
                <View style={styles.sourceHeader}>
                  <View style={styles.sourceTypeWrap}>
                    {/* @ts-ignore */}
                    <FileText size={16} color={colors.primary} />
                    <Text style={styles.sourceType}>{source.source_type}</Text>
                  </View>
                  <Text style={styles.sourceConfidence}>+{source.confidence_contribution}%</Text>
                </View>
                {source.source_url && (
                  <Text style={styles.sourceUrl} numberOfLines={1}>{source.source_url}</Text>
                )}
                <View style={styles.snippetBox}>
                  <Text style={styles.snippetText}>"{source.evidence_snippet}"</Text>
                </View>
              </View>
            ))}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '85%',
    minHeight: '50%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  fieldName: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  closeBtn: {
    padding: tokens.spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.full,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  valueCard: {
    backgroundColor: colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  label: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  valueText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: tokens.spacing.sm,
  },
  sourceCard: {
    backgroundColor: colors.background,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    gap: tokens.spacing.sm,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceTypeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceType: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  sourceConfidence: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.success,
  },
  sourceUrl: {
    fontSize: tokens.fontSize.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  snippetBox: {
    backgroundColor: colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginTop: 4,
  },
  snippetText: {
    fontSize: tokens.fontSize.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
