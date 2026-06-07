import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { ArrowLeft, MessageSquareWarning, ChevronDown, ChevronUp } from 'lucide-react-native';
import { feedbackApi, FeedbackResponse } from '@/features/feedback/api';
import { formatCurrencyIN } from '@/utils/currency';

export default function AdminFeedbackScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const res = await feedbackApi.getFeedbacks(0, 100);
      setFeedbacks(res.data || []);
    } catch (e) {
      console.error('Failed to fetch feedbacks', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getIssueLabel = (type: string) => {
    switch (type) {
      case 'incorrect_reward': return 'Incorrect Reward';
      case 'missing_merchant': return 'Missing/Wrong Merchant';
      case 'wrong_card_recommendation': return 'Wrong Card Recommended';
      default: return 'Other Issue';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/profile');
          }}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Feedback Reports</Text>
      </View>

      <ScrollView style={styles.contentArea} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : feedbacks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No feedback reports found.</Text>
          </View>
        ) : (
          feedbacks.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  activeOpacity={0.7} 
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        {/* @ts-ignore */}
                        <MessageSquareWarning size={14} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.badgeText, { color: '#EF4444' }]}>{getIssueLabel(item.issue_type)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: item.status === 'open' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'open' ? '#3B82F6' : '#10B981' }]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.merchantName, { color: colors.textPrimary }]}>{item.merchant_name} • {formatCurrencyIN(item.transaction_amount)}</Text>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.expandIcon}>
                    {/* @ts-ignore */}
                    {isExpanded ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.issue_description || 'No description provided.'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Calculated Reward</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrencyIN(item.calculated_reward)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rule Version</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.rule_version}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Card ID</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }]}>{item.card_id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Calculation ID</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }]}>{item.calculation_id || 'N/A'}</Text>
                    </View>
                    
                    <View style={[styles.contextBox, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: colors.borderHighlight }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Calculation Context</Text>
                      <Text style={[styles.codeText, { color: colors.textPrimary }]}>
                        {JSON.stringify(item.calculation_context, null, 2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
    ...Platform.select({ web: { marginTop: 0 } }),
  },
  backBtn: { marginRight: tokens.spacing.md, padding: tokens.spacing.xs },
  headerTitle: { fontSize: tokens.fontSize.headline, fontWeight: '700' },
  contentArea: { flex: 1 },
  contentContainer: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing['3xl'],
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: tokens.fontSize.body, fontWeight: '500' },
  card: { borderWidth: 1, borderRadius: tokens.radius.card, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  merchantName: { fontSize: 18, fontWeight: '700' },
  dateText: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  expandIcon: { width: 40, alignItems: 'flex-end', justifyContent: 'center' },
  cardBody: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  detailLabel: { fontSize: 13, fontWeight: '600', width: 120 },
  detailValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  contextBox: { marginTop: 8, padding: 16, borderRadius: 12, borderWidth: 1 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18 },
});
