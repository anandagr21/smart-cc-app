import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useCardWorkspaceV2, usePublishWorkspace } from '../api/cardIntelligenceApi';
import { RewardSection } from './RewardSection';
import { MerchantCoverageSection } from './MerchantCoverageSection';
import { RequiredActionsSection } from './RequiredActionsSection';

const SECTIONS = [
  'Overview',
  'Required Actions',
  'Rewards',
  'Merchant Coverage',
  'Benefits',
  'Milestones',
  'Timeline',
  'Publish'
];

interface Props {
  cardId: string;
}

export const CardIntelligenceWorkspaceV2: React.FC<Props> = ({ cardId }) => {
  const colors = useThemeColors();
  const [activeSection, setActiveSection] = useState('Overview');
  
  const { data, isLoading } = useCardWorkspaceV2(cardId);
  const publishWorkspaceMutation = usePublishWorkspace(cardId || '');

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasBlockers = data.required_actions.some((a: any) => a.severity === 'BLOCKER');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* LEFT SIDEBAR */}
      <View style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: colors.textSecondary }]}>PUBLISH READINESS</Text>
          <Text style={[styles.readinessScore, { color: colors.textPrimary }]}>{data.publish_readiness.overall_score}%</Text>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${data.publish_readiness.overall_score}%` }]} />
          </View>
          
          <View style={styles.breakdownContainer}>
            {Object.entries(data.publish_readiness.categories).map(([category, score]) => (
              <View key={category} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{category}</Text>
                <Text style={[styles.breakdownValue, { color: (score as number) === 100 ? colors.success : colors.warning }]}>
                  {score}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView style={styles.navLinks}>
          {SECTIONS.map((section) => (
            <TouchableOpacity 
              key={section}
              onPress={() => setActiveSection(section)}
              style={[
                styles.navLink,
                activeSection === section && { backgroundColor: colors.primary + '1A', borderRightColor: colors.primary, borderRightWidth: 3 }
              ]}
            >
              <Text style={[
                styles.navLinkText, 
                { color: activeSection === section ? colors.primary : colors.textSecondary },
                activeSection === section && { fontFamily: 'Inter-SemiBold' }
              ]}>
                {section}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* RIGHT CONTENT AREA */}
      <ScrollView style={styles.contentArea}>
        
        {/* CARD HEALTH BANNER */}
        <View style={[styles.healthBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.healthHeaderRow}>
            <View>
              <Text style={[styles.healthCardTitle, { color: colors.textPrimary }]}>{data.card_name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Status: {data.status}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.primary }]}>Source Trust: MEDIUM</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.danger + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.danger }]}>Publish Risk: {data.publish_risk.level}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.criticalItems}>
            <Text style={[styles.criticalItemsTitle, { color: colors.danger }]}>Missing {data.required_actions.length} Critical Items</Text>
            {data.required_actions.map((action: any) => (
              <View key={action.id} style={styles.criticalItemRow}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={[styles.criticalItemText, { color: colors.textPrimary }]}>⚠ {action.title} Missing</Text>
              </View>
            ))}
          </View>
        </View>

        {/* REQUIRED ACTIONS SECTION */}
        <RequiredActionsSection actions={data.required_actions} />

        {/* REAL REWARDS SECTION */}
        <RewardSection rewards={data.rewards} />

        {/* REAL MERCHANT COVERAGE SECTION */}
        <MerchantCoverageSection coverage={data.merchant_coverage} />

        {/* ADMIN DECISION BLOCK */}
        <View style={[styles.decisionBlock, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.decisionTitle, { color: colors.textPrimary }]}>Admin Decision</Text>
          <Text style={[styles.decisionDesc, { color: colors.textSecondary }]}>
            Review the intelligence summary above. If everything looks correct, you can publish this card. This will automatically generate all necessary database rules.
          </Text>
          
          <View style={styles.decisionActions}>
            <TouchableOpacity 
              style={[
                styles.decisionBtn, 
                styles.looksCorrectBtn, 
                hasBlockers ? { backgroundColor: colors.border, opacity: 0.5 } : { backgroundColor: colors.success }
              ]}
              disabled={hasBlockers || publishWorkspaceMutation.isPending}
              onPress={() => publishWorkspaceMutation.mutate()}
            >
              {publishWorkspaceMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFF" />
                  <Text style={styles.looksCorrectBtnText}>Looks Correct (Publish)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.decisionBtn, styles.needsCorrectionBtn, { borderColor: colors.border }]}
              onPress={() => {
                alert("Please resolve the required actions above.");
              }}
            >
              <AlertTriangle size={20} color={colors.textSecondary} />
              <Text style={[styles.needsCorrectionBtnText, { color: colors.textSecondary }]}>Needs Correction</Text>
            </TouchableOpacity>
          </View>

          {hasBlockers && (
            <Text style={[styles.blockerWarningText, { color: colors.warning }]}>
              Cannot publish: You must resolve all BLOCKER actions first.
            </Text>
          )}
        </View>
        
        <View style={{ height: 100 }} />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    height: '100%',
  },
  sidebarHeader: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },
  sidebarTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1,
    marginBottom: tokens.spacing.sm,
  },
  readinessScore: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.sm,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: tokens.spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownContainer: {
    gap: tokens.spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  breakdownValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  navLinks: {
    flex: 1,
  },
  navLink: {
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
  },
  navLinkText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  contentArea: {
    flex: 1,
    padding: tokens.spacing.xl,
  },
  healthBanner: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    marginBottom: tokens.spacing['2xl'],
  },
  healthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthCardTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  divider: {
    height: 1,
    marginVertical: tokens.spacing.lg,
  },
  criticalItems: {
    gap: tokens.spacing.sm,
  },
  criticalItemsTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  criticalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  criticalItemText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  section: {
    marginBottom: tokens.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.lg,
  },
  actionsList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.lg,
  },
  actionDivider: {
    height: 1,
    width: '100%',
  },
  actionInfo: {
    flex: 1,
    paddingRight: tokens.spacing.xl,
  },
  actionTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  actionBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  mockCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  mockCardText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  decisionBlock: {
    marginTop: tokens.spacing['2xl'],
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  decisionTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.sm,
  },
  decisionDesc: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: tokens.spacing.xl,
  },
  decisionActions: {
    flexDirection: 'row',
    gap: tokens.spacing.lg,
  },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.full,
    gap: tokens.spacing.sm,
    minWidth: 200,
  },
  looksCorrectBtn: {
  },
  looksCorrectBtnText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  needsCorrectionBtn: {
    borderWidth: 1,
  },
  needsCorrectionBtnText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  blockerWarningText: {
    marginTop: tokens.spacing.md,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
