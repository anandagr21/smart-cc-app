import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { ArrowLeft, CreditCard, Network, IndianRupee, ShieldAlert, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useCardRules } from '@/features/cards/hooks/useCardRules';
import { useCandidates } from '@/features/card_intelligence/api/cardIntelligenceApi';
import { useUpdateCatalogCard } from '@/features/cards/hooks/useUpdateCatalogCard';
import { Check, Lightbulb } from 'lucide-react-native';
import { CardSidebar } from '@/features/card_intelligence/components/CardSidebar';
import { formatCurrencyIN } from '@/utils/currency';

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Master Card Catalog</Text>
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
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Select a card from the sidebar to view catalog details.</Text>
            </View>
          ) : (
            <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.contentContainer}>
              <CatalogCard 
                key={`${selectedCardId}-${catalog?.find(c => c.id === selectedCardId)?.updated_at}`}
                card={catalog?.find(c => c.id === selectedCardId)} 
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


function CatalogCard({ card, colors, formatCurrency }: { card: any, colors: any, formatCurrency: any }) {
  // Always expanded in the right pane view
  const expanded = true;
  
  // State for form
  const [joiningFee, setJoiningFee] = useState(card?.joining_fee?.toString() || '0');
  const [annualFee, setAnnualFee] = useState(card?.annual_fee?.toString() || '0');
  const [waiverTarget, setWaiverTarget] = useState(card?.fee_waiver_spend_threshold?.toString() || '');

  // Sync state if card updates in place
  useEffect(() => {
    setJoiningFee(card?.joining_fee?.toString() || '0');
    setAnnualFee(card?.annual_fee?.toString() || '0');
    setWaiverTarget(card?.fee_waiver_spend_threshold?.toString() || '');
  }, [card?.joining_fee, card?.annual_fee, card?.fee_waiver_spend_threshold]);

  // Fetch candidates and update mutation
  const { data: candidates, isLoading: candidatesLoading } = useCandidates(expanded ? card?.id : null);
  const updateMutation = useUpdateCatalogCard();

  const handleSave = () => {
    updateMutation.mutate({
      cardId: card.id,
      data: {
        joining_fee: parseFloat(joiningFee) || 0,
        annual_fee: parseFloat(annualFee) || 0,
        fee_waiver_spend_threshold: waiverTarget ? parseFloat(waiverTarget) : null,
      }
    });
  };

  const getCandidateHint = (fieldName: string) => {
    if (!candidates) return null;
    const candidate = candidates.find(c => c.field_name === fieldName);
    if (!candidate) return null;
    const val = candidate.proposed_value?.value;
    return val !== undefined ? formatCurrency(val) : null;
  };

  const joiningHint = getCandidateHint('joining_fee');
  const annualHint = getCandidateHint('annual_fee');
  const waiverHint = getCandidateHint('fee_waiver_spend_threshold');

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
      </View>

      {expanded && (
        <View style={[styles.rulesContainer, { borderTopColor: colors.border, padding: 16 }]}>
          <Text style={[styles.ruleName, { color: colors.textPrimary, marginBottom: 16 }]}>Edit Fee & Waiver Targets</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Joining Fee (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              value={joiningFee}
              onChangeText={setJoiningFee}
              keyboardType="numeric"
            />
            {joiningHint && (
              <View style={styles.hintRow}>
                {/* @ts-ignore */}
                <Lightbulb size={12} color="#F59E0B" />
                <Text style={styles.hintText}>AI Suggestion: {joiningHint}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Annual Fee (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              value={annualFee}
              onChangeText={setAnnualFee}
              keyboardType="numeric"
            />
            {annualHint && (
              <View style={styles.hintRow}>
                {/* @ts-ignore */}
                <Lightbulb size={12} color="#F59E0B" />
                <Text style={styles.hintText}>AI Suggestion: {annualHint}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fee Waiver Target (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              value={waiverTarget}
              onChangeText={setWaiverTarget}
              keyboardType="numeric"
              placeholder="E.g., 100000"
              placeholderTextColor={colors.textMuted}
            />
            {waiverHint && (
              <View style={styles.hintRow}>
                {/* @ts-ignore */}
                <Lightbulb size={12} color="#F59E0B" />
                <Text style={styles.hintText}>AI Suggestion: {waiverHint}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { opacity: updateMutation.isPending ? 0.7 : 1 }]} 
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {/* @ts-ignore */}
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                {/* @ts-ignore */}
                <Check size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
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
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  contentArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  detailsScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing['3xl'],
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
  },
  card: {
    width: '100%',
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
    fontSize: tokens.fontSize.body,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: tokens.fontSize.body,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: tokens.radius.md,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  }
});
