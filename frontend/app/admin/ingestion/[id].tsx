import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, AlertCircle, HelpCircle } from 'lucide-react-native';
import { EvidenceDrawer, IngestionField } from '@/features/ingestion/components/EvidenceDrawer';

const MOCK_FIELDS: IngestionField[] = [
  { 
    id: '1', 
    field_name: 'Annual Fee', 
    extracted_value: '₹999', 
    verification_status: 'VERIFIED', 
    confidence_score: 98,
    sources: [
      {
        id: 's1',
        source_type: 'MITC PDF',
        evidence_snippet: 'The annual membership fee shall be ₹999 plus applicable taxes.',
        confidence_contribution: 40,
      },
      {
        id: 's2',
        source_type: 'Marketing Page',
        source_url: 'https://sbicard.com/cashback',
        evidence_snippet: 'Get ₹999 Annual Fee reversed on spends of ₹2 Lakhs.',
        confidence_contribution: 30,
      }
    ]
  },
  { 
    id: '2', 
    field_name: 'Lounge Access', 
    extracted_value: '8 Visits', 
    verification_status: 'CONFLICT', 
    confidence_score: 62,
    sources: [
      {
        id: 's3',
        source_type: 'MITC PDF',
        evidence_snippet: 'Cardholder is entitled to 4 complimentary domestic lounge visits per year.',
        confidence_contribution: 40,
      },
      {
        id: 's4',
        source_type: 'Marketing Page',
        evidence_snippet: 'Enjoy 8 complimentary domestic lounge visits annually.',
        confidence_contribution: 22,
      }
    ]
  },
  { 
    id: '3', 
    field_name: 'Fuel Benefit', 
    extracted_value: '', 
    verification_status: 'MISSING', 
    confidence_score: 0,
    sources: []
  },
];

export default function IngestionReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedField, setSelectedField] = useState<IngestionField | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          {/* @ts-ignore */}
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>SBI Cashback Credit Card</Text>
          <Text style={styles.subtitle}>Session ID: {id}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>92%</Text>
              <Text style={styles.statLabel}>Confidence</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>21</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.danger }]}>
              <Text style={[styles.statValue, { color: colors.danger }]}>2</Text>
              <Text style={styles.statLabel}>Conflicts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>1</Text>
              <Text style={styles.statLabel}>Missing</Text>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Text style={styles.sectionTitle}>Field Review</Text>
          <TouchableOpacity style={styles.bulkButton}>
            {/* @ts-ignore */}
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.bulkButtonText}>Accept All AI Suggestions</Text>
          </TouchableOpacity>
        </View>

        {/* Fields Table */}
        <View style={styles.table}>
          {MOCK_FIELDS.map((field) => (
            <View key={field.id} style={styles.tableRow}>
              {/* Field Info */}
              <View style={styles.fieldInfo}>
                <Text style={styles.fieldName}>{field.field_name}</Text>
                <View style={styles.statusBadgeRow}>
                  <View style={[
                    styles.statusBadge,
                    field.verification_status === 'VERIFIED' ? styles.badgeSuccess :
                    field.verification_status === 'CONFLICT' ? styles.badgeWarning : styles.badgeError
                  ]}>
                    <Text style={[
                      styles.statusText,
                      field.verification_status === 'VERIFIED' ? styles.textSuccess :
                      field.verification_status === 'CONFLICT' ? styles.textWarning : styles.textError
                    ]}>{field.verification_status}</Text>
                  </View>
                  <Text style={styles.confidenceText}>{field.confidence_score}%</Text>
                </View>
              </View>

              {/* Editable Value */}
              <View style={styles.fieldInputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    field.verification_status === 'CONFLICT' && styles.inputWarning,
                    field.verification_status === 'MISSING' && styles.inputError,
                  ]}
                  value={field.extracted_value}
                  placeholder="Enter value..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Actions */}
              <TouchableOpacity style={styles.evidenceButton} onPress={() => setSelectedField(field)}>
                {field.verification_status === 'VERIFIED' ? (
                  // @ts-ignore
                  <Check size={20} color={colors.success} />
                ) : field.verification_status === 'CONFLICT' ? (
                  // @ts-ignore
                  <AlertCircle size={20} color={colors.warning} />
                ) : (
                  // @ts-ignore
                  <HelpCircle size={20} color={colors.danger} />
                )}
                <Text style={styles.evidenceText}>Evidence</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <EvidenceDrawer 
        field={selectedField}
        visible={!!selectedField}
        onClose={() => setSelectedField(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
    gap: tokens.spacing.md,
  },
  backButton: {
    padding: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    gap: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  statValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    gap: 6,
  },
  bulkButtonText: {
    color: '#FFFFFF',
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.body,
  },
  table: {
    backgroundColor: colors.cardBackground,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  fieldInfo: {
    flex: 2,
    gap: 4,
  },
  fieldName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeError: { backgroundColor: '#FEE2E2' },
  textSuccess: { color: colors.success, fontSize: 10, fontWeight: '700' },
  textWarning: { color: colors.warning, fontSize: 10, fontWeight: '700' },
  textError: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  confidenceText: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
  fieldInputWrap: {
    flex: 3,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: colors.textPrimary,
    fontSize: tokens.fontSize.body,
  },
  inputWarning: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  evidenceButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  evidenceText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textSecondary,
  },
});
