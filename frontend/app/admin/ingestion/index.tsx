import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Plus } from 'lucide-react-native';

const MOCK_SESSIONS = [
  { id: '1', cardName: 'HDFC Millennia', bankName: 'HDFC Bank', status: 'REVIEW_REQUIRED', priority: 'CRITICAL', confidence: 94, verified: 28, conflicts: 2 },
  { id: '2', cardName: 'SBI Cashback', bankName: 'SBI', status: 'AI_VERIFIED', priority: 'HIGH', confidence: 88, verified: 21, conflicts: 1 },
  { id: '3', cardName: 'Axis Atlas', bankName: 'Axis Bank', status: 'DRAFT', priority: 'MEDIUM', confidence: 0, verified: 0, conflicts: 0 },
];

export default function IngestionDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalog Ingestion</Text>
        <View style={{flexDirection: 'row', gap: 8}}>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/admin/ingestion/evaluation')}>
            {/* @ts-ignore */}
            <FileText size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Eval Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/admin/ingestion/playground')}>
            {/* @ts-ignore */}
            <FileText size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Playground</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/admin/ingestion/sources')}>
            {/* @ts-ignore */}
            <FileText size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Sources</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton}>
            {/* @ts-ignore */}
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New Card</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>High Conflicts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>94%</Text>
            <Text style={styles.statLabel}>Avg Confidence</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Sessions</Text>
        
        {MOCK_SESSIONS.map((session) => (
          <TouchableOpacity 
            key={session.id} 
            style={styles.sessionCard}
            onPress={() => router.push(`/admin/ingestion/${session.id}` as any)}
          >
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.cardName}>{session.cardName}</Text>
                <Text style={styles.bankName}>{session.bankName}</Text>
              </View>
              <View style={[
                styles.priorityBadge, 
                session.priority === 'CRITICAL' ? styles.badgeCritical :
                session.priority === 'HIGH' ? styles.badgeHigh : styles.badgeMedium
              ]}>
                <Text style={[
                  session.priority === 'CRITICAL' ? styles.textCritical :
                  session.priority === 'HIGH' ? styles.textHigh : styles.textMedium
                ]}>{session.priority}</Text>
              </View>
            </View>

            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{session.confidence}%</Text>
                <Text style={styles.sessionStatLabel}>Confidence</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{session.verified}</Text>
                <Text style={styles.sessionStatLabel}>Verified</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatValue, session.conflicts > 0 && { color: colors.danger }]}>
                  {session.conflicts}
                </Text>
                <Text style={styles.sessionStatLabel}>Conflicts</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    gap: 4,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontWeight: tokens.fontWeight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
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
  sectionTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    gap: tokens.spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  bankName: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
  },
  badgeCritical: { backgroundColor: '#FEE2E2' },
  badgeHigh: { backgroundColor: '#FEF3C7' },
  badgeMedium: { backgroundColor: '#F3F4F6' },
  textCritical: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  textHigh: { color: colors.warning, fontSize: 10, fontWeight: '700' },
  textMedium: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  sessionStats: {
    flexDirection: 'row',
    gap: tokens.spacing.lg,
    marginTop: tokens.spacing.sm,
  },
  sessionStat: {
    alignItems: 'flex-start',
  },
  sessionStatValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
  },
  sessionStatLabel: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
});
