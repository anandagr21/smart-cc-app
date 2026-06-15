import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Database, BrainCircuit, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { AdminUsageGuide } from '@/components/admin/AdminUsageGuide';
import { AdminWorkflowModal } from '@/components/admin/AdminWorkflowModal';
import { Settings } from 'lucide-react-native';

type ModuleColorKey = 'primary' | 'accent' | 'success' | 'warning';

const ADMIN_MODULES = [
  {
    id: 'operations',
    title: 'Card Operations Hub',
    description: 'Unified hub to ingest new documents, review AI parsing, and manage the live card catalog.',
    icon: Database,
    route: '/admin/operations',
    colorKey: 'primary' as ModuleColorKey,
  },
  {
    id: 'feedback',
    title: 'User Feedback',
    description: 'Review and moderate community feedback, suggestions, and bug reports.',
    icon: MessageSquare,
    route: '/admin/feedback',
    colorKey: 'warning' as ModuleColorKey,
  },
];

const SOFT_BG_MAP: Record<ModuleColorKey, string> = {
  primary: 'primarySoft',
  accent: 'accentSoft',
  success: 'successSoft',
  warning: 'warningSoft',
};

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useThemeColors();
  const [isWorkflowModalVisible, setIsWorkflowModalVisible] = useState(false);

  // Pick only the scalar color keys (exclude gradient arrays like networkVisa)
  type ScalarColors = Pick<
    typeof colors,
    'primary' | 'accent' | 'success' | 'warning' | 'primarySoft' | 'accentSoft' | 'successSoft' | 'warningSoft'
  >;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft as string }]}>
            <ShieldCheck size={28} color={colors.primary as string} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Admin Control Panel
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Centralized operations hub for platform management and AI workflows.
          </Text>
          <TouchableOpacity 
            style={styles.workflowBtn}
            onPress={() => setIsWorkflowModalVisible(true)}
          >
            <Settings size={16} color="#F8FAFC" />
            <Text style={styles.workflowBtnText}>View Architecture & Workflow</Text>
          </TouchableOpacity>
        </View>

        <AdminWorkflowModal 
          visible={isWorkflowModalVisible}
          onClose={() => setIsWorkflowModalVisible(false)}
        />

        <AdminUsageGuide 
          title="Admin Control Panel Overview"
          description="Centralized hub for all platform operations. Use these modules to manage canonical data, run AI extraction pipelines, and evaluate platform health."
          workflowSteps={[
            "Select a module from the grid below",
            "Follow the specific workflows within each module",
            "Ensure you have necessary permissions for destructive actions"
          ]}
        />

        {/* Module cards */}
        <View style={styles.grid}>
          {ADMIN_MODULES.map((module) => {
            const Icon = module.icon;
            const moduleColor = colors[module.colorKey] as string;
            const softKey = SOFT_BG_MAP[module.colorKey] as keyof ScalarColors;
            const moduleSoftBg = colors[softKey] as string;

            return (
              <TouchableOpacity
                key={module.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface as string,
                    borderColor: colors.border as string,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(module.route as any)}
                accessibilityRole="button"
                accessibilityLabel={`${module.title} — ${module.description}`}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardIconWrapper,
                      { backgroundColor: moduleSoftBg },
                    ]}
                  >
                    <Icon size={22} color={moduleColor} strokeWidth={2} />
                  </View>
                  <ArrowRight
                    size={18}
                    color={colors.textMuted as string}
                    strokeWidth={1.5}
                  />
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary as string }]}>
                  {module.title}
                </Text>
                <Text
                  style={[styles.cardDescription, { color: colors.textSecondary as string }]}
                  numberOfLines={2}
                >
                  {module.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 0,
    paddingBottom: tokens.spacing['3xl'],
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.display,
    lineHeight: Math.round(tokens.fontSize.display * tokens.lineHeight.tight),
    fontWeight: tokens.fontWeight.bold,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: Math.round(tokens.fontSize.bodyLg * tokens.lineHeight.relaxed),
    textAlign: 'center',
    maxWidth: '85%',
    fontWeight: tokens.fontWeight.regular,
  },
  grid: {
    gap: tokens.spacing.md,
  },
  card: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: tokens.border.thin,
    ...tokens.elevation.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: tokens.spacing.sm,
  },
  cardDescription: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: Math.round(tokens.fontSize.bodySm * tokens.lineHeight.relaxed),
    fontWeight: tokens.fontWeight.regular,
  },
  workflowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  workflowBtnText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
});
