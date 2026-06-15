import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { FileText, PlayCircle, CheckCircle, Clock, AlertCircle, Link, CreditCard, UploadCloud, BrainCircuit } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { DocumentUploadSheet } from '../components/DocumentUploadSheet';
import { useRouter } from 'expo-router';
import { CardIntelligenceWorkspaceV2 } from '../components/CardIntelligenceWorkspaceV2';
import { CardSidebar } from '../components/CardSidebar';

export const CardIntelligenceDashboard: React.FC = () => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const router = useRouter();

  const { data: catalog } = useCardCatalog();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isUploadSheetVisible, setIsUploadSheetVisible] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const selectedCard = catalog?.find((c) => c.id === selectedCardId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Intelligence Operations</Text>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>

          <TouchableOpacity
            style={[styles.globalUploadBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/admin/ingestion/evaluation')}
          >
            {/* @ts-ignore */}
            <CheckCircle size={18} color={colors.textPrimary} />
            <Text style={[styles.uploadBtnText, { color: colors.textPrimary }]}>Eval Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.globalUploadBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/admin/ingestion/playground')}
          >
            {/* @ts-ignore */}
            <PlayCircle size={18} color={colors.textPrimary} />
            <Text style={[styles.uploadBtnText, { color: colors.textPrimary }]}>Playground</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.globalUploadBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsUploadSheetVisible(true)}
          >
            {/* @ts-ignore */}
            <UploadCloud size={18} color="#FFFFFF" />
            <Text style={[styles.uploadBtnText, { color: '#FFFFFF' }]}>Add Source</Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.main}>
        <CardSidebar
          catalog={catalog || []}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Content Area */}
        <View style={styles.contentArea}>

          {!selectedCardId ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Medium', fontSize: 16 }}>Select a card to review its extraction</Text>
            </View>
          ) : (
            <View style={styles.docsContainer}>
              <View style={styles.docsHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {selectedCard?.bank_name} {selectedCard?.card_name}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: colors.textSecondary, marginTop: 4 }}>
                    Base Point Value: ₹{selectedCard?.base_point_value || '1.00'}
                  </Text>
                </View>
              </View>

              <CardIntelligenceWorkspaceV2 cardId={selectedCardId} />
            </View>
          )}
        </View>
      </View>

      <DocumentUploadSheet
        visible={isUploadSheetVisible}
        onClose={() => setIsUploadSheetVisible(false)}
        cardId={selectedCardId}
        onSuccess={(cardId) => {
          setIsUploadSheetVisible(false);
          setSelectedCardId(cardId);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: -0.5,
  },
  backBtn: {
    padding: tokens.spacing.sm,
  },
  backBtnText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  main: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  sidebar: {
    width: Platform.OS === 'web' ? 280 : '100%',
    height: Platform.OS === 'web' ? '100%' : 200,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    padding: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.label,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.2,
    marginBottom: tokens.spacing.md,
  },
  cardItem: {
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  cardItemText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  contentArea: {
    flex: 1,
    padding: tokens.spacing.xl,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  docsContainer: {
    flex: 1,
    maxWidth: 900,
  },
  docsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing['2xl'],
  },
  cardTitle: {
    fontSize: tokens.fontSize.headline,
    fontFamily: 'Inter-Bold',
    letterSpacing: -1,
  },
  cardSubtitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  topTabs: {
    flexDirection: 'row',
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.lg,
  },
  topTabBtn: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  uploadBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.full,
  },
  globalUploadBtn: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.full,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  docsList: {
    flex: 1,
  },
  noDocsBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing['2xl'],
    alignItems: 'center',
  },
  noDocsText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  docRow: {
    flexDirection: 'column',
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: tokens.spacing.lg,
  },
  docRowMain: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    width: '100%',
  },
  docInfo: {
    flex: 1,
    marginBottom: Platform.OS === 'web' ? 0 : tokens.spacing.lg,
  },
  docTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  docType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  docFile: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  processBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    gap: 6,
  },
  processBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  progressContainer: {
    marginTop: tokens.spacing.lg,
    width: '100%',
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
});
