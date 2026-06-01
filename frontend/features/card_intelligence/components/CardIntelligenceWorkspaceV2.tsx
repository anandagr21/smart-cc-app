import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { AlertCircle } from 'lucide-react-native';
import { useCardWorkspaceV2 } from '../api/cardIntelligenceApi';
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

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* LEFT SIDEBAR */}
      <View style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: colors.textSecondary }]}>PUBLISH READINESS</Text>
          <Text style={[styles.readinessScore, { color: colors.textPrimary }]}>{data.publishReadiness.overallScore}%</Text>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${data.publishReadiness.overallScore}%` }]} />
          </View>
          
          <View style={styles.breakdownContainer}>
            {Object.entries(data.publishReadiness.categories).map(([category, score]) => (
              <View key={category} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{category}</Text>
                <Text style={[styles.breakdownValue, { color: score === 100 ? colors.success : colors.warning }]}>
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
              <Text style={[styles.healthCardTitle, { color: colors.textPrimary }]}>{data.cardName}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Status: {data.status}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.primary }]}>Source Trust: MEDIUM</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.danger + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.danger }]}>Publish Risk: {data.publishRisk.level}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.criticalItems}>
            <Text style={[styles.criticalItemsTitle, { color: colors.danger }]}>Missing {data.requiredActions.length} Critical Items</Text>
            {data.requiredActions.map((action) => (
              <View key={action.id} style={styles.criticalItemRow}>
                {/* @ts-ignore */}
                <AlertCircle size={16} color={colors.danger} />
                <Text style={[styles.criticalItemText, { color: colors.textPrimary }]}>⚠ {action.title} Missing</Text>
              </View>
            ))}
          </View>
        </View>

        {/* REQUIRED ACTIONS SECTION */}
        <RequiredActionsSection actions={data.requiredActions} />

        {/* REAL REWARDS SECTION */}
        <RewardSection rewards={data.rewards} />

        {/* REAL MERCHANT COVERAGE SECTION */}
        <MerchantCoverageSection coverage={data.merchantCoverage} />
        
        {/* Adding extra space at the bottom for scrolling */}
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
  }
});
