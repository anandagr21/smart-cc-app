import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import {
    CreditCard,
    Shield,
    Zap,
    Gift,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Edit3,
    Info,
    Ban,
    ArrowRight,
} from 'lucide-react-native';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { useCandidates } from '../api/cardIntelligenceApi';
import { formatCurrencyIN } from '@/utils/currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntelligenceReport {
    cardName: string;
    bankName: string;
    confidence: number;
    status: 'Needs Review' | 'Ready' | 'Incomplete';
    fees: FeeSection;
    rewardProgram: RewardProgram;
    rewardRules: DisplayRule[];
    milestones: DisplayMilestone[];
    benefits: DisplayBenefit[];
    warnings: Warning[];
}

interface FeeSection {
    annualFee: number | null;
    joiningFee: number | null;
    feeWaiverThreshold: number | null;
    feeWaiverDescription: string | null;
}

interface RewardProgram {
    type: 'cashback' | 'reward_points' | 'unknown';
    currencyName: string;
    pointValue: number | null;
}

interface DisplayRule {
    id: string;
    candidateId: string;
    name: string;
    type: 'partner' | 'online' | 'fallback';
    expression: string;
    merchants: string[];
    categories: string[];
    sourceText: string;
    confidence: number;
    status: 'approved' | 'pending' | 'rejected';
}

interface DisplayMilestone {
    id: string;
    candidateId: string;
    name: string;
    spendThreshold: number;
    benefit: string;
    confidence: number;
    status: 'approved' | 'pending' | 'rejected';
}

interface DisplayBenefit {
    id: string;
    candidateId: string;
    description: string;
    confidence: number;
    status: 'approved' | 'pending' | 'rejected';
}

interface Warning {
    type: 'point_value_missing' | 'exclusions_missing' | 'low_confidence' | 'mitc_missing';
    message: string;
    severity: 'critical' | 'warning' | 'info';
}

interface Props {
    cardId: string;
    onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CardIntelligenceReview: React.FC<Props> = ({ cardId, onBack }) => {
    const colors = useThemeColors();
    const { data: catalog } = useCardCatalog();
    const { data: candidates = [], isLoading } = useCandidates(cardId, 'PENDING');

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        fees: true,
        rewards: true,
        milestones: false,
        benefits: false,
    });

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const card = catalog?.find(c => c.id === cardId);

    // Build intelligence report from candidates
    const report = useMemo((): IntelligenceReport | null => {
        if (!candidates || candidates.length === 0) return null;

        const feeCandidates = candidates.filter(c => c.candidate_type === 'FEE_RULE' || c.candidate_type === 'CARD_FIELD');
        const rewardCandidates = candidates.filter(c => c.candidate_type === 'REWARD_RULE');
        const milestoneCandidates = candidates.filter(c => c.candidate_type === 'MILESTONE');
        const benefitCandidates = candidates.filter(c => c.candidate_type === 'BENEFIT');

        // Extract fee info
        const fees: FeeSection = {
            annualFee: null,
            joiningFee: null,
            feeWaiverThreshold: null,
            feeWaiverDescription: null,
        };

        feeCandidates.forEach(c => {
            const val = c.proposed_value;
            if (!val) return;
            if (c.field_name === 'annual_fee') fees.annualFee = val.value ?? val.annual_fee;
            if (c.field_name === 'joining_fee') fees.joiningFee = val.value ?? val.joining_fee;
            if (c.field_name === 'fee_waiver_spend_threshold') fees.feeWaiverThreshold = val.value ?? val.threshold;
            if (c.field_name === 'fee_waiver_conditions') fees.feeWaiverDescription = val.conditions ?? val.description;
        });

        // Build display rules
        const rules: DisplayRule[] = rewardCandidates.map(c => {
            const val = c.proposed_value || {};
            const merchants = val.merchant_names || val.merchants || [];
            const categories = val.categories || [];
            const hasMerchants = merchants.length > 0;
            const isOnline = (val.categories || []).some((cat: string) =>
                cat.toLowerCase().includes('online')
            );
            const isAll = (val.categories || []).some((cat: string) =>
                cat.toLowerCase().includes('all spends') || cat.toLowerCase() === 'all'
            );

            return {
                id: c.entity_identifier || c.field_name || c.id,
                candidateId: c.id,
                name: c.entity_identifier || val.rule_name || 'Untitled Rule',
                type: hasMerchants ? 'partner' : isAll ? 'fallback' : 'online',
                expression: val.reward_expression || val.display_text || '',
                merchants,
                categories,
                sourceText: c.source_text || '',
                confidence: c.confidence_score,
                status: c.status === 'APPROVED' ? 'approved' : c.status === 'REJECTED' ? 'rejected' : 'pending',
            };
        });

        // Build milestones
        const milestones: DisplayMilestone[] = milestoneCandidates.map(c => ({
            id: c.entity_identifier || c.id,
            candidateId: c.id,
            name: c.entity_identifier || c.proposed_value?.name || 'Milestone',
            spendThreshold: c.proposed_value?.spend_threshold || c.proposed_value?.threshold || 0,
            benefit: c.proposed_value?.benefit || c.proposed_value?.description || '',
            confidence: c.confidence_score,
            status: c.status === 'APPROVED' ? 'approved' : c.status === 'REJECTED' ? 'rejected' : 'pending',
        }));

        // Build benefits
        const benefits: DisplayBenefit[] = benefitCandidates.map(c => ({
            id: c.entity_identifier || c.id,
            candidateId: c.id,
            description: c.proposed_value?.description || c.proposed_value?.benefit || c.entity_identifier || '',
            confidence: c.confidence_score,
            status: c.status === 'APPROVED' ? 'approved' : c.status === 'REJECTED' ? 'rejected' : 'pending',
        }));

        // Determine reward program
        const rewardProgram: RewardProgram = {
            type: 'unknown',
            currencyName: 'Reward Points',
            pointValue: null,
        };

        // Try to infer from rules
        const firstRule = rewardCandidates[0];
        if (firstRule) {
            const val = firstRule.proposed_value || {};
            const rt = val.reward_type || '';
            if (rt === 'cashback') rewardProgram.type = 'cashback';
            else if (rt === 'reward_points' || rt === 'points') rewardProgram.type = 'reward_points';
            if (val.reward_currency_name) rewardProgram.currencyName = val.reward_currency_name;
            if (val.point_value || val.base_point_value) {
                rewardProgram.pointValue = val.point_value || val.base_point_value;
            }
        }

        // Calculate confidence from candidate average
        const avgConfidence = candidates.length > 0
            ? Math.round(candidates.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / candidates.length)
            : 0;

        // Generate warnings
        const warnings: Warning[] = [];

        if (rewardProgram.type === 'reward_points' && rewardProgram.pointValue === null) {
            warnings.push({
                type: 'point_value_missing',
                message: 'Reward point value missing — needed before publishing',
                severity: 'critical',
            });
        }

        const hasExclusions = candidates.some(c => c.candidate_type === 'EXCLUSION');
        if (!hasExclusions) {
            warnings.push({
                type: 'exclusions_missing',
                message: 'Exclusions missing — MITC document may not be available',
                severity: 'warning',
            });
        }

        if (avgConfidence < 90) {
            warnings.push({
                type: 'low_confidence',
                message: `Confidence below 90% — marketing page only, verify with MITC`,
                severity: 'warning',
            });
        }

        return {
            cardName: card?.card_name || '',
            bankName: card?.bank_name || '',
            confidence: avgConfidence,
            status: warnings.some(w => w.severity === 'critical') ? 'Incomplete' : 'Needs Review',
            fees,
            rewardProgram,
            rewardRules: rules,
            milestones,
            benefits,
            warnings,
        };
    }, [candidates, card]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading intelligence report...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!report || candidates.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Info size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No extracted candidates yet.{'\n'}Process a knowledge source first.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const partnerRules = report.rewardRules.filter(r => r.type === 'partner');
    const onlineRules = report.rewardRules.filter(r => r.type === 'online');
    const fallbackRules = report.rewardRules.filter(r => r.type === 'fallback');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* ── Card Header ── */}
                <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardHeaderTop}>
                        <CreditCard size={28} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardName, { color: colors.textPrimary }]}>
                                {report.cardName} {report.bankName} Card
                            </Text>
                            <View style={styles.confidenceRow}>
                                <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>Confidence:</Text>
                                <Text
                                    style={[
                                        styles.confidenceValue,
                                        { color: report.confidence >= 90 ? colors.success : report.confidence >= 70 ? colors.warning : colors.danger },
                                    ]}
                                >
                                    {report.confidence}%
                                </Text>
                            </View>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        report.status === 'Needs Review'
                                            ? colors.warning + '22'
                                            : report.status === 'Incomplete'
                                                ? colors.danger + '22'
                                                : colors.success + '22',
                                    borderColor:
                                        report.status === 'Needs Review'
                                            ? colors.warning
                                            : report.status === 'Incomplete'
                                                ? colors.danger
                                                : colors.success,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    {
                                        color:
                                            report.status === 'Needs Review'
                                                ? colors.warning
                                                : report.status === 'Incomplete'
                                                    ? colors.danger
                                                    : colors.success,
                                    },
                                ]}
                            >
                                {report.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Warnings Panel ── */}
                {report.warnings.length > 0 && (
                    <View style={[styles.warningsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={16} color={colors.warning} />
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Warnings</Text>
                            <View style={[styles.warningCount, { backgroundColor: colors.warning + '22' }]}>
                                <Text style={[styles.warningCountText, { color: colors.warning }]}>{report.warnings.length}</Text>
                            </View>
                        </View>
                        <View style={styles.warningList}>
                            {report.warnings.map((w, idx) => (
                                <View key={idx} style={styles.warningItem}>
                                    <Text style={[styles.warningSeverity, { color: w.severity === 'critical' ? colors.danger : colors.warning }]}>
                                        {w.severity === 'critical' ? '⚠' : 'ℹ'}
                                    </Text>
                                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>{w.message}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Fees Section ── */}
                <CollapsibleSection
                    title="Fees"
                    icon={<CreditCard size={16} color={colors.primary} />}
                    expanded={expandedSections.fees}
                    onToggle={() => toggleSection('fees')}
                    colors={colors}
                >
                    <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {report.fees.annualFee !== null && (
                            <FeeRow label="Annual Fee" value={`₹${report.fees.annualFee.toLocaleString('en-IN')}`} colors={colors} />
                        )}
                        {report.fees.joiningFee !== null && (
                            <FeeRow label="Joining Fee" value={`₹${report.fees.joiningFee.toLocaleString('en-IN')}`} colors={colors} />
                        )}
                        {report.fees.feeWaiverThreshold !== null && (
                            <FeeRow label="Fee Waiver" value={`₹${report.fees.feeWaiverThreshold.toLocaleString('en-IN')} annual spend`} colors={colors} />
                        )}
                        {report.fees.feeWaiverDescription && (
                            <Text style={[styles.feeDescription, { color: colors.textSecondary }]}>
                                {report.fees.feeWaiverDescription}
                            </Text>
                        )}
                        {report.rewardProgram.type === 'reward_points' && report.rewardProgram.pointValue === null && (
                            <View style={[styles.inlineWarning, { backgroundColor: colors.danger + '11' }]}>
                                <AlertTriangle size={14} color={colors.danger} />
                                <Text style={[styles.inlineWarningText, { color: colors.danger }]}>Point valuation missing</Text>
                            </View>
                        )}
                    </View>
                </CollapsibleSection>

                {/* ── Rewards Section ── */}
                <CollapsibleSection
                    title="Rewards"
                    icon={<Zap size={16} color={colors.primary} />}
                    expanded={expandedSections.rewards}
                    onToggle={() => toggleSection('rewards')}
                    colors={colors}
                    badge={
                        report.rewardProgram.type === 'reward_points' && report.rewardProgram.pointValue === null
                            ? { text: 'Incomplete', color: colors.warning }
                            : undefined
                    }
                >
                    <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {/* Reward Program Info */}
                        <View style={[styles.programInfo, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.programLabel, { color: colors.textSecondary }]}>
                                This card earns{' '}
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>{report.rewardProgram.currencyName}</Text>
                            </Text>
                            {report.rewardProgram.pointValue !== null ? (
                                <Text style={[styles.programDetail, { color: colors.success }]}>
                                    1 {report.rewardProgram.currencyName} = ₹{report.rewardProgram.pointValue}
                                </Text>
                            ) : (
                                <View style={styles.pointValueUnknown}>
                                    <Text style={[styles.programDetail, { color: colors.danger }]}>
                                        Current Value: UNKNOWN
                                    </Text>
                                    <TouchableOpacity style={[styles.setValueBtn, { borderColor: colors.primary }]}>
                                        <Text style={[styles.setValueBtnText, { color: colors.primary }]}>Set Value →</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Partner Rewards */}
                        {partnerRules.length > 0 && (
                            <View style={styles.subSection}>
                                <Text style={[styles.subSectionTitle, { color: colors.primary }]}>Partner Rewards</Text>
                                {partnerRules.map(rule => (
                                    <View key={rule.id} style={[styles.ruleBlock, { borderBottomColor: colors.border }]}>
                                        <Text style={[styles.ruleExpression, { color: colors.textPrimary }]}>{rule.expression}</Text>
                                        <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Partners:</Text>
                                        <View style={styles.merchantList}>
                                            {rule.merchants.slice(0, 7).map((m, i) => (
                                                <View key={i} style={[styles.merchantChip, { backgroundColor: colors.success + '15', borderColor: colors.success + '33' }]}>
                                                    <CheckCircle size={10} color={colors.success} />
                                                    <Text style={[styles.merchantChipText, { color: colors.success }]}>{m}</Text>
                                                </View>
                                            ))}
                                            {rule.merchants.length > 7 && (
                                                <Text style={[styles.merchantMore, { color: colors.textSecondary }]}>
                                                    + {rule.merchants.length - 7} more
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Online Spends */}
                        {onlineRules.length > 0 && (
                            <View style={styles.subSection}>
                                <Text style={[styles.subSectionTitle, { color: colors.primary }]}>Other Online Spends</Text>
                                {onlineRules.map(rule => (
                                    <View key={rule.id} style={[styles.ruleBlock, { borderBottomColor: colors.border }]}>
                                        <Text style={[styles.ruleExpression, { color: colors.textPrimary }]}>{rule.expression}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Fallback */}
                        {fallbackRules.length > 0 && (
                            <View style={styles.subSection}>
                                <Text style={[styles.subSectionTitle, { color: colors.primary }]}>All Other Spends</Text>
                                {fallbackRules.map(rule => (
                                    <View key={rule.id} style={[styles.ruleBlock]}>
                                        <Text style={[styles.ruleExpression, { color: colors.textPrimary }]}>{rule.expression}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </CollapsibleSection>

                {/* ── Milestones Section ── */}
                {report.milestones.length > 0 && (
                    <CollapsibleSection
                        title="Milestones"
                        icon={<TrendingUp size={16} color="#ec4899" />}
                        expanded={expandedSections.milestones}
                        onToggle={() => toggleSection('milestones')}
                        colors={colors}
                    >
                        <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {report.milestones.map(m => (
                                <View key={m.id} style={[styles.milestoneRow, { borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.milestoneThreshold, { color: colors.textPrimary }]}>
                                            ₹{m.spendThreshold.toLocaleString('en-IN')} spend
                                        </Text>
                                        <View style={styles.milestoneArrow}>
                                            <ArrowRight size={14} color={colors.textSecondary} />
                                            <Text style={[styles.milestoneBenefit, { color: colors.textSecondary }]}>{m.benefit}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </CollapsibleSection>
                )}

                {/* ── Benefits Section ── */}
                {report.benefits.length > 0 && (
                    <CollapsibleSection
                        title="Benefits"
                        icon={<Gift size={16} color="#06b6d4" />}
                        expanded={expandedSections.benefits}
                        onToggle={() => toggleSection('benefits')}
                        colors={colors}
                    >
                        <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {report.benefits.map(b => (
                                <View key={b.id} style={[styles.benefitRow, { borderBottomColor: colors.border }]}>
                                    <CheckCircle size={14} color={colors.success} />
                                    <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{b.description}</Text>
                                </View>
                            ))}
                        </View>
                    </CollapsibleSection>
                )}

                {/* ── Publish Preview ── */}
                <View style={[styles.publishSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.publishTitle, { color: colors.textPrimary }]}>Publish Preview</Text>

                    <View style={styles.publishGrid}>
                        <PublishCheck label="Fees" detail={report.fees.annualFee ? `✓ Annual Fee ₹${report.fees.annualFee}` : '✗ Missing'} pass={!!report.fees.annualFee} colors={colors} />
                        <PublishCheck
                            label="Rewards"
                            detail={`✓ ${partnerRules.length} Partner • ${onlineRules.length} Online • ${fallbackRules.length} Fallback`}
                            pass={fallbackRules.length > 0}
                            colors={colors}
                        />
                        <PublishCheck label="Benefits" detail={`✓ ${report.benefits.length} benefits`} pass={report.benefits.length > 0} colors={colors} />
                        <PublishCheck label="Milestones" detail={`✓ ${report.milestones.length} milestones`} pass={report.milestones.length > 0} colors={colors} />
                    </View>

                    <View style={[styles.validationSection, { borderTopColor: colors.border }]}>
                        <Text style={[styles.validationTitle, { color: colors.textSecondary }]}>Validation</Text>
                        <ValidationItem label="Fallback Exists" pass={fallbackRules.length > 0} colors={colors} />
                        <ValidationItem label="Point Value Exists" pass={report.rewardProgram.type === 'cashback' || report.rewardProgram.pointValue !== null} colors={colors} />
                        <ValidationItem label="Merchant Aliases Exist" pass={partnerRules.length === 0 || report.warnings.every(w => w.type !== 'mitc_missing')} colors={colors} />
                        <ValidationItem label="No Duplicate Merchants" pass={true} colors={colors} />
                        <ValidationItem label="No Priority Conflicts" pass={true} colors={colors} />
                    </View>

                    {report.status === 'Incomplete' ? (
                        <View style={[styles.notReadyBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '33' }]}>
                            <Ban size={16} color={colors.danger} />
                            <Text style={[styles.notReadyText, { color: colors.danger }]}>Not ready to publish — resolve warnings first</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.success }]}>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.publishBtnText}>Publish to Production</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CollapsibleSection({
    title,
    icon,
    expanded,
    onToggle,
    children,
    colors,
    badge,
}: {
    title: string;
    icon: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    colors: any;
    badge?: { text: string; color: string };
}) {
    return (
        <View style={styles.section}>
            <TouchableOpacity style={styles.sectionToggle} onPress={onToggle} activeOpacity={0.7}>
                <View style={styles.sectionToggleLeft}>
                    {icon}
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
                </View>
                <View style={styles.sectionToggleRight}>
                    {badge && (
                        <View style={[styles.sectionBadge, { backgroundColor: badge.color + '22' }]}>
                            <Text style={[styles.sectionBadgeText, { color: badge.color }]}>{badge.text}</Text>
                        </View>
                    )}
                    {expanded ? (
                        <ChevronUp size={18} color={colors.textSecondary} />
                    ) : (
                        <ChevronDown size={18} color={colors.textSecondary} />
                    )}
                </View>
            </TouchableOpacity>
            {expanded && children}
        </View>
    );
}

function FeeRow({ label, value, colors }: { label: string; value: string; colors: any }) {
    return (
        <View style={[styles.feeRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.feeValue, { color: colors.textPrimary }]}>{value}</Text>
        </View>
    );
}

function PublishCheck({
    label,
    detail,
    pass,
    colors,
}: {
    label: string;
    detail: string;
    pass: boolean;
    colors: any;
}) {
    return (
        <View style={[styles.publishCheck, { borderColor: colors.border }]}>
            <View style={styles.publishCheckHeader}>
                {pass ? <CheckCircle size={14} color={colors.success} /> : <AlertTriangle size={14} color={colors.warning} />}
                <Text style={[styles.publishCheckLabel, { color: colors.textPrimary }]}>{label}</Text>
            </View>
            <Text style={[styles.publishCheckDetail, { color: colors.textSecondary }]}>{detail}</Text>
        </View>
    );
}

function ValidationItem({ label, pass, colors }: { label: string; pass: boolean; colors: any }) {
    return (
        <View style={styles.validationItem}>
            {pass ? <CheckCircle size={12} color={colors.success} /> : <AlertTriangle size={12} color={colors.danger} />}
            <Text style={[styles.validationLabel, { color: pass ? colors.success : colors.danger }]}>{label}</Text>
        </View>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: tokens.spacing.lg, paddingBottom: 60, gap: tokens.spacing.lg },

    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontFamily: 'Inter-Medium' },
    emptyText: { fontSize: 14, fontFamily: 'Inter-Medium', textAlign: 'center', marginTop: 8 },

    // Card Header
    cardHeader: {
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        padding: tokens.spacing.xl,
        gap: 12,
    },
    cardHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cardName: {
        fontSize: tokens.fontSize.headline,
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.8,
    },
    confidenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    confidenceLabel: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
    },
    confidenceValue: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Warnings Panel
    warningsPanel: {
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        padding: tokens.spacing.lg,
        gap: 12,
    },
    warningList: {
        gap: 8,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    warningSeverity: {
        fontSize: 14,
        width: 20,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        flex: 1,
    },
    warningCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: tokens.radius.full,
    },
    warningCountText: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
    },

    // Sections
    section: {
        gap: 0,
    },
    sectionToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
    },
    sectionToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionToggleRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: tokens.fontSize.headline,
        fontFamily: 'Inter-SemiBold',
        letterSpacing: -0.3,
    },
    sectionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: tokens.radius.full,
    },
    sectionBadgeText: {
        fontSize: 10,
        fontFamily: 'Inter-SemiBold',
    },

    // Section Body
    sectionBody: {
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },

    // Fees
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    feeLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
    },
    feeValue: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
    },
    feeDescription: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.md,
        lineHeight: 18,
    },
    inlineWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.md,
    },
    inlineWarningText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },

    // Reward Program
    programInfo: {
        padding: tokens.spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 4,
    },
    programLabel: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
    },
    programDetail: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
    },
    pointValueUnknown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    setValueBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: tokens.radius.sm,
        borderWidth: 1,
    },
    setValueBtnText: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
    },

    // Rule blocks
    subSection: {
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
    },
    subSectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    ruleBlock: {
        paddingBottom: tokens.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    ruleExpression: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
    ruleLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },
    merchantList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    merchantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
    },
    merchantChipText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },
    merchantMore: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },

    // Milestones
    milestoneRow: {
        padding: tokens.spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    milestoneThreshold: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
    milestoneArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    milestoneBenefit: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        flex: 1,
    },

    // Benefits
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: tokens.spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    benefitText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        flex: 1,
    },

    // Publish Preview
    publishSection: {
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        padding: tokens.spacing.xl,
        gap: 16,
    },
    publishTitle: {
        fontSize: tokens.fontSize.headline,
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.3,
    },
    publishGrid: {
        gap: 8,
    },
    publishCheck: {
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        gap: 4,
    },
    publishCheckHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    publishCheckLabel: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
    },
    publishCheckDetail: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        marginLeft: 22,
    },
    validationSection: {
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    validationTitle: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    validationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    validationLabel: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
    },
    notReadyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
    },
    notReadyText: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
        flex: 1,
    },
    publishBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.lg,
    },
    publishBtnText: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#fff',
    },
});