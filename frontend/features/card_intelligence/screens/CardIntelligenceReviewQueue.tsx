import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useCandidates, useUpdateCandidate, usePublishPreview, usePublishChanges } from '../api/cardIntelligenceApi';
import { CandidateStatus, CardExtractionCandidateResponse } from '../types/api';
import { Check, X, Edit2, PlayCircle, Eye, AlertCircle, FileText } from 'lucide-react-native';

interface Props {
  cardId: string;
}

const TABS: { label: string; status: CandidateStatus }[] = [
  { label: 'Pending', status: 'PENDING_REVIEW' },
  { label: 'Approved', status: 'APPROVED' },
  { label: 'Rejected', status: 'REJECTED' },
  { label: 'Published', status: 'PUBLISHED' },
];

export const CardIntelligenceReviewQueue: React.FC<Props> = ({ cardId }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  
  const [activeTab, setActiveTab] = useState<CandidateStatus>('PENDING_REVIEW');
  const [selectedCandidate, setSelectedCandidate] = useState<CardExtractionCandidateResponse | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: candidates, isLoading } = useCandidates(cardId, activeTab);
  const { data: publishPreview } = usePublishPreview(cardId);
  const updateMutation = useUpdateCandidate(cardId);
  const publishMutation = usePublishChanges(cardId);

  const handleUpdateStatus = (candidate: CardExtractionCandidateResponse, newStatus: CandidateStatus) => {
    updateMutation.mutate({
      candidateId: candidate.id,
      payload: { status: newStatus, review_notes: reviewNotes || undefined }
    });
    setSelectedCandidate(null);
    setReviewNotes('');
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Review Queue</Text>
        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <TouchableOpacity 
              key={tab.status}
              style={[
                styles.tabBtn, 
                activeTab === tab.status && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => setActiveTab(tab.status)}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === tab.status ? colors.textPrimary : colors.textSecondary }
              ]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.layout}>
        {/* Main Table Area */}
        <View style={styles.mainArea}>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : candidates?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No candidates found in {activeTab}.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.tableScroll}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>TYPE / IDENTIFIER</Text>
                <Text style={[styles.th, { color: colors.textSecondary, flex: 1.5 }]}>CURRENT</Text>
                <Text style={[styles.th, { color: colors.textSecondary, flex: 1.5 }]}>PROPOSED</Text>
                <Text style={[styles.th, { color: colors.textSecondary, width: 80, textAlign: 'center' }]}>CONF</Text>
                <Text style={[styles.th, { color: colors.textSecondary, width: 120, textAlign: 'center' }]}>ACTIONS</Text>
              </View>
              
              {candidates?.map((candidate) => (
                <View 
                  key={candidate.id} 
                  style={[
                    styles.tr, 
                    { borderBottomColor: colors.border },
                    selectedCandidate?.id === candidate.id && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.tdType, { color: colors.textPrimary }]}>{candidate.candidate_type}</Text>
                    {candidate.entity_identifier && (
                      <Text style={[styles.tdIdentifier, { color: colors.textSecondary }]}>{candidate.entity_identifier}</Text>
                    )}
                    <Text style={[styles.tdField, { color: colors.textMuted }]}>{candidate.field_name}</Text>
                  </View>
                  
                  <View style={{ flex: 1.5, paddingRight: 10 }}>
                    <Text style={[styles.tdValue, { color: colors.textSecondary }]} numberOfLines={3}>
                      {candidate.current_value ? JSON.stringify(candidate.current_value, null, 2) : '—'}
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1.5, paddingRight: 10 }}>
                    <Text style={[styles.tdValue, { color: colors.primary }]} numberOfLines={3}>
                      {JSON.stringify(candidate.proposed_value, null, 2)}
                    </Text>
                  </View>
                  
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <Text style={[styles.tdConf, { color: candidate.confidence_score > 0.8 ? colors.success : colors.warning }]}>
                      {Math.round(candidate.confidence_score * 100)}%
                    </Text>
                  </View>
                  
                  <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => setSelectedCandidate(candidate)} style={styles.actionBtn}>
                      {/* @ts-ignore */}
                      <Eye size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {activeTab === 'PENDING_REVIEW' && (
                      <>
                        <TouchableOpacity onPress={() => handleUpdateStatus(candidate, 'APPROVED')} style={styles.actionBtn}>
                          {/* @ts-ignore */}
                          <Check size={18} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleUpdateStatus(candidate, 'REJECTED')} style={styles.actionBtn}>
                          {/* @ts-ignore */}
                          <X size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Right Panel: Source Viewer & Publish */}
        <View style={[styles.sidePanel, { borderLeftColor: colors.border }]}>
          {selectedCandidate ? (
            <ScrollView style={styles.sourceViewer} showsVerticalScrollIndicator={false}>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Source Citation</Text>
              
              <View style={[styles.sourceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {/* @ts-ignore */}
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={[styles.sourceRef, { color: colors.textSecondary }]}>
                    Page {selectedCandidate.source_page || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.sourceText, { color: colors.textPrimary }]}>"{selectedCandidate.source_text}"</Text>
              </View>
              
              <Text style={[styles.panelTitle, { color: colors.textPrimary, marginTop: 24 }]}>Review Notes</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                placeholder="Add notes for this decision..."
                placeholderTextColor={colors.textMuted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
              />
              
              {activeTab === 'PENDING_REVIEW' && (
                <View style={styles.decisionActions}>
                  <TouchableOpacity 
                    style={[styles.approveBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                    onPress={() => handleUpdateStatus(selectedCandidate, 'APPROVED')}
                  >
                    <Text style={[styles.btnText, { color: colors.success }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rejectBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                    onPress={() => handleUpdateStatus(selectedCandidate, 'REJECTED')}
                  >
                    <Text style={[styles.btnText, { color: colors.danger }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.publishPanel}>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Publish Preview</Text>
              
              {publishPreview && publishPreview.total_candidates > 0 ? (
                <View style={styles.previewBox}>
                  <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                    + {publishPreview.reward_rules_added} Reward Rules Added
                  </Text>
                  <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                    ~ {publishPreview.reward_rules_updated} Reward Rules Updated
                  </Text>
                  <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                    + {publishPreview.benefits_added} Benefits Added
                  </Text>
                  <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                    ~ {publishPreview.fees_updated} Fees Updated
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.publishActionBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePublish}
                    disabled={publishMutation.isPending}
                  >
                    {/* @ts-ignore */}
                    <PlayCircle size={18} color="#FFF" />
                    <Text style={styles.publishActionText}>
                      Publish {publishPreview.total_candidates} Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.emptyStateText, { color: colors.textMuted, marginTop: 20 }]}>
                  No approved candidates pending publish.
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  tabBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  tabText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  layout: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  mainArea: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  tableScroll: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  tdType: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  tdIdentifier: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  tdField: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  tdValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  tdConf: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  actionBtn: {
    padding: 6,
  },
  sidePanel: {
    width: Platform.OS === 'web' ? 320 : '100%',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    paddingLeft: Platform.OS === 'web' ? tokens.spacing.xl : 0,
    paddingTop: Platform.OS === 'web' ? 0 : tokens.spacing.xl,
  },
  panelTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.md,
  },
  sourceViewer: {
    flex: 1,
  },
  sourceBox: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  sourceRef: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  sourceText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  notesInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
  },
  decisionActions: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xl,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
  },
  btnText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  publishPanel: {
    flex: 1,
  },
  previewBox: {
    marginTop: tokens.spacing.md,
  },
  previewItem: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
    marginBottom: tokens.spacing.sm,
  },
  publishActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing['2xl'],
    gap: 8,
  },
  publishActionText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
});
