import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { ArrowLeft, CreditCard, Network, IndianRupee, ShieldAlert, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { useCardRules } from '@/features/cards/hooks/useCardRules';

export default function MasterCatalogScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { data: catalog, isLoading } = useCardCatalog();

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Master Card Catalog</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerBox}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This view displays the global catalog of credit cards populated by the Card Intelligence (RAG) pipeline.
            Changes approved in the Review Queue will automatically update these values.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : catalog?.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards found in the master catalog.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {catalog?.map((card) => (
              <CatalogCard key={card.id} card={card} colors={colors} formatCurrency={formatCurrency} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


function CatalogCard({ card, colors, formatCurrency }: { card: any, colors: any, formatCurrency: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rules, isLoading: rulesLoading } = useCardRules(expanded ? card.id : undefined);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
          {/* @ts-ignore */}
          <CreditCard size={20} color={colors.primary} />
        </View>
        <View style={styles.cardHeaderTexts}>
          <Text style={[styles.bankName, { color: colors.textSecondary }]}>{card.bank_name}</Text>
          <Text style={[styles.cardName, { color: colors.textPrimary }]}>{card.card_name}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <View style={styles.detailIconRow}>
            {/* @ts-ignore */}
            <Network size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Network</Text>
          </View>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{card.network || 'Not specified'}</Text>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconRow}>
            {/* @ts-ignore */}
            <IndianRupee size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Joining Fee</Text>
          </View>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrency(card.joining_fee)}</Text>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconRow}>
            {/* @ts-ignore */}
            <IndianRupee size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Annual Fee</Text>
          </View>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrency(card.annual_fee)}</Text>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconRow}>
            {/* @ts-ignore */}
            <ShieldAlert size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Fee Waiver Target</Text>
          </View>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {card.fee_waiver_spend_threshold ? formatCurrency(card.fee_waiver_spend_threshold) : 'None'}
          </Text>
        </View>
      </View>

      <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
        {card.is_active ? (
          <>
            {/* @ts-ignore */}
            <CheckCircle size={14} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>Active in Catalog</Text>
          </>
        ) : (
          <>
            {/* @ts-ignore */}
            <ShieldAlert size={14} color={colors.textMuted} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Inactive</Text>
          </>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
            {expanded ? 'Hide Rules' : 'Show Rules'}
          </Text>
          {/* @ts-ignore */}
          {expanded ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={[styles.rulesContainer, { borderTopColor: colors.border }]}>
          {rulesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
          ) : rules?.length === 0 ? (
            <Text style={[styles.emptyRules, { color: colors.textMuted }]}>No rules or milestones extracted yet.</Text>
          ) : (
            rules?.map((rule, idx) => (
              <View key={rule.id || idx} style={[styles.ruleItem, { borderBottomColor: idx === rules.length - 1 ? 'transparent' : colors.border }]}>
                <View style={styles.ruleHeader}>
                  <View style={[styles.ruleBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.ruleBadgeText, { color: colors.primary }]}>{rule.rule_type.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.ruleName, { color: colors.textPrimary }]}>{rule.rule_name}</Text>
                </View>
                <Text style={[styles.ruleConfig, { color: colors.textSecondary }]}>
                  {JSON.stringify(rule.rule_config, null, 2)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        marginTop: 0,
      },
    }),
  },
  backBtn: {
    marginRight: tokens.spacing.md,
    padding: tokens.spacing.xs,
  },
  headerTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing['3xl'],
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  headerBox: {
    marginBottom: tokens.spacing.xl,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.lg,
  },
  card: {
    width: Platform.OS === 'web' ? ('32%' as any) : '100%',
    minWidth: 300,
    borderWidth: 1,
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTexts: {
    flex: 1,
  },
  bankName: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  detailsGrid: {
    padding: tokens.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.lg,
  },
  detailItem: {
    width: '45%',
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
  },
  rulesContainer: {
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  emptyRules: {
    padding: tokens.spacing.lg,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ruleItem: {
    padding: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  ruleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.xs,
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  ruleConfig: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
});
