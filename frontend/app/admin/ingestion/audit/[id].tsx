import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DynamicIcon } from '@/components/DynamicIcon';

const MOCK_AUDIT_LOGS = [
  { id: '1', type: 'PUBLISH', title: 'Published Version 4', actor: 'Admin (You)', date: 'Today, 2:30 PM', isBot: false },
  { id: '2', type: 'EDIT', title: 'Admin Edited Lounge Access', detail: 'Changed "4 Visits" to "8 Visits"', actor: 'Admin (You)', date: 'Today, 2:15 PM', isBot: false },
  { id: '3', type: 'VERIFY', title: 'AI Verified Fields', detail: '21 fields verified against MITC', actor: 'Card Analyser AI', date: 'Today, 1:45 PM', isBot: true },
  { id: '4', type: 'EXTRACT', title: 'AI Extracted Data', detail: 'Processed HDFC_Millennia_MITC.pdf', actor: 'Card Analyser AI', date: 'Today, 1:42 PM', isBot: true },
];

export default function AuditTimelineScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <DynamicIcon name="ArrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Audit Timeline</Text>
          <Text style={styles.subtitle}>Session ID: {id}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.timeline}>
          {MOCK_AUDIT_LOGS.map((log, index) => (
            <View key={log.id} style={styles.timelineRow}>
              {/* Timeline Connector */}
              <View style={styles.connectorColumn}>
                <View style={[
                  styles.node, 
                  log.type === 'PUBLISH' ? styles.nodeSuccess :
                  log.isBot ? styles.nodeBot : styles.nodeUser
                ]}>
                  {log.type === 'PUBLISH' ? (
                    <DynamicIcon name="GitCommit" size={14} color="#FFF" />
                  ) : log.isBot ? (
                    <DynamicIcon name="Bot" size={14} color="#FFF" />
                  ) : (
                    <DynamicIcon name="User" size={14} color="#FFF" />
                  )}
                </View>
                {index !== MOCK_AUDIT_LOGS.length - 1 && <View style={styles.line} />}
              </View>

              {/* Log Content */}
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
                {log.detail && (
                  <Text style={styles.logDetail}>{log.detail}</Text>
                )}
                <View style={styles.actorBadge}>
                  {log.isBot ? (
                    <DynamicIcon name="Bot" size={12} color={colors.primary} />
                  ) : (
                    <DynamicIcon name="User" size={12} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.actorText, log.isBot && { color: colors.primary }]}>
                    {log.actor}
                  </Text>
                </View>
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
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  connectorColumn: {
    alignItems: 'center',
    width: 24,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  nodeUser: {
    backgroundColor: colors.textSecondary,
  },
  nodeBot: {
    backgroundColor: colors.primary,
  },
  nodeSuccess: {
    backgroundColor: colors.success,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderHighlight,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  logCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
    gap: tokens.spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  logDate: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
  logDetail: {
    fontSize: tokens.fontSize.body,
    color: colors.textSecondary,
  },
  actorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: tokens.spacing.xs,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  actorText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textSecondary,
  },
});
