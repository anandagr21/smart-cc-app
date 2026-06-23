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
  Platform,
  Alert,
} from 'react-native';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/features/auth/store/authStore';

import { UserCardResponse } from '../types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { getNetworkGradient } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { ComingSoonSheet } from './ComingSoonSheet';
import { useUpdateCard } from '../hooks/useUpdateCard';
import { EditAnnualFeeSheet } from './EditAnnualFeeSheet';
import { EditSpendSheet } from './EditSpendSheet';
import { EditFeeCycleSheet } from './EditFeeCycleSheet';
import { EditCardDetailsSheet } from './EditCardDetailsSheet';
import { formatCurrencyIN } from '@/utils/currency';
import { DynamicIcon } from '@/components/DynamicIcon';

interface CardDetailSheetProps {
  card: UserCardResponse | null;
  onClose: () => void;
}

export const CardDetailSheet: React.FC<CardDetailSheetProps> = ({ card, onClose }) => {
  const router = useRouter();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const user = useAuthStore((state) => state.user);
  const isPremium = user?.is_premium;

  const [mockActionTitle, setMockActionTitle] = useState<string | null>(null);
  const [isAnnualFeeEditVisible, setIsAnnualFeeEditVisible] = useState(false);
  const [isSpendEditVisible, setIsSpendEditVisible] = useState(false);
  const [isFeeCycleEditVisible, setIsFeeCycleEditVisible] = useState(false);
  const [isCardDetailsEditVisible, setIsCardDetailsEditVisible] = useState(false);

  // Local state for instant toggle feedback
  const [localIsActive, setLocalIsActive] = useState<boolean | null>(null);

  const { mutate: updateCard } = useUpdateCard(card?.id || '');

  React.useEffect(() => {
    if (card) {
      setLocalIsActive(card.card_status === 'ACTIVE');
    }
  }, [card?.card_status]);

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
  const isActive = localIsActive !== null ? localIsActive : card.card_status === 'ACTIVE';

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

  if (hasWaiver && waiverPercent >= 75 && waiverPercent < 100) {
    intelligenceChips.push({ label: 'Near Fee Waiver', icon: 'Activity', color: colors.warning });
  } else if (card.annual_spend > 50000) {
    intelligenceChips.push({ label: 'Frequently Used', icon: 'Zap', color: colors.primary });
  }

  if (cNameLow.includes('travel') || cNameLow.includes('miles') || cNameLow.includes('club')) {
    intelligenceChips.push({ label: 'Travel Optimized', icon: 'Plane', color: '#0EA5E9' });
  }
  if (cNameLow.includes('cashback') || cNameLow.includes('ace')) {
    intelligenceChips.push({ label: 'Cashback Rewards', icon: 'ShoppingBag', color: '#10B981' });
  }
  if (cNameLow.includes('fuel') || cNameLow.includes('petro')) {
    intelligenceChips.push({ label: 'Fuel Benefits', icon: 'Fuel', color: '#F59E0B' });
  }
  if (cNameLow.includes('dine') || cNameLow.includes('swiggy')) {
    intelligenceChips.push({ label: 'Dining Benefits', icon: 'Utensils', color: '#EC4899' });
  }
  const finalChips = intelligenceChips.slice(0, 4);

  const handleToggleStatus = (newValue: boolean) => {
    setLocalIsActive(newValue);
    updateCard({ card_status: newValue ? 'ACTIVE' : 'INACTIVE' });
  };

  const handleViewTransactions = () => {
    onClose();
    router.push(`/history?cardId=${card.id}`);
  };

  const handleRemoveCard = () => {
    Alert.alert(
      "Remove Card",
      "Are you sure you want to remove this card from your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            updateCard({ card_status: 'DELETED' });
            onClose();
          }
        }
      ]
    );
  };

  const bentoBoxStyle = [
    styles.bentoBox,
    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: colors.glassBorder }
  ];

  return (
    <>
      <Modal visible={!!card} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={95}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                backgroundColor: colors.glassSurface,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
              },
            ]}
          />
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* ROW 1: Hero Card */}
            <Animated.View entering={FadeInUp.duration(500).delay(50)}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={[styles.heroTopEdge, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.heroGlare} />
                
                <View style={styles.heroHeader}>
                  <Text style={styles.heroBankName} numberOfLines={1}>{bankName}</Text>
                  <View style={[styles.statusPill, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }]}>
                    <Text style={[styles.statusText, { color: '#FFF' }]}>{isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <DynamicIcon name="Wifi" size={28} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '90deg' }], marginBottom: 16 }} />
                  <Text style={styles.heroCardName} numberOfLines={1}>{cardName}</Text>
                  {card.last_4_digits && (
                    <Text style={styles.heroCardNumber}>•••• •••• •••• {card.last_4_digits}</Text>
                  )}
                </View>

                <View style={styles.heroFooter}>
                  <View>
                    <Text style={styles.heroFeeLabel}>ANNUAL FEE</Text>
                    <Text style={styles.heroFeeValue}>
                      {card.effective_annual_fee ? formatCurrencyIN(card.effective_annual_fee) : 'Free'}
                    </Text>
                  </View>
                  {!!displayNetwork && <Text style={styles.heroNetwork}>{displayNetwork}</Text>}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* BENTO GRID */}
            <View style={styles.bentoGrid}>
              
              {/* ROW 2: Fee Waiver (Full Width) */}
              {hasWaiver && (
                <Animated.View entering={FadeInUp.duration(500).delay(100)} style={[{ width: '100%' }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setIsSpendEditVisible(true)} style={bentoBoxStyle}>
                    <View style={styles.bentoHeader}>
                      <Text style={[styles.bentoTitle, { color: colors.textMuted }]}>FEE WAIVER PROGRESS</Text>
                      <DynamicIcon name="Sparkles" size={14} color={colors.primary} />
                    </View>
                    
                    <View style={styles.waiverNumbersRow}>
                      <Text style={[styles.waiverCurrent, { color: colors.success }]}>
                        ₹{card.annual_spend.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.waiverTarget, { color: colors.textMuted }]}>
                        {' / '}₹{waiverTarget.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                      <View style={[styles.progressFill, { width: `${Math.min(waiverPercent, 100)}%`, backgroundColor: colors.success }]} />
                    </View>

                    <View style={styles.bentoFooter}>
                      <Text style={[styles.bentoFooterText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {card.waiver_achieved ? 'Waiver achieved' : `₹${remainingSpend.toLocaleString('en-IN')} remaining`}
                      </Text>
                      <View style={[styles.miniPill, { backgroundColor: colors.borderHighlight }]}>
                        <Text style={[styles.miniPillText, { color: colors.textPrimary }]}>{Math.min(waiverPercent, 100).toFixed(0)}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* ROW 3: Annual Fee & Fee Cycle (2 Columns) */}
              <View style={styles.bentoRow}>
                <Animated.View entering={FadeInUp.duration(500).delay(150)} style={{ flex: 1 }}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setIsAnnualFeeEditVisible(true)} style={[bentoBoxStyle, { height: 110, justifyContent: 'space-between' }]}>
                    <View style={styles.bentoHeader}>
                      <Text style={[styles.bentoTitle, { color: colors.textMuted }]}>ANNUAL FEE</Text>
                      <DynamicIcon name="Pencil" size={12} color={colors.textMuted} />
                    </View>
                    <View>
                      <Text style={[styles.bentoMassiveValue, { color: colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
                        {card.effective_annual_fee ? `${formatCurrencyIN(card.effective_annual_fee)}` : 'Free'}
                      </Text>
                      <Text style={[styles.bentoSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {card.fee_confidence === 'USER_CALIBRATED' ? 'Custom fee' : 'Estimated'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(500).delay(200)} style={{ flex: 1 }}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setIsFeeCycleEditVisible(true)} style={[bentoBoxStyle, { height: 110, justifyContent: 'space-between' }]}>
                    <View style={styles.bentoHeader}>
                      <Text style={[styles.bentoTitle, { color: colors.textMuted }]}>FEE CYCLE</Text>
                      <DynamicIcon name="Calendar" size={12} color={colors.textMuted} />
                    </View>
                    <View>
                      <Text style={[styles.bentoMassiveValue, { color: colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
                        {card.annual_fee_debit_date ? 
                          card.annual_fee_debit_date.split('-').reverse().join('/') 
                          : 'Not set'}
                      </Text>
                      <Text style={[styles.bentoSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {card.days_until_renewal !== null && card.days_until_renewal !== undefined ? `${card.days_until_renewal} days left` : 'Add date'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* ROW 4: Milestone Progress (If Premium) */}
              {card.milestone_progress && card.milestone_progress.length > 0 && (
                <Animated.View entering={FadeInUp.duration(500).delay(250)} style={[{ width: '100%' }]}>
                  <View style={bentoBoxStyle}>
                    <View style={styles.bentoHeader}>
                      <Text style={[styles.bentoTitle, { color: colors.textMuted }]}>MILESTONES</Text>
                      <DynamicIcon name="Trophy" size={14} color={colors.primary} />
                    </View>
                    
                    {isPremium ? card.milestone_progress.map((milestone, idx) => (
                      <View key={idx} style={{ marginTop: idx > 0 ? 16 : 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: colors.textPrimary, fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.bold }}>
                            {milestone.target_type === 'TRANSACTION_COUNT' ? 'Monthly Txns' : 'Spend Goal'}
                          </Text>
                          <Text style={{ color: colors.success, fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.bold }}>
                            {milestone.target_type === 'TRANSACTION_COUNT' 
                              ? `${milestone.current_value} / ${milestone.target_value}`
                              : `₹${milestone.current_value.toLocaleString('en-IN')} / ₹${milestone.target_value.toLocaleString('en-IN')}`
                            }
                          </Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', height: 6, marginBottom: 8 }]}>
                          <View style={[styles.progressFill, { width: `${milestone.progress_percentage}%`, backgroundColor: colors.success }]} />
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: tokens.fontSize.micro }}>
                          Reward: {milestone.bonus_points ? `${milestone.bonus_points} Pts` : milestone.fee_waiver ? 'Fee Waiver' : 'Milestone'}
                        </Text>
                      </View>
                    )) : (
                      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                        <DynamicIcon name="Zap" size={20} color={colors.primary} style={{ marginBottom: 8, opacity: 0.8 }} />
                        <Text style={{ color: colors.textPrimary, fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium }}>Unlock Premium</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* ROW 5: Card Intelligence (Merged) */}
              <Animated.View entering={FadeInUp.duration(500).delay(300)} style={[{ width: '100%' }]}>
                <View style={[bentoBoxStyle, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.02)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <View style={styles.bentoHeader}>
                    <Text style={[styles.bentoTitle, { color: '#8B5CF6' }]}>INTELLIGENCE</Text>
                    <DynamicIcon name="BrainCircuit" size={14} color="#8B5CF6" />
                  </View>
                  
                  <Text style={[styles.intelligenceText, { color: colors.textPrimary }]}>
                    {hasWaiver && card.explanation_text 
                      ? card.explanation_text 
                      : `Best used for ${cNameLow.includes('travel') || cNameLow.includes('miles') ? 'travel & milestone acceleration' : 'maximizing immediate cashback on daily spends'}.`}
                  </Text>

                  {finalChips.length > 0 && (
                    <View style={styles.chipsContainer}>
                      {finalChips.map((chip, idx) => (
                        <View key={idx} style={[styles.miniChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', borderColor: colors.border }]}>
                          <DynamicIcon name={chip.icon} size={12} color={chip.color} style={{ marginRight: 6 }} />
                          <Text style={[styles.miniChipLabel, { color: colors.textPrimary }]}>{chip.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* ROW 6: Settings / Quick Actions */}
              <Animated.View entering={FadeInUp.duration(500).delay(350)} style={[{ width: '100%', marginTop: 8 }]}>
                <View style={[styles.iosGroupedList, { borderColor: colors.glassBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF' }]}>
                  
                  <TouchableOpacity style={styles.iosRow} onPress={handleViewTransactions}>
                    <View style={[styles.iosIconBox, { backgroundColor: colors.borderHighlight }]}>
                      <DynamicIcon name="FileText" size={16} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.iosLabel, { color: colors.textPrimary }]}>View Transactions</Text>
                    <DynamicIcon name="ChevronRight" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.iosDivider, { backgroundColor: colors.glassBorder }]} />

                  <TouchableOpacity style={styles.iosRow} onPress={() => setIsCardDetailsEditVisible(true)}>
                    <View style={[styles.iosIconBox, { backgroundColor: colors.borderHighlight }]}>
                      <DynamicIcon name="CreditCard" size={16} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.iosLabel, { color: colors.textPrimary }]}>Edit Card Details</Text>
                    <DynamicIcon name="ChevronRight" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.iosDivider, { backgroundColor: colors.glassBorder }]} />

                  <View style={styles.iosRow}>
                    <View style={[styles.iosIconBox, { backgroundColor: isActive ? colors.successSoft : colors.borderHighlight }]}>
                      <DynamicIcon name="Activity" size={16} color={isActive ? colors.success : colors.textPrimary} />
                    </View>
                    <Text style={[styles.iosLabel, { color: colors.textPrimary }]}>Active in Wallet</Text>
                    <Switch
                      value={isActive}
                      onValueChange={handleToggleStatus}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.success }}
                    />
                  </View>
                  <View style={[styles.iosDivider, { backgroundColor: colors.glassBorder }]} />

                  <TouchableOpacity style={styles.iosRow} onPress={handleRemoveCard}>
                    <View style={[styles.iosIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <DynamicIcon name="Trash2" size={16} color="#EF4444" />
                    </View>
                    <Text style={[styles.iosLabel, { color: '#EF4444' }]}>Remove Card</Text>
                    <DynamicIcon name="ChevronRight" size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                </View>
              </Animated.View>

            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>

      </Modal>

      <ComingSoonSheet visible={!!mockActionTitle} onClose={() => setMockActionTitle(null)} title={mockActionTitle || "Coming Soon"} />
      <EditAnnualFeeSheet visible={isAnnualFeeEditVisible} onClose={() => setIsAnnualFeeEditVisible(false)} card={card} />
      <EditSpendSheet visible={isSpendEditVisible} onClose={() => setIsSpendEditVisible(false)} card={card} />
      <EditFeeCycleSheet visible={isFeeCycleEditVisible} onClose={() => setIsFeeCycleEditVisible(false)} card={card} />
      <EditCardDetailsSheet visible={isCardDetailsEditVisible} onClose={() => setIsCardDetailsEditVisible(false)} card={card} />
    </>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    paddingBottom: 4,
  },
  headerSpacer: { width: 36 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  
  // Hero Card
  heroCard: {
    width: '100%',
    aspectRatio: 1.58,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  heroTopEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  heroGlare: {
    position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ rotate: '45deg' }],
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBankName: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 9,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 1,
  },
  heroCardName: {
    fontSize: 24,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroCardNumber: {
    fontSize: 14,
    fontWeight: tokens.fontWeight.medium,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
    marginTop: 6,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroFeeLabel: {
    fontSize: 9,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  heroFeeValue: {
    fontSize: 16,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFF',
  },
  heroNetwork: {
    fontSize: 18,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.9)',
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bentoRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  bentoBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bentoTitle: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 1.5,
  },
  bentoMassiveValue: {
    fontSize: 26,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  bentoSubText: {
    fontSize: 12,
    fontWeight: tokens.fontWeight.medium,
  },

  // Waiver
  waiverNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  waiverCurrent: {
    fontSize: 24,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
  },
  waiverTarget: {
    fontSize: 14,
    fontWeight: tokens.fontWeight.medium,
    marginLeft: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  bentoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoFooterText: {
    fontSize: 12,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
  },

  // Intelligence
  intelligenceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniChipLabel: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
  },

  // iOS List
  iosGroupedList: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  iosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iosIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iosLabel: {
    fontSize: 15,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  iosDivider: {
    height: 1,
    marginLeft: 64,
  },
});
