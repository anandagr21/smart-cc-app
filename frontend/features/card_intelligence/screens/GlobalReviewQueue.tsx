import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { Check, X, Zap, Edit2, AlertCircle, FileText, ChevronDown, ChevronRight, Filter } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useGlobalCandidates, useUpdateCandidate, useBatchUpdateCandidates } from '../api/cardIntelligenceApi';
import { CardExtractionCandidateResponse, CandidateType } from '../types/api';
import { CardCatalogResponse } from '@/features/cards/types/api';

const CHANGE_TYPE_ORDER = ['ADD', 'UPDATE', 'STALE'];
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

const CHANGE_TYPE_META: Record<string, { label: string; color: string; bgColor: string }> = {
  ADD: { label: 'New Rules to Add', color: '#10B981', bgColor: 'rgba(16,185,129,0.1)' },
  UPDATE: { label: 'Rate Changes', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' },
  STALE: { label: 'Possibly Stale Rules', color: '#6B7280', bgColor: 'rgba(107,114,128,0.08)' },
};

interface Props {
  catalog: CardCatalogResponse[];
}

export const GlobalReviewQueue: React.FC<Props> = ({ catalog }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<CandidateType | 'ALL'>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<CardExtractionCandidateResponse | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: candidates, isLoading } = useGlobalCandidates('PENDING_REVIEW');
  const updateMutation = useUpdateCandidate('');
  const batchMutation = useBatchUpdateCandidates();

  // Card name lookup map
  const cardMap = useMemo(() => {
    const m: Record<string, string> = {};
    catalog.forEach(c => { m[c.id] = `${c.bank_name} ${c.card_name}`; });
    return m;
  }, [catalog]);

  // Filtered candidates
  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (filterType === 'ALL') return candidates;
    return candidates.filter(c => c.candidate_type === filterType);
  }, [candidates, filterType]);

  // Group by change_type
  const grouped = useMemo(() => {
    const groups: Record<string, CardExtractionCandidateResponse[]> = {};
    filtered.forEach(c => {
      const key = c.change_type || 'ADD';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filtered]);

  const highConfidencePending = useMemo(() => {
    return filtered.filter(c => (c.confidence_score ?? 0) >= HIGH_CONFIDENCE_THRESHOLD && (c.change_type || 'ADD') !== 'STALE');
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getSelectedCandidates = () => filtered.filter(c => selectedIds.has(c.id));

  const handleBatchAction = (status: 'APPROVED' | 'REJECTED') => {
    const toUpdate = getSelectedCandidates();
    if (!toUpdate.length) return;
    batchMutation.mutate({ candidates: toUpdate, status });
    setSelectedIds(new Set());
  };

  const handleApproveHighConfidence = () => {
    batchMutation.mutate({ candidates: highConfidencePending, status: 'APPROVED' });
    setSelectedIds(new Set());
  };

  const handleSelectCandidate = (c: CardExtractionCandidateResponse) => {
    setSelectedCandidate(c);
    setEditedValue(JSON.stringify(c.proposed_value, null, 2));
    setEditError(null);
    setReviewNotes('');
  };

  const handleUpdateSingle = (c: CardExtractionCandidateResponse, status: 'APPROVED' | 'REJECTED') => {
    let parsedValue: Record<string, any>;
    try { parsedValue = JSON.parse(editedValue); } catch {
      setEditError('Invalid JSON');
      return;
    }
    updateMutation.mutate({
      candidateId: c.id,
      payload: { status, proposed_value: parsedValue, review_notes: reviewNotes || undefined },
    });
    setSelectedCandidate(null);
  };

  const formatRate = (val: Record<string, any>) => {
    if (val?.reward_rate !== undefined) return `${(val.reward_rate * 100).toFixed(1)}%`;
    if (val?.value !== undefined) return `₹${val.value.toLocaleString()}`;
    return JSON.stringify(val).slice(0, 40);
  };

  const getRateDelta = (c: CardExtractionCandidateResponse) => {
    if (c.change_type !== 'UPDATE') return null;
    const cur = c.current_value?.reward_rate;
    const prop = c.proposed_value?.reward_rate;
    if (cur == null || prop == null) return null;
    const delta = ((prop - cur) / cur) * 100;
    return delta;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading global queue...</Text>
      </View>
    );
  }

  const totalPending = filtered.length;

  return (
    <View style={styles.root}>
      {/* ── Toolbar ── */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            style={[styles.checkboxOuter, { borderColor: colors.border, backgroundColor: selectedIds.size === totalPending && totalPending > 0 ? colors.primary : 'transparent' }]}
            onPress={toggleSelectAll}
          >
            {selectedIds.size === totalPending && totalPending > 0 && (
              // @ts-ignore
              <Check size={12} color="#FFF" />
            )}
          </TouchableOpacity>
          <Text style={[styles.toolbarCount, { color: colors.textSecondary }]}>
            {totalPending} pending {selectedIds.size > 0 ? `· ${selectedIds.size} selected` : ''}
          </Text>
        </View>

        <View style={styles.toolbarRight}>
          {/* Approve High Confidence */}
          {highConfidencePending.length > 0 && selectedIds.size === 0 && (
            <TouchableOpacity
              style={[styles.toolbarBtn, { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.3)' }]}
              onPress={handleApproveHighConfidence}
              disabled={batchMutation.isPending}
            >
              {/* @ts-ignore */}
              <Zap size={14} color="#8B5CF6" />
              <Text style={[styles.toolbarBtnText, { color: '#8B5CF6' }]}>
                Auto-Approve {highConfidencePending.length} High Confidence
              </Text>
            </TouchableOpacity>
          )}

          {/* Batch actions when rows selected */}
          {selectedIds.size > 0 && (
            <>
              <TouchableOpacity
                style={[styles.toolbarBtn, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}
                onPress={() => handleBatchAction('APPROVED')}
                disabled={batchMutation.isPending}
              >
                {/* @ts-ignore */}
                <Check size={14} color={colors.success} />
                <Text style={[styles.toolbarBtnText, { color: colors.success }]}>Approve {selectedIds.size}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolbarBtn, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}
                onPress={() => handleBatchAction('REJECTED')}
                disabled={batchMutation.isPending}
              >
                {/* @ts-ignore */}
                <X size={14} color={colors.danger} />
                <Text style={[styles.toolbarBtnText, { color: colors.danger }]}>Reject {selectedIds.size}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Type filter */}
          <View style={[styles.filterPill, { borderColor: colors.border }]}>
            {/* @ts-ignore */}
            <Filter size={13} color={colors.textSecondary} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['ALL', 'REWARD_RULE', 'BENEFIT', 'MILESTONE', 'FEE_RULE'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setFilterType(t as any)}
                  style={[styles.filterChip, filterType === t && { backgroundColor: colors.primary + '22' }]}
                >
                  <Text style={[styles.filterChipText, { color: filterType === t ? colors.primary : colors.textSecondary }]}>
                    {t === 'ALL' ? 'All' : t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* ── Candidate List ── */}
        <ScrollView style={styles.list}>
          {totalPending === 0 ? (
            <View style={styles.emptyState}>
              {/* @ts-ignore */}
              <Check size={32} color={colors.success} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>No pending review candidates across any card.</Text>
            </View>
          ) : (
            CHANGE_TYPE_ORDER.map(changeType => {
              const group = grouped[changeType];
              if (!group?.length) return null;
              const meta = CHANGE_TYPE_META[changeType] || CHANGE_TYPE_META['ADD'];
              const isCollapsed = collapsedGroups.has(changeType);
              return (
                <View key={changeType} style={styles.group}>
                  {/* Group Header */}
                  <TouchableOpacity
                    style={[styles.groupHeader, { backgroundColor: meta.bgColor }]}
                    onPress={() => toggleGroup(changeType)}
                  >
                    {/* @ts-ignore */}
                    {isCollapsed ? <ChevronRight size={16} color={meta.color} /> : <ChevronDown size={16} color={meta.color} />}
                    <Text style={[styles.groupLabel, { color: meta.color }]}>{meta.label}</Text>
                    <View style={[styles.groupBadge, { backgroundColor: meta.color + '22' }]}>
                      <Text style={[styles.groupBadgeText, { color: meta.color }]}>{group.length}</Text>
                    </View>
                  </TouchableOpacity>

                  {!isCollapsed && group.map(candidate => {
                    const isSelected = selectedIds.has(candidate.id);
                    const isActive = selectedCandidate?.id === candidate.id;
                    const cardName = cardMap[candidate.card_id] || candidate.card_id.slice(0, 8);
                    const delta = getRateDelta(candidate);
                    const isHighConf = (candidate.confidence_score ?? 0) >= HIGH_CONFIDENCE_THRESHOLD;

                    return (
                      <TouchableOpacity
                        key={candidate.id}
                        style={[
                          styles.row,
                          { borderBottomColor: colors.border },
                          isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }
                        ]}
                        onPress={() => handleSelectCandidate(candidate)}
                        activeOpacity={0.7}
                      >
                        {/* Checkbox */}
                        <TouchableOpacity
                          style={[styles.checkboxOuter, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent', marginRight: 12 }]}
                          onPress={() => toggleSelect(candidate.id)}
                        >
                          {isSelected && <Check size={10} color="#FFF" />}
                        </TouchableOpacity>

                        {/* Card tag */}
                        <View style={[styles.cardTag, { backgroundColor: colors.surfaceElevated }]}>
                          <Text style={[styles.cardTagText, { color: colors.textSecondary }]} numberOfLines={1}>{cardName}</Text>
                        </View>

                        {/* Rule info */}
                        <View style={styles.ruleInfo}>
                          <Text style={[styles.ruleId, { color: colors.textPrimary }]} numberOfLines={1}>
                            {candidate.entity_identifier || candidate.field_name}
                          </Text>
                          <Text style={[styles.ruleType, { color: colors.textMuted }]}>
                            {candidate.candidate_type}
                          </Text>
                        </View>

                        {/* Diff */}
                        <View style={styles.diff}>
                          {candidate.change_type === 'UPDATE' && candidate.current_value ? (
                            <View style={styles.diffRow}>
                              <Text style={[styles.diffCurrent, { color: colors.textSecondary }]}>
                                {formatRate(candidate.current_value)}
                              </Text>
                              <Text style={{ color: colors.textMuted, marginHorizontal: 4 }}>→</Text>
                              <Text style={[styles.diffProposed, { color: delta != null && delta < 0 ? colors.danger : colors.success }]}>
                                {formatRate(candidate.proposed_value)}
                              </Text>
                              {delta != null && (
                                <Text style={[styles.deltaBadge, { color: delta < 0 ? colors.danger : colors.success, backgroundColor: delta < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }]}>
                                  {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                                </Text>
                              )}
                            </View>
                          ) : (
                            <Text style={[styles.diffProposed, { color: changeType === 'ADD' ? colors.success : colors.textSecondary }]}>
                              {changeType === 'ADD' ? `+ ${formatRate(candidate.proposed_value)}` : formatRate(candidate.proposed_value)}
                            </Text>
                          )}
                        </View>

                        {/* Confidence */}
                        <View style={[styles.confBadge, { backgroundColor: isHighConf ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                          <Text style={[styles.confText, { color: isHighConf ? colors.success : colors.warning }]}>
                            {Math.round((candidate.confidence_score ?? 0) * 100)}%
                          </Text>
                        </View>

                        {/* Quick actions */}
                        <View style={styles.quickActions}>
                          <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: 'rgba(16,185,129,0.1)' }]}
                            onPress={() => {
                              updateMutation.mutate({ candidateId: candidate.id, payload: { status: 'APPROVED', proposed_value: candidate.proposed_value } });
                            }}
                          >
                            {/* @ts-ignore */}
                            <Check size={14} color={colors.success} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                            onPress={() => {
                              updateMutation.mutate({ candidateId: candidate.id, payload: { status: 'REJECTED' } });
                            }}
                          >
                            {/* @ts-ignore */}
                            <X size={14} color={colors.danger} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                            onPress={() => handleSelectCandidate(candidate)}
                          >
                            {/* @ts-ignore */}
                            <Edit2 size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ── Detail Panel ── */}
        {selectedCandidate && (
          <View style={[styles.detailPanel, { borderLeftColor: colors.border, backgroundColor: isDark ? '#0F1420' : '#FAFAFA' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                  {selectedCandidate.entity_identifier || selectedCandidate.field_name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCandidate(null)}>
                  {/* @ts-ignore */}
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.detailCard, { color: colors.textSecondary }]}>
                {cardMap[selectedCandidate.card_id] || selectedCandidate.card_id}
              </Text>

              {/* Source Citation */}
              <View style={[styles.citationBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {/* @ts-ignore */}
                <FileText size={13} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={[styles.citationText, { color: colors.textPrimary }]}>
                  "{selectedCandidate.source_text}"
                </Text>
                <Text style={[styles.citationPage, { color: colors.textMuted }]}>
                  Page {selectedCandidate.source_page || 'N/A'}
                </Text>
              </View>

              {/* Proposed Value Editor */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 8 }}>
                <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>Proposed Value</Text>
                {/* @ts-ignore */}
                <Edit2 size={13} color={colors.textMuted} />
              </View>
              {editError && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {/* @ts-ignore */}
                  <AlertCircle size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 11, fontFamily: 'Inter-Regular' }}>{editError}</Text>
                </View>
              )}
              <TextInput
                style={[styles.jsonEditor, { backgroundColor: colors.background, color: colors.primary, borderColor: editError ? colors.danger : colors.border }]}
                multiline
                value={editedValue}
                onChangeText={t => { setEditedValue(t); setEditError(null); }}
                autoCorrect={false}
                autoCapitalize="none"
              />

              <Text style={[styles.detailLabel, { color: colors.textPrimary, marginTop: 16, marginBottom: 8 }]}>Notes</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                placeholder="Review notes..."
                placeholderTextColor={colors.textMuted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
              />

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: 'rgba(16,185,129,0.1)' }]}
                  onPress={() => handleUpdateSingle(selectedCandidate, 'APPROVED')}
                >
                  <Text style={[styles.detailBtnText, { color: colors.success }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                  onPress={() => handleUpdateSingle(selectedCandidate, 'REJECTED')}
                >
                  <Text style={[styles.detailBtnText, { color: colors.danger }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter-Medium', fontSize: 14 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
    flexWrap: 'wrap', gap: 8,
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolbarCount: { fontFamily: 'Inter-Medium', fontSize: 13 },
  toolbarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  toolbarBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 260,
  },
  filterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  filterChipText: { fontFamily: 'Inter-Medium', fontSize: 12 },
  checkboxOuter: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, flexDirection: Platform.OS === 'web' ? 'row' : 'column' },
  list: { flex: 1 },
  group: { marginBottom: 4 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  groupLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, flex: 1 },
  groupBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  groupBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    marginRight: 10, maxWidth: 110,
  },
  cardTagText: { fontFamily: 'Inter-Medium', fontSize: 11 },
  ruleInfo: { flex: 1, marginRight: 8 },
  ruleId: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  ruleType: { fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 2 },
  diff: { marginRight: 12, minWidth: 110 },
  diffRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  diffCurrent: { fontFamily: 'Inter-Regular', fontSize: 12, textDecorationLine: 'line-through' },
  diffProposed: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  deltaBadge: { fontSize: 11, fontFamily: 'Inter-Bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  confBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginRight: 10 },
  confText: { fontFamily: 'Inter-Bold', fontSize: 11 },
  quickActions: { flexDirection: 'row', gap: 6 },
  quickBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
  // Detail Panel
  detailPanel: {
    width: Platform.OS === 'web' ? 340 : '100%',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    padding: 20,
  },
  detailTitle: { fontFamily: 'Inter-Bold', fontSize: 15, flex: 1 },
  detailCard: { fontFamily: 'Inter-Medium', fontSize: 12, marginBottom: 16 },
  citationBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  citationText: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  citationPage: { fontFamily: 'Inter-Medium', fontSize: 11, marginTop: 8 },
  detailLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  jsonEditor: {
    borderWidth: 1, borderRadius: 8, padding: 10,
    fontFamily: 'Inter-Medium', fontSize: 12, height: 130,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  notesInput: {
    borderWidth: 1, borderRadius: 8, padding: 10,
    fontFamily: 'Inter-Regular', fontSize: 13, height: 70,
    textAlignVertical: 'top',
  },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  detailBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  detailBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
});
