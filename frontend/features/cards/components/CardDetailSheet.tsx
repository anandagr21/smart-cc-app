import React, { useState } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { X, Sparkles, Pencil, Activity, Trash2, SlidersHorizontal, FileText, ChevronRight, Fuel, Plane, ShoppingBag, Utensils, Zap } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { UserCardResponse } from '../types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { ComingSoonSheet } from './ComingSoonSheet';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { deriveFeeWaiverProgress } from '../utils/feeWaiver';
import { EditAnnualFeeSheet } from './EditAnnualFeeSheet';
import { EditSpendSheet } from './EditSpendSheet';
import { EditFeeCycleSheet } from './EditFeeCycleSheet';
import { EditCardDetailsSheet } from './EditCardDetailsSheet';
import { formatCurrencyIN } from '@/utils/currency';

interface CardDetailSheetProps {
  card: UserCardResponse | null;
  onClose: () => void;
}

export const CardDetailSheet: React.FC<CardDetailSheetProps> = ({ card, onClose }) => {
  const router = useRouter();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const [mockActionTitle, setMockActionTitle] = useState<string | null>(null);
  const [isAnnualFeeEditVisible, setIsAnnualFeeEditVisible] = useState(false);
  const [isSpendEditVisible, setIsSpendEditVisible] = useState(false);
  const [isFeeCycleEditVisible, setIsFeeCycleEditVisible] = useState(false);
  const [isCardDetailsEditVisible, setIsCardDetailsEditVisible] = useState(false);

  const { mutate: updateCard } = useUpdateCard(card?.id || '');

  // Log breadcrumb if card has fee waiver logic and sheet is opened
  React.useEffect(() => {
    if (card && card.effective_fee_waiver_threshold && card.effective_fee_waiver_threshold > 0) {
      Sentry.addBreadcrumb({
        category: 'business',
        message: 'Fee Waiver Viewed',
        data: {
          cardId: card.id,
          waiverTarget: card.effective_fee_waiver_threshold,
        },
      });
    }
  }, [card?.id]);

  if (!card) return null;

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  const network = card.network_override || card.card_details?.network || 'VISA';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' ? '' : network.toUpperCase();
  const isActive = card.card_status === 'ACTIVE';

  const gradient = getNetworkGradient(network, isDark) as [string, string];

  // Logic: Fee Waiver
  const hasWaiver = card.effective_fee_waiver_threshold != null && card.effective_fee_waiver_threshold > 0;
  const waiverPercent = card.fee_waiver_progress_percent || 0;
  const remainingSpend = card.remaining_spend_for_waiver || 0;
  const waiverTarget = card.effective_fee_waiver_threshold || 0;
  const waiverMilestone = card.waiver_achieved ? 'Waiver achieved for next year' : (
    card.comfort_state === 'SAFELY_ON_TRACK' ? 'Safely on track' :
    card.comfort_state === 'MONITOR_PROGRESS' ? 'Monitor progress' :
    card.comfort_state === 'REQUIRES_ATTENTION' ? 'Requires attention' :
    card.comfort_state === 'UNLIKELY_NATURALLY' ? 'Unlikely naturally' : 'Tracking progress'
  );

  // Logic: Intelligence Heuristics (Max 3-5)
  const intelligenceChips = [];
  const cNameLow = cardName.toLowerCase();

  // 1. Health
  if (hasWaiver && waiverPercent >= 75 && waiverPercent < 100) {
    intelligenceChips.push({ label: 'Near Fee Waiver', icon: Activity, color: colors.warning });
  } else if (card.annual_spend > 50000) {
    intelligenceChips.push({ label: 'Frequently Used', icon: Zap, color: colors.primary });
  }

  // 2. Categories
  if (cNameLow.includes('travel') || cNameLow.includes('miles') || cNameLow.includes('club')) {
    intelligenceChips.push({ label: 'Travel Optimized', icon: Plane, color: '#0EA5E9' });
  }
  if (cNameLow.includes('cashback') || cNameLow.includes('ace')) {
    intelligenceChips.push({ label: 'Cashback Rewards', icon: ShoppingBag, color: '#10B981' });
  }
  if (cNameLow.includes('fuel') || cNameLow.includes('petro')) {
    intelligenceChips.push({ label: 'Fuel Benefits', icon: Fuel, color: '#F59E0B' });
  }
  if (cNameLow.includes('dine') || cNameLow.includes('swiggy')) {
    intelligenceChips.push({ label: 'Dining Benefits', icon: Utensils, color: '#EC4899' });
  }

  // Trim to max 4 chips to prevent visual overload
  const finalChips = intelligenceChips.slice(0, 4);

  const handleToggleStatus = () => {
    updateCard({ card_status: isActive ? 'INACTIVE' : 'ACTIVE' });
  };

  const handleViewTransactions = () => {
    onClose();
    // Navigate to history and pass the cardId to auto-filter
    router.push(`/history?cardId=${card.id}`);
  };

  return (
    <Modal visible={!!card} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={95}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
              },
            ]}
          />
          {/* Top highlight */}
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Section 1: Hero Card */}
            <Animated.View entering={FadeInUp.duration(400).delay(50)}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={[styles.heroTopEdge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]} />
                <View style={styles.heroHeader}>
                  <Text style={[styles.heroBankName, { color: colors.textSecondary }]} numberOfLines={1}>{bankName}</Text>
                  <View style={[styles.statusPill, { backgroundColor: isActive ? colors.successSoft : colors.warningSoft }]}>
                    <Text style={[styles.statusText, { color: isActive ? colors.success : colors.warning }]}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.heroCardName, { color: colors.textPrimary }]} numberOfLines={1}>{cardName}</Text>
                {card.last_4_digits && (
                  <Text style={{ color: colors.textSecondary, fontSize: tokens.fontSize.body, marginTop: 4, letterSpacing: 2 }}>
                    •••• {card.last_4_digits}
                  </Text>
                )}

                <View style={styles.heroFooter}>
                  <View>
                    <Text style={[styles.heroFeeLabel, { color: colors.textMuted }]}>Annual Fee</Text>
                    <Text style={[styles.heroFeeValue, { color: colors.textPrimary }]}>
                      {card.effective_annual_fee ? formatCurrencyIN(card.effective_annual_fee) : 'Free'}
                    </Text>
                  </View>
                  {!!displayNetwork && <Text style={[styles.heroNetwork, { color: colors.textSecondary }]}>{displayNetwork}</Text>}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Section 2: Fee Waiver Progress */}
            {hasWaiver && (
              <Animated.View entering={FadeInUp.duration(400).delay(150)} style={[styles.section, styles.cardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.sectionTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginRight: 8 }]}>FEE WAIVER PROGRESS</Text>
                    {/* @ts-ignore */}
                    <Sparkles size={14} color={colors.primary} />
                  </View>
                  <TouchableOpacity onPress={() => setIsSpendEditVisible(true)} style={styles.sectionEditBtn}>
                    <Text style={[styles.sectionEditText, { color: colors.textSecondary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.waiverNumbersRow}>
                  <Text style={[styles.waiverCurrent, { color: colors.success }]}>
                    ₹{card.annual_spend.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.waiverTarget, { color: colors.textMuted }]}>
                    {' / '}₹{waiverTarget.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.waiverPercent, { color: colors.success }]}>
                    {Math.min(waiverPercent, 100).toFixed(0)}%
                  </Text>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(waiverPercent, 100)}%`, backgroundColor: colors.success }]} />
                </View>

                <View style={styles.waiverFooter}>
                  <Text style={[styles.waiverRemaining, { color: colors.textSecondary }]}>
                    {card.waiver_achieved ? 'Waiver achieved' : `₹${remainingSpend.toLocaleString('en-IN')} more to achieve fee waiver`}
                  </Text>
                  <View style={[styles.milestonePill, { backgroundColor: colors.borderHighlight }]}>
                    <Text style={[styles.milestoneText, { color: colors.textPrimary }]}>{waiverMilestone}</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Section 2.5: Annual Fee */}
            <Animated.View entering={FadeInUp.duration(400).delay(200)} style={[styles.section, styles.cardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ANNUAL FEE</Text>
                <TouchableOpacity onPress={() => setIsAnnualFeeEditVisible(true)} style={styles.sectionEditBtn}>
                  <Text style={[styles.sectionEditText, { color: colors.textSecondary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.feeIntelligenceRow}>
                <View style={styles.feeIntelligenceInfo}>
                  <Text style={[styles.feeIntelligenceValue, { color: colors.textPrimary }]}>
                    {card.effective_annual_fee ? `${formatCurrencyIN(card.effective_annual_fee)}` : 'Free'}
                  </Text>
                  <Text style={[styles.feeIntelligenceSource, { color: colors.textSecondary }]}>
                    {card.fee_confidence === 'USER_CALIBRATED' ? 'Custom fee applied' : 'Estimated from catalog'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Section 2.6: Fee Cycle */}
            <Animated.View entering={FadeInUp.duration(400).delay(210)} style={[styles.section, styles.cardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FEE CYCLE</Text>
                <TouchableOpacity onPress={() => setIsFeeCycleEditVisible(true)} style={styles.sectionEditBtn}>
                  <Text style={[styles.sectionEditText, { color: colors.textSecondary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.feeIntelligenceRow}>
                <View style={styles.feeIntelligenceInfo}>
                  <Text style={[styles.feeIntelligenceValue, { color: colors.textPrimary, fontSize: tokens.fontSize.body }]}>
                    {card.annual_fee_debit_date ? 
                      card.annual_fee_debit_date.split('-').reverse().join('/') 
                      : 'Not set'}
                  </Text>
                  <Text style={[styles.feeIntelligenceSource, { color: colors.textSecondary }]}>
                    {card.days_until_renewal !== null && card.days_until_renewal !== undefined ? `Debits in ${card.days_until_renewal} days` : 'Set a date for accurate projections'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Section 2.75: Optimization Potential */}
            <Animated.View entering={FadeInUp.duration(400).delay(225)} style={[styles.section, styles.cardBox, { backgroundColor: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: '#8B5CF6' }]}>OPTIMIZATION POTENTIAL</Text>
                {/* @ts-ignore */}
                <Sparkles size={14} color="#8B5CF6" />
              </View>
              {hasWaiver && card.explanation_text ? (
                <Text style={[styles.feeIntelligenceSource, { color: colors.textPrimary, lineHeight: 20 }]}>
                  {card.explanation_text}
                </Text>
              ) : (
                <Text style={[styles.feeIntelligenceSource, { color: colors.textPrimary, lineHeight: 20 }]}>
                  Best used for {cNameLow.includes('travel') || cNameLow.includes('miles') ? 'travel & milestone acceleration' : 'maximizing immediate cashback on daily spends'}.
                </Text>
              )}
            </Animated.View>

            {/* Section 3: Reward Intelligence */}
            {finalChips.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 16 }]}>CARD INTELLIGENCE</Text>
                <View style={styles.chipsContainer}>
                  {finalChips.map((chip, idx) => (
                    <View key={idx} style={[styles.intelligenceChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      {/* @ts-ignore */}
                      <chip.icon size={16} color={chip.color} style={{ marginBottom: 8 }} />
                      <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>{chip.label}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Section 4: Quick Actions */}
            <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 16 }]}>QUICK ACTIONS</Text>
              <View style={[styles.actionsBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>

                {/* View Transactions (Real Action) */}
                <TouchableOpacity style={styles.actionRow} onPress={handleViewTransactions}>
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.borderHighlight }]}>
                    {/* @ts-ignore */}
                    <FileText size={18} color={colors.textPrimary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>View Transactions</Text>
                  {/* @ts-ignore */}
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

                {/* Toggle Status (Real Action) */}
                <View style={styles.actionRow}>
                  <View style={styles.actionIconWrap}>
                    {/* @ts-ignore */}
                    <Activity size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.actionTextWrap}>
                    <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Card Status</Text>
                    <Text style={[styles.actionSub, { color: colors.textMuted }]}>{isActive ? 'Active in Wallet' : 'Inactive in Wallet'}</Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={handleToggleStatus}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.success }}
                  />
                </View>
                <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

                {/* Edit Card Details */}
                <TouchableOpacity style={styles.actionRow} onPress={() => setIsCardDetailsEditVisible(true)}>
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.borderHighlight }]}>
                    {/* @ts-ignore */}
                    <Pencil size={18} color={colors.textPrimary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit Card Details</Text>
                  {/* @ts-ignore */}
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

                {/* Update Spend (Real Action) */}
                <TouchableOpacity style={styles.actionRow} onPress={() => setIsSpendEditVisible(true)}>
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.borderHighlight }]}>
                    {/* @ts-ignore */}
                    <SlidersHorizontal size={18} color={colors.textPrimary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Update Annual Spend</Text>
                  {/* @ts-ignore */}
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

                {/* Remove Card (Mocked) */}
                <TouchableOpacity style={styles.actionRow} onPress={() => setMockActionTitle("Remove Card")}>
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    {/* @ts-ignore */}
                    <Trash2 size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Remove Card</Text>
                  {/* @ts-ignore */}
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>

              </View>
            </Animated.View>

            {/* Bottom Spacer for safe area */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      <ComingSoonSheet
        visible={!!mockActionTitle}
        onClose={() => setMockActionTitle(null)}
        title={mockActionTitle || "Coming Soon"}
      />

      <EditAnnualFeeSheet
        visible={isAnnualFeeEditVisible}
        onClose={() => setIsAnnualFeeEditVisible(false)}
        card={card}
      />
      <EditSpendSheet
        visible={isSpendEditVisible}
        onClose={() => setIsSpendEditVisible(false)}
        card={card}
      />
      <EditFeeCycleSheet
        visible={isFeeCycleEditVisible}
        onClose={() => setIsFeeCycleEditVisible(false)}
        card={card}
      />
      <EditCardDetailsSheet
        visible={isCardDetailsEditVisible}
        onClose={() => setIsCardDetailsEditVisible(false)}
        card={card}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '92%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerSpacer: { width: 36 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  heroCard: {
    width: '100%',
    height: 220,
    borderRadius: tokens.radius.xl,
    padding: 24,
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  heroTopEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBankName: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
  },
  heroCardName: {
    fontSize: 28,
    fontWeight: tokens.fontWeight.heavy,
    marginTop: 8,
    marginBottom: 'auto',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroFeeLabel: {
    fontSize: tokens.fontSize.micro,
    marginBottom: 2,
  },
  heroFeeValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  heroNetwork: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  cardBox: {
    padding: 20,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  waiverNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  waiverCurrent: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
  waiverTarget: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  waiverPercent: {
    marginLeft: 'auto',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  waiverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waiverRemaining: {
    fontSize: tokens.fontSize.caption,
    flex: 1,
  },
  milestonePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  milestoneText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  intelligenceChip: {
    width: '48%',
    padding: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 18,
  },
  actionsBox: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconWrap: {
    width: 36, height: 36,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  actionSub: {
    fontSize: tokens.fontSize.micro,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    marginLeft: 68,
  },
  feeIntelligenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeIntelligenceInfo: {
    flex: 1,
  },
  feeIntelligenceValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  feeIntelligenceSource: {
    fontSize: tokens.fontSize.caption,
  },
  editFeeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  editFeeBtnText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  sectionEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionEditText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.medium,
  },
});
