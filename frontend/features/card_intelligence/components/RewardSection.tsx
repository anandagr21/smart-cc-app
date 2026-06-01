import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { WorkspaceReward } from '../types/api';
import { CheckCircle, AlertCircle, ShieldCheck, ShieldAlert, Shield } from 'lucide-react-native';

interface Props {
  rewards: WorkspaceReward[];
}

export const RewardSection: React.FC<Props> = ({ rewards }) => {
  const colors = useThemeColors();

  if (!rewards || rewards.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rewards</Text>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No rewards extracted.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rewards</Text>
      
      {rewards.map((reward, index) => (
        <View key={index} style={[styles.rewardCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.rewardHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.rewardCategory, { color: colors.textSecondary }]}>{reward.category}</Text>
              <Text style={[styles.rewardTitle, { color: colors.textPrimary }]}>{reward.title}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: reward.status === 'READY' ? colors.success + '20' : colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: reward.status === 'READY' ? colors.success : colors.warning }]}>
                  Status: {reward.status}
                </Text>
              </View>
              {reward.statusReason && (
                <Text style={[styles.statusReason, { color: colors.warning }]}>{reward.statusReason}</Text>
              )}
            </View>
          </View>

          <View style={styles.rewardBody}>
            {/* Left Column: Merchants & Source Confidence */}
            <View style={styles.leftColumn}>
              {reward.merchants && reward.merchants.length > 0 && (
                <View style={styles.merchantsList}>
                  <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Merchants</Text>
                  {reward.merchants.map((merchant, mIdx) => (
                    <View key={mIdx} style={styles.merchantRow}>
                      <Text style={[styles.merchantText, { color: colors.textPrimary }]}>✓ {merchant}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.confidenceBox}>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Source Confidence</Text>
                <View style={styles.confidenceRow}>
                  {/* @ts-ignore */}
                  <ShieldCheck size={20} color={reward.translation.confidenceScore >= 90 ? colors.success : colors.warning} />
                  <Text style={[styles.confidenceScore, { color: colors.textPrimary }]}>{reward.translation.confidenceScore}%</Text>
                </View>
                {reward.translation.confidenceScore >= 90 ? (
                  <Text style={[styles.confidenceAdvice, { color: colors.success }]}>Safe To Publish</Text>
                ) : (
                  <Text style={[styles.confidenceAdvice, { color: colors.warning }]}>Manual Verification Recommended</Text>
                )}
                <Text style={[styles.confidenceReason, { color: colors.textSecondary }]}>{reward.translation.confidenceReason}</Text>
              </View>
            </View>

            {/* Right Column: Translation Panel */}
            <View style={[styles.translationPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.translationRow}>
                <View style={styles.translationCol}>
                  <Text style={[styles.transLabel, { color: colors.textSecondary }]}>Document Says</Text>
                  <Text style={[styles.transValue, { color: colors.textPrimary }]}>{reward.translation.documentText}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={styles.translationRow}>
                <View style={styles.translationCol}>
                  <Text style={[styles.transLabel, { color: colors.textSecondary }]}>System Interpretation</Text>
                  <Text style={[styles.transValue, { color: colors.primary }]}>{reward.translation.systemInterpretation}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {reward.translation.conditions && reward.translation.conditions.length > 0 && (
                <>
                  <View style={styles.translationRow}>
                    <View style={styles.translationCol}>
                      <Text style={[styles.transLabel, { color: colors.textSecondary }]}>Conditions</Text>
                      {reward.translation.conditions.map((condition, idx) => (
                        <View key={idx} style={styles.conditionRow}>
                          {/* @ts-ignore */}
                          <CheckCircle size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.conditionText, { color: colors.textPrimary }]}>{condition}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              )}

              <View style={styles.translationRowSplit}>
                <View style={styles.translationCol}>
                  <Text style={[styles.transLabel, { color: colors.textSecondary }]}>Point Value</Text>
                  {reward.translation.pointValueKnown ? (
                    <Text style={[styles.transValue, { color: colors.textPrimary }]}>₹{reward.translation.pointValue}</Text>
                  ) : (
                    <View style={styles.missingValue}>
                      {/* @ts-ignore */}
                      <AlertCircle size={14} color={colors.danger} />
                      <Text style={[styles.missingValueText, { color: colors.danger }]}>Missing</Text>
                    </View>
                  )}
                </View>
                <View style={styles.translationCol}>
                  <Text style={[styles.transLabel, { color: colors.textSecondary }]}>Effective Return</Text>
                  {reward.translation.effectiveReward ? (
                    <Text style={[styles.transValueHighlight, { color: colors.success }]}>{reward.translation.effectiveReward}</Text>
                  ) : (
                    <Text style={[styles.transValue, { color: colors.textSecondary }]}>--</Text>
                  )}
                </View>
              </View>
              
              {!reward.translation.pointValueKnown && (
                <View style={styles.missingWarningBox}>
                  <Text style={[styles.missingWarningText, { color: colors.danger }]}>Point Value missing. Required before publishing.</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* NEW: Source Documents */}
          {reward.sourceDocuments && reward.sourceDocuments.length > 0 && (
            <View style={styles.sourceDocsContainer}>
              <Text style={[styles.subTitle, { color: colors.textSecondary, marginBottom: 8 }]}>Source Documents</Text>
              <View style={styles.sourceDocsRow}>
                {reward.sourceDocuments.map((doc, idx) => (
                  <View key={idx} style={[styles.sourceDocBadge, { backgroundColor: colors.surface }]}>
                    {/* @ts-ignore */}
                    <CheckCircle size={12} color={colors.success} style={{ marginRight: 6 }} />
                    <Text style={[styles.sourceDocText, { color: colors.textPrimary }]}>{doc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: tokens.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.lg,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  rewardCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    marginBottom: tokens.spacing.lg,
    overflow: 'hidden',
  },
  rewardHeader: {
    padding: tokens.spacing.xl,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardCategory: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: tokens.fontSize.h3,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  statusReason: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  rewardBody: {
    flexDirection: 'row',
    padding: tokens.spacing.xl,
    gap: tokens.spacing.xl,
  },
  leftColumn: {
    flex: 1,
  },
  merchantsList: {
    marginBottom: tokens.spacing.xl,
  },
  subTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  merchantRow: {
    marginBottom: tokens.spacing.xs,
  },
  merchantText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  confidenceBox: {
    marginTop: tokens.spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: 4,
  },
  confidenceScore: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  confidenceAdvice: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
    marginBottom: 4,
  },
  confidenceReason: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  sourceDocsContainer: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  sourceDocsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  sourceDocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sourceDocText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  translationPanel: {
    flex: 2,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
  },
  translationRow: {
    paddingVertical: tokens.spacing.sm,
  },
  translationRowSplit: {
    flexDirection: 'row',
    paddingVertical: tokens.spacing.sm,
  },
  translationCol: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: tokens.spacing.sm,
  },
  transLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transValue: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  transValueHighlight: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  missingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missingValueText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Bold',
  },
  missingWarningBox: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
  },
  missingWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  conditionText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  }
});
