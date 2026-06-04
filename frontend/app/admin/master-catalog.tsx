import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { ArrowLeft, CreditCard, Network, IndianRupee, ShieldAlert, CheckCircle, Check, ListChecks } from 'lucide-react-native';
import { useUpdateCatalogCard } from '@/features/cards/hooks/useUpdateCatalogCard';
import { CardSidebar } from '@/features/card_intelligence/components/CardSidebar';
import { formatCurrencyIN } from '@/utils/currency';
import { CardCatalogResponse } from '@/features/cards/types/api';

export default function MasterCatalogScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { data: catalog, isLoading } = useCardCatalog();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return formatCurrencyIN(num);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/admin/card-intelligence');
            }
          }}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Portfolio Viewer</Text>
      </View>

      <View style={styles.main}>
        <CardSidebar
          catalog={catalog || []}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <View style={styles.contentArea}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : !selectedCardId ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Select a card from the sidebar to view production rules.</Text>
            </View>
          ) : (
            <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.contentContainer}>
              <CatalogCard 
                key={`${selectedCardId}-${catalog?.find(c => c.id === selectedCardId)?.updated_at}`}
                card={catalog?.find(c => c.id === selectedCardId) as CardCatalogResponse} 
                colors={colors} 
                formatCurrency={formatCurrency} 
              />
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function CatalogCard({ card, colors, formatCurrency }: { card: CardCatalogResponse, colors: any, formatCurrency: any }) {
  const [joiningFee, setJoiningFee] = useState(card?.joining_fee?.toString() || '0');
  const [annualFee, setAnnualFee] = useState(card?.annual_fee?.toString() || '0');
  const [waiverTarget, setWaiverTarget] = useState(card?.fee_waiver_spend_threshold?.toString() || '');
  const [isEditingFees, setIsEditingFees] = useState(false);

  useEffect(() => {
    setJoiningFee(card?.joining_fee?.toString() || '0');
    setAnnualFee(card?.annual_fee?.toString() || '0');
    setWaiverTarget(card?.fee_waiver_spend_threshold?.toString() || '');
  }, [card?.joining_fee, card?.annual_fee, card?.fee_waiver_spend_threshold]);

  const updateMutation = useUpdateCatalogCard();

  const handleSave = () => {
    updateMutation.mutate({
      cardId: card.id,
      data: {
        joining_fee: parseFloat(joiningFee) || 0,
        annual_fee: parseFloat(annualFee) || 0,
        fee_waiver_spend_threshold: waiverTarget ? parseFloat(waiverTarget) : null,
      }
    }, {
      onSuccess: () => setIsEditingFees(false)
    });
  };

  const renderRewardRules = () => {
    let rules = card.reward_rules_json;
    if (rules && !Array.isArray(rules)) {
      if (rules.rules) rules = rules.rules;
      else if (rules.reward_rules) rules = rules.reward_rules;
      else rules = [];
    }

    if (!rules || rules.length === 0) {
      return (
        <View style={styles.emptyRulesBox}>
          <Text style={[styles.emptyRulesText, { color: colors.textMuted }]}>No reward rules found in the catalog.</Text>
        </View>
      );
    }

    return rules.map((rule: any, idx: number) => (
      <View key={idx} style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.ruleHeader}>
          <Text style={[styles.ruleCategory, { color: colors.textPrimary }]}>{rule.category_name}</Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Text style={[styles.badgeText, { color: '#10B981' }]}>{rule.multiplier}x {rule.reward_type}</Text>
          </View>
        </View>
        
        {rule.has_cap && (
          <View style={styles.ruleRow}>
            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Cap limit:</Text>
            <Text style={[styles.ruleValue, { color: colors.textPrimary }]}>
              {rule.cap_limit} points/{rule.cap_cycle}
            </Text>
          </View>
        )}
        
        {rule.merchant_exclusions && rule.merchant_exclusions.length > 0 && (
          <View style={styles.ruleRow}>
            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Exclusions:</Text>
            <Text style={[styles.ruleValue, { color: colors.textPrimary }]}>
              {rule.merchant_exclusions.join(", ")}
            </Text>
          </View>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.wrapper}>
      {/* Overview Card */}
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
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Base Value</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>₹{Number(card.base_point_value).toFixed(2)} / pt</Text>
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
        </View>
      </View>

      {/* Fees Section */}
      <View style={[styles.section, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fee Structure</Text>
          <TouchableOpacity onPress={() => setIsEditingFees(!isEditingFees)} style={styles.editBtn}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              {isEditingFees ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isEditingFees ? (
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Joining Fee</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, marginLeft: 0, marginTop: 4 }]}>{formatCurrency(card.joining_fee)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Annual Fee</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, marginLeft: 0, marginTop: 4 }]}>{formatCurrency(card.annual_fee)}</Text>
            </View>
            <View style={[styles.detailItem, { width: '100%' }]}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Fee Waiver Target</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, marginLeft: 0, marginTop: 4 }]}>
                {card.fee_waiver_spend_threshold ? formatCurrency(card.fee_waiver_spend_threshold) : 'No waiver target'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Joining Fee (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={joiningFee}
                onChangeText={setJoiningFee}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Annual Fee (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={annualFee}
                onChangeText={setAnnualFee}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fee Waiver Target (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={waiverTarget}
                onChangeText={setWaiverTarget}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity 
              style={[styles.saveBtn, { opacity: updateMutation.isPending ? 0.7 : 1 }]} 
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  {/* @ts-ignore */}
                  <Check size={16} color="#FFF" />
                  <Text style={styles.saveBtnText}>Save Fee Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rules Section */}
      <View style={[styles.section, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          {/* @ts-ignore */}
          <ListChecks size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, marginLeft: 8 }]}>Structured Reward Rules</Text>
        </View>
        <View style={{ padding: 16, paddingTop: 0 }}>
          {renderRewardRules()}
        </View>
      </View>
    </View>
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
  main: { flex: 1, flexDirection: 'row' },
  contentArea: { flex: 1, backgroundColor: 'transparent' },
  detailsScroll: { flex: 1 },
  contentContainer: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing['3xl'],
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: tokens.fontSize.body },
  wrapper: { gap: 24 },
  card: { borderWidth: 1, borderRadius: tokens.radius.card, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: tokens.spacing.lg, gap: tokens.spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: tokens.radius.lg, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTexts: { flex: 1 },
  bankName: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardName: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1, width: '100%' },
  detailsGrid: { padding: tokens.spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.lg },
  detailItem: { width: '45%' },
  detailIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailLabel: { fontSize: 12, fontWeight: '500' },
  detailValue: { fontSize: 15, fontWeight: '600', marginLeft: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: tokens.spacing.md, paddingHorizontal: tokens.spacing.lg, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  statusText: { fontSize: 13, fontWeight: '600' },
  section: { borderWidth: 1, borderRadius: tokens.radius.card, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: tokens.fontSize.body },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: tokens.radius.md, paddingVertical: 12, marginTop: 8, gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyRulesBox: { padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, marginTop: 16 },
  emptyRulesText: { fontSize: 14, fontWeight: '500' },
  ruleCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 16 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ruleCategory: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  ruleRow: { flexDirection: 'row', marginTop: 8, alignItems: 'flex-start' },
  ruleLabel: { fontSize: 13, width: 80, fontWeight: '500' },
  ruleValue: { fontSize: 13, flex: 1, fontWeight: '500' }
});
