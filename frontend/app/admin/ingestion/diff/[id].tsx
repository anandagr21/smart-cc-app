import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

const MOCK_DIFF = {
  card_id: '123',
  version_1: 4,
  version_2: 5,
  diffs: [
    { field_name: 'annual_fee', old_value: '₹999', new_value: '₹1499', is_changed: true },
    { field_name: 'reward_rate', old_value: '5%', new_value: '5% capped at ₹5000', is_changed: true },
    { field_name: 'lounge_access', old_value: '4 Visits', new_value: '4 Visits', is_changed: false },
    { field_name: 'fuel_surcharge', old_value: '1% Waiver', new_value: 'No Change', is_changed: false },
  ]
};

export default function VersionDiffScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          <Text style={styles.subtitle}>Version {MOCK_DIFF.version_1} → Version {MOCK_DIFF.version_2}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Field</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Version {MOCK_DIFF.version_1}</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Version {MOCK_DIFF.version_2}</Text>
          </View>

          {/* Table Rows */}
          {MOCK_DIFF.diffs.map((diff, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow, 
                diff.is_changed && styles.rowChanged
              ]}
            >
              <Text style={[styles.cell, { flex: 2, fontWeight: tokens.fontWeight.bold }]}>
                {diff.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              
              <Text style={[styles.cell, { flex: 2 }, diff.is_changed && styles.oldValue]}>
                {diff.old_value}
              </Text>
              
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {diff.is_changed && (
                  // @ts-ignore
                  <ArrowRight size={14} color={colors.warning} />
                )}
                <Text style={[styles.cell, diff.is_changed && styles.newValue]}>
                  {diff.new_value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.primary,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  headerCell: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
    alignItems: 'center',
  },
  rowChanged: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)', // faint warning bg
  },
  cell: {
    fontSize: tokens.fontSize.body,
    color: colors.textPrimary,
  },
  oldValue: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  newValue: {
    color: colors.warning,
    fontWeight: tokens.fontWeight.bold,
  },
});
