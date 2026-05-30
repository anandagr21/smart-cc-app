import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import {
  Shield,
  Zap,
  Gift,
  XCircle,
  TrendingUp,
  Info,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart2,
  Tag,
  Database,
} from 'lucide-react-native';
import { useCardRewardRules, useDeleteRewardRule, useUpdateRewardRule } from '../api/rewardRulesApi';
import { useKnowledgeSources } from '../api/cardIntelligenceApi';
import { RewardRuleResponse } from '../types/rules';
import { formatCurrencyIN } from '@/utils/currency';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RULE_TYPE_META: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  cashback:       { label: 'Cashback',       color: '#10b981', icon: TrendingUp },
  reward_points:  { label: 'Points',         color: '#6366f1', icon: Zap },
  merchant_bonus: { label: 'Merchant Bonus', color: '#f59e0b', icon: Tag },
  category_bonus: { label: 'Category Bonus', color: '#3b82f6', icon: BarChart2 },
  generic_reward: { label: 'Reward',         color: '#8b5cf6', icon: Gift },
  milestone:      { label: 'Milestone',      color: '#ec4899', icon: TrendingUp },
  exclusion:      { label: 'Exclusion',      color: '#ef4444', icon: XCircle },
  benefit:        { label: 'Benefit',        color: '#06b6d4', icon: Gift },
  surcharge_waiver: { label: 'Waiver',       color: '#84cc16', icon: Shield },
  cap:            { label: 'Cap',            color: '#f97316', icon: Shield },
};

function getRuleTypeMeta(type: string) {
  return RULE_TYPE_META[type] || { label: type, color: '#64748b', icon: Info };
}

function formatRate(config: Record<string, any>): string {
  const rate = config.reward_rate ?? config.rate;
  if (rate !== undefined && rate !== null) {
    return `${(Number(rate) * 100).toFixed(1)}%`;
  }
  return '—';
}

function formatCap(config: Record<string, any>): string {
  const cap = config.max_reward ?? config.cap;
  if (cap !== undefined && cap !== null) {
    return `₹${cap}`;
  }
  return 'No cap';
}

function getConfigSummary(config: Record<string, any>): string[] {
  const lines: string[] = [];
  if (config.reward_type) lines.push(`Type: ${config.reward_type}`);
  if (config.category) lines.push(`Category: ${config.category}`);
  if (config.merchant) lines.push(`Merchant: ${config.merchant}`);
  const rate = config.reward_rate ?? config.rate;
  if (rate !== undefined && rate !== null) lines.push(`Rate: ${(Number(rate) * 100).toFixed(2)}%`);
  const cap = config.max_reward ?? config.cap;
  if (cap !== undefined && cap !== null) lines.push(`Cap: ₹${cap}`);
  if (config.description) lines.push(`Info: ${config.description}`);
  if (config.uses_per_year) lines.push(`Uses/yr: ${config.uses_per_year}`);
  if (config.min_spend) lines.push(`Min spend: ₹${config.min_spend}`);
  return lines;
}

// ---------------------------------------------------------------------------
// Rule Card Component
// ---------------------------------------------------------------------------

interface RuleCardProps {
  rule: RewardRuleResponse;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  colors: any;
}

function RuleCard({ rule, onDelete, onToggleActive, colors }: RuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = getRuleTypeMeta(rule.rule_type);
  const Icon = meta.icon;
  const configLines = getConfigSummary(rule.rule_config);

  return (
    <View style={[styles.ruleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <TouchableOpacity
        style={styles.ruleCardHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={[styles.ruleTypeBadge, { backgroundColor: meta.color + '22' }]}>
          <Icon size={14} color={meta.color} />
          <Text style={[styles.ruleTypeBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        <View style={styles.ruleTitleRow}>
          <Text
            style={[styles.ruleName, { color: colors.textPrimary }]}
            numberOfLines={expanded ? undefined : 1}
          >
            {rule.rule_name.replace(/_/g, ' ')}
          </Text>

          {/* Rate chip */}
          {(rule.rule_config.reward_rate !== undefined || rule.rule_config.rate !== undefined) && (
            <View style={[styles.rateChip, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.rateChipText, { color: meta.color }]}>{formatRate(rule.rule_config)}</Text>
            </View>
          )}
        </View>

        <View style={styles.ruleCardActions}>
          <Switch
            value={rule.is_active}
            onValueChange={() => onToggleActive(rule.id, rule.is_active)}
            trackColor={{ false: colors.border, true: meta.color + '66' }}
            thumbColor={rule.is_active ? meta.color : colors.textSecondary}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          <TouchableOpacity
            onPress={() => onDelete(rule.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={15} color={colors.textSecondary} />
          </TouchableOpacity>
          {expanded ? (
            <ChevronUp size={15} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={15} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded config */}
      {expanded && (
        <View style={[styles.ruleExpandedBody, { borderTopColor: colors.border }]}>
          {configLines.length > 0 ? (
            <View style={styles.configGrid}>
              {configLines.map((line, idx) => (
                <View key={idx} style={[styles.configChip, { backgroundColor: colors.background }]}>
                  <Text style={[styles.configChipText, { color: colors.textSecondary }]}>{line}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyConfigText, { color: colors.textSecondary }]}>No additional config</Text>
          )}
          <Text style={[styles.ruleMetaText, { color: colors.textSecondary }]}>
            Priority: {rule.priority}  •  {rule.is_active ? 'Active' : 'Inactive'}
          </Text>
          {rule.updated_at && (
            <Text style={[styles.ruleMetaText, { color: colors.textSecondary }]}>
              Last updated: {new Date(rule.updated_at).toLocaleDateString('en-IN')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

interface Props {
  cardId: string;
  cardName: string;
  bankName: string;
}

const TABS = ['Rules', 'Sources', 'Stats'] as const;
type Tab = typeof TABS[number];

const FILTER_TYPES = ['All', 'cashback', 'reward_points', 'category_bonus', 'merchant_bonus', 'benefit', 'exclusion', 'milestone'] as const;

export function CardIntelligenceDetailView({ cardId, cardName, bankName }: Props) {
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<Tab>('Rules');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [showInactive, setShowInactive] = useState(true);

  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useCardRewardRules(cardId);
  const { data: sources = [], isLoading: sourcesLoading, refetch: refetchSources } = useKnowledgeSources(cardId);
  const deleteRule = useDeleteRewardRule(cardId);
  const updateRule = useUpdateRewardRule(cardId);

  // --- Stats derived from rules ---
  const stats = useMemo(() => {
    const cashbackRules = rules.filter(r => r.rule_type === 'cashback' || r.rule_type === 'generic_reward');
    const exclusions = rules.filter(r => r.rule_type === 'exclusion');
    const benefits = rules.filter(r => r.rule_type === 'benefit');
    const rates = cashbackRules.map(r => Number(r.rule_config.reward_rate ?? r.rule_config.rate ?? 0)).filter(n => n > 0);
    const maxRate = rates.length > 0 ? Math.max(...rates) : 0;
    return { total: rules.length, cashback: cashbackRules.length, exclusions: exclusions.length, benefits: benefits.length, maxRate };
  }, [rules]);

  // --- Filtered rules ---
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchSearch = !search || r.rule_name.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'All' || r.rule_type === filterType;
      const matchActive = showInactive || r.is_active;
      return matchSearch && matchType && matchActive;
    });
  }, [rules, search, filterType, showInactive]);

  const handleDeleteRule = (ruleId: string) => {
    Alert.alert('Delete Rule', 'Are you sure you want to permanently delete this reward rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRule.mutate(ruleId),
      },
    ]);
  };

  const handleToggleActive = (ruleId: string, current: boolean) => {
    updateRule.mutate({ ruleId, payload: { is_active: !current } });
  };

  const isRefreshing = rulesLoading || sourcesLoading;

  const onRefresh = () => {
    refetchRules();
    refetchSources();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats Banner */}
      <View style={[styles.statsBanner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <StatPill label="Total Rules" value={String(stats.total)} color="#6366f1" />
        <StatPill label="Cashback Rules" value={String(stats.cashback)} color="#10b981" />
        <StatPill label="Max Rate" value={stats.maxRate > 0 ? `${(stats.maxRate * 100).toFixed(0)}%` : '—'} color="#f59e0b" />
        <StatPill label="Exclusions" value={String(stats.exclusions)} color="#ef4444" />
        <StatPill label="Benefits" value={String(stats.benefits)} color="#06b6d4" />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ---- RULES TAB ---- */}
        {activeTab === 'Rules' && (
          <>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search size={14} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search rules..."
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={styles.showInactiveRow}>
                <Text style={[styles.showInactiveLabel, { color: colors.textSecondary }]}>Inactive</Text>
                <Switch
                  value={showInactive}
                  onValueChange={setShowInactive}
                  trackColor={{ false: colors.border, true: colors.primary + '88' }}
                  thumbColor={showInactive ? colors.primary : colors.textSecondary}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>

            {/* Type filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {FILTER_TYPES.map(type => {
                const meta = type === 'All' ? { color: colors.primary } : getRuleTypeMeta(type);
                const active = filterType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterPill,
                      { borderColor: meta.color, backgroundColor: active ? meta.color : 'transparent' },
                    ]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.filterPillText, { color: active ? '#fff' : meta.color }]}>
                      {type === 'All' ? 'All' : RULE_TYPE_META[type]?.label ?? type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Rule count */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''} shown
            </Text>

            {rulesLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : filteredRules.length === 0 ? (
              <EmptyState
                icon={<Database size={32} color={colors.textSecondary} />}
                title="No rules found"
                subtitle={rules.length === 0 ? 'Process a knowledge source to extract rules' : 'Try changing your filter'}
                colors={colors}
              />
            ) : (
              <View style={styles.ruleList}>
                {filteredRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onDelete={handleDeleteRule}
                    onToggleActive={handleToggleActive}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ---- SOURCES TAB ---- */}
        {activeTab === 'Sources' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {sources.length} knowledge source{sources.length !== 1 ? 's' : ''}
            </Text>
            {sourcesLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : sources.length === 0 ? (
              <EmptyState
                icon={<Info size={32} color={colors.textSecondary} />}
                title="No sources yet"
                subtitle="Upload a PDF or URL in the RAG pipeline to get started"
                colors={colors}
              />
            ) : (
              <View style={styles.ruleList}>
                {sources.map(source => (
                  <SourceCard key={source.id} source={source} colors={colors} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ---- STATS TAB ---- */}
        {activeTab === 'Stats' && (
          <StatsView rules={rules} colors={colors} />
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '33', backgroundColor: color + '11' }]}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function SourceCard({ source, colors }: { source: any; colors: any }) {
  const statusColor: Record<string, string> = {
    COMPLETED: '#10b981',
    PROCESSING: '#f59e0b',
    QUEUED: '#6366f1',
    FAILED: '#ef4444',
    UPLOADED: '#64748b',
  };
  const color = statusColor[source.processing_status] || '#64748b';

  return (
    <View style={[styles.ruleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sourceCardInner}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ruleName, { color: colors.textPrimary }]}>{source.source_title || source.file_name || 'Untitled'}</Text>
          <Text style={[styles.ruleMetaText, { color: colors.textSecondary }]}>
            {source.source_type} • {source.source_url ? 'URL' : 'File'}
          </Text>
          {source.source_url && (
            <Text style={[styles.sourceUrl, { color: colors.primary }]} numberOfLines={1}>
              {source.source_url}
            </Text>
          )}
          {source.processing_error && (
            <Text style={[styles.sourceError, { color: '#ef4444' }]} numberOfLines={2}>
              ⚠ {source.processing_error}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.statusBadgeText, { color }]}>{source.processing_status}</Text>
        </View>
      </View>
    </View>
  );
}

function StatsView({ rules, colors }: { rules: RewardRuleResponse[]; colors: any }) {
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    rules.forEach(r => { map[r.rule_type] = (map[r.rule_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rules]);

  const cashbackRules = rules.filter(r =>
    (r.rule_type === 'cashback' || r.rule_type === 'generic_reward') &&
    (r.rule_config.reward_rate !== undefined || r.rule_config.rate !== undefined)
  );
  const maxRate = cashbackRules.length > 0
    ? Math.max(...cashbackRules.map(r => Number(r.rule_config.reward_rate ?? r.rule_config.rate ?? 0)))
    : 0;

  return (
    <View style={styles.statsView}>
      <SectionHeader title="Rules by Type" colors={colors} />
      {byType.map(([type, count]) => {
        const meta = getRuleTypeMeta(type);
        const pct = rules.length > 0 ? count / rules.length : 0;
        return (
          <View key={type} style={styles.statBarRow}>
            <Text style={[styles.statBarLabel, { color: colors.textSecondary }]}>{meta.label}</Text>
            <View style={[styles.statBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.statBarFill, { width: `${pct * 100}%`, backgroundColor: meta.color }]} />
            </View>
            <Text style={[styles.statBarCount, { color: colors.textPrimary }]}>{count}</Text>
          </View>
        );
      })}

      <SectionHeader title="Cashback Summary" colors={colors} />
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SummaryRow label="Cashback rules" value={String(cashbackRules.length)} colors={colors} />
        <SummaryRow label="Highest rate" value={maxRate > 0 ? `${(maxRate * 100).toFixed(1)}%` : '—'} colors={colors} />
        <SummaryRow label="Active rules" value={String(rules.filter(r => r.is_active).length)} colors={colors} />
        <SummaryRow label="Inactive rules" value={String(rules.filter(r => !r.is_active).length)} colors={colors} />
      </View>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>{title}</Text>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, title, subtitle, colors }: { icon: React.ReactNode; title: string; subtitle: string; colors: any }) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Stats banner
  statsBanner: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 64,
  },
  statPillValue: { fontSize: 16, fontWeight: '700' },
  statPillLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabBtnActive: {},
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
  },

  // Content
  scrollContent: { paddingBottom: 32 },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  showInactiveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  showInactiveLabel: { fontSize: 11 },

  // Filter row
  filterRow: { marginTop: 8, marginBottom: 4 },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '500' },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Rule list
  ruleList: { paddingHorizontal: 16, gap: 8 },

  // Rule card
  ruleCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ruleCardHeader: {
    padding: 12,
    gap: 6,
  },
  ruleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  ruleTypeBadgeText: { fontSize: 11, fontWeight: '600' },
  ruleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ruleName: { flex: 1, fontSize: 13, fontWeight: '600' },
  rateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rateChipText: { fontSize: 12, fontWeight: '700' },
  ruleCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  deleteBtn: { padding: 2 },

  // Expanded body
  ruleExpandedBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  configChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  configChipText: { fontSize: 11 },
  emptyConfigText: { fontSize: 12 },
  ruleMetaText: { fontSize: 11, marginTop: 4 },

  // Source card
  sourceCardInner: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  sourceUrl: { fontSize: 11, marginTop: 3 },
  sourceError: { fontSize: 11, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  // Stats view
  statsView: { padding: 16, gap: 4 },
  sectionHeader: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statBarLabel: { width: 110, fontSize: 12 },
  statBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 3 },
  statBarCount: { fontSize: 12, fontWeight: '600', width: 28, textAlign: 'right' },
  summaryCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptyStateSubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
