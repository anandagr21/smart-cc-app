import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Switch } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useCardReviewData, useSubmitReviewAction, SuggestedCardData, RewardRule } from '../api/cardIntelligenceApi';
import { router } from 'expo-router';

interface Props {
  cardId: string;
}

export const CardIntelligenceWorkspaceV2: React.FC<Props> = ({ cardId }) => {
  const colors = useThemeColors();
  
  const { data, isLoading, isError, error } = useCardReviewData(cardId);
  const submitReviewActionMutation = useSubmitReviewAction();

  const [editedJson, setEditedJson] = useState<SuggestedCardData | null>(null);

  useEffect(() => {
    if (data && data.suggested_database_json) {
      setEditedJson(data.suggested_database_json);
    }
  }, [data]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.statusText, { color: colors.textSecondary, marginTop: 16 }]}>
          Loading extraction data…
        </Text>
      </View>
    );
  }

  // ── Error / no snapshot state ──────────────────────────────────────────────
  if (isError || !data || !editedJson) {
    const axiosError = error as { response?: { status?: number }; message?: string } | null;
    const is404 = axiosError?.response?.status === 404;

    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.errorBox, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <AlertTriangle size={24} color={colors.warning} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            {is404 ? 'No Ingestion Snapshot' : 'Failed to Load'}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {is404
              ? 'This card hasn\'t been through the Document Ingestion pipeline yet. Upload a bank PDF or URL source to generate structured extraction data.'
              : axiosError?.message || 'An unexpected error occurred while loading the review data.'}
          </Text>
        </View>
      </View>
    );
  }

  const handleApprove = () => {
    submitReviewActionMutation.mutate({
      card_id: cardId,
      approve: true,
      edited_json: editedJson
    }, {
      onSuccess: () => {
        alert("Card Intelligence published successfully!");
        router.back();
      }
    });
  };

  const handleReject = () => {
    submitReviewActionMutation.mutate({
      card_id: cardId,
      approve: false,
      edited_json: editedJson
    }, {
      onSuccess: () => {
        alert("Changes discarded. Card flagged for re-scraping.");
        router.back();
      }
    });
  };

  const updateRootField = (field: keyof SuggestedCardData, value: string | number) => {
    setEditedJson(prev => prev ? { ...prev, [field]: value as never } : prev);
  };

  const updateRewardRule = (index: number, field: keyof RewardRule, value: string | number | boolean) => {
    setEditedJson(prev => {
      if (!prev) return prev;
      const newRules = [...prev.reward_rules];
      newRules[index] = { ...newRules[index], [field]: value };
      return { ...prev, reward_rules: newRules };
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* LEFT SIDEBAR: Source Markdown */}
      <View style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: colors.textSecondary }]}>RAW SOURCE DOCUMENT</Text>
        </View>
        <ScrollView style={styles.sourceScroll}>
          <Text style={[styles.sourceText, { color: colors.textPrimary }]}>{data.source_markdown}</Text>
        </ScrollView>
      </View>

      {/* RIGHT CONTENT AREA: Structural Editor */}
      <View style={styles.contentAreaWrapper}>
        <ScrollView style={styles.contentArea}>
          <View style={[styles.healthBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.healthCardTitle, { color: colors.textPrimary }]}>Structured Database Verification</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Card Name</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.card_name}
                onChangeText={(val) => updateRootField('card_name', val)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Bank Issuer</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.bank_issuer}
                onChangeText={(val) => updateRootField('bank_issuer', val)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Base Reward Rate (per 100)</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.base_reward_rate_per_100.toString()}
                keyboardType="numeric"
                onChangeText={(val) => updateRootField('base_reward_rate_per_100', parseFloat(val) || 0)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Joining Fee (₹)</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.joining_fee ? editedJson.joining_fee.toString() : '0'}
                keyboardType="numeric"
                onChangeText={(val) => updateRootField('joining_fee', parseFloat(val) || 0)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Annual Fee (₹)</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.annual_fee ? editedJson.annual_fee.toString() : '0'}
                keyboardType="numeric"
                onChangeText={(val) => updateRootField('annual_fee', parseFloat(val) || 0)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Fee Waiver Spend Threshold (₹)</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={editedJson.fee_waiver_spend_threshold ? editedJson.fee_waiver_spend_threshold.toString() : ''}
                keyboardType="numeric"
                placeholder="E.g., 100000"
                placeholderTextColor={colors.textMuted}
                onChangeText={(val) => updateRootField('fee_waiver_spend_threshold', val ? parseFloat(val) : null)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reward Rules ({editedJson.reward_rules.length})</Text>
            {editedJson.reward_rules.map((rule, idx) => (
              <View key={idx} style={[styles.ruleCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={styles.ruleRow}>
                  <View style={styles.formGroupFlex}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Category Name</Text>
                    <TextInput 
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      value={rule.category_name}
                      onChangeText={(val) => updateRewardRule(idx, 'category_name', val)}
                    />
                  </View>
                  <View style={styles.formGroupFlex}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Multiplier</Text>
                    <TextInput 
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      value={rule.multiplier.toString()}
                      keyboardType="numeric"
                      onChangeText={(val) => updateRewardRule(idx, 'multiplier', parseFloat(val) || 0)}
                    />
                  </View>
                  <View style={styles.formGroupFlexSwitch}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Has Cap?</Text>
                    <Switch
                      value={rule.has_cap}
                      onValueChange={(val) => updateRewardRule(idx, 'has_cap', val)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  </View>
                </View>
              </View>
            ))}

          </View>
          <View style={{ height: 150 }} />
        </ScrollView>
        
        {/* SUBMISSION FOOTER */}
        <View style={[styles.decisionBlock, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
          <View style={styles.decisionActions}>
            <TouchableOpacity 
              style={[styles.decisionBtn, styles.looksCorrectBtn, { backgroundColor: colors.success }]}
              disabled={submitReviewActionMutation.isPending}
              onPress={handleApprove}
            >
              {submitReviewActionMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFF" />
                  <Text style={styles.looksCorrectBtnText}>Approve & Save</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.decisionBtn, styles.needsCorrectionBtn, { borderColor: colors.border }]}
              onPress={handleReject}
            >
              <AlertTriangle size={20} color={colors.textSecondary} />
              <Text style={[styles.needsCorrectionBtnText, { color: colors.textSecondary }]}>Reject & Rescrape</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  statusText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  errorBox: {
    marginHorizontal: tokens.spacing.xl,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    maxWidth: 480,
  },
  errorTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-Bold',
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    lineHeight: Math.round(tokens.fontSize.body * tokens.lineHeight.relaxed),
    textAlign: 'center',
  },
  sidebar: {
    width: 400,
    borderRightWidth: 1,
    height: '100%',
  },
  sidebarHeader: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing.md,
  },
  sidebarTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1,
  },
  sourceScroll: {
    flex: 1,
    padding: tokens.spacing.xl,
  },
  sourceText: {
    fontFamily: 'SF Mono',
    fontSize: 12,
    lineHeight: 18,
  },
  contentAreaWrapper: {
    flex: 1,
    position: 'relative',
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
  healthCardTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.xl,
  },
  formGroup: {
    marginBottom: tokens.spacing.lg,
  },
  formGroupFlex: {
    flex: 1,
    marginRight: tokens.spacing.md,
  },
  formGroupFlexSwitch: {
    marginRight: tokens.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: tokens.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  divider: {
    height: 1,
    marginVertical: tokens.spacing.xl,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.lg,
  },
  ruleCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  decisionBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: tokens.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
});
