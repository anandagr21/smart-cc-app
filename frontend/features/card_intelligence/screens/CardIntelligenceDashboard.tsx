import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { FileText, PlayCircle, CheckCircle, Clock, AlertCircle, Link, CreditCard, UploadCloud, BrainCircuit } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { useKnowledgeSources, useTriggerProcessing } from '../api/cardIntelligenceApi';
import { DocumentUploadSheet } from '../components/DocumentUploadSheet';
import { ProcessingStatus } from '../types/api';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { CardIntelligenceReviewQueue } from './CardIntelligenceReviewQueue';
import { CardSidebar } from '../components/CardSidebar';

export const CardIntelligenceDashboard: React.FC = () => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const router = useRouter();

  const { data: catalog } = useCardCatalog();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isUploadSheetVisible, setIsUploadSheetVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'SOURCES' | 'REVIEW'>('SOURCES');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: sources, isLoading: isSourcesLoading } = useKnowledgeSources(selectedCardId);
  const processMutation = useTriggerProcessing(selectedCardId || '');

  const selectedCard = catalog?.find((c) => c.id === selectedCardId);

  const renderStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={14} color={colors.success} />;
      case 'PROCESSING':
        return <ActivityIndicator size="small" color={colors.primary} />;
      case 'QUEUED':
        return <Clock size={14} color={colors.warning} />;
      case 'FAILED':
        return <AlertCircle size={14} color={colors.danger} />;
      case 'DISCOVERED':
        return <AlertCircle size={14} color={colors.primary} />;
      default:
        return <FileText size={14} color={colors.textSecondary} />;
    }
  };

  const renderSourceIcon = (type: string) => {
    if (type === 'URL' || type === 'HTML') return <Link size={14} color={colors.textSecondary} />;
    return <FileText size={14} color={colors.textSecondary} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Intelligence Operations</Text>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
          <TouchableOpacity 
            style={[styles.globalUploadBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/admin/master-catalog')}
          >
            {/* @ts-ignore */}
            <CreditCard size={18} color={colors.textPrimary} />
            <Text style={[styles.uploadBtnText, { color: colors.textPrimary }]}>Master Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.globalUploadBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary + '66', borderWidth: 1 }]}
            onPress={() => router.push('/admin/card-rules')}
          >
            {/* @ts-ignore */}
            <BrainCircuit size={18} color={colors.primary} />
            <Text style={[styles.uploadBtnText, { color: colors.primary }]}>View Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.globalUploadBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsUploadSheetVisible(true)}
          >
            {/* @ts-ignore */}
            <UploadCloud size={18} color="#FFFFFF" />
            <Text style={[styles.uploadBtnText, { color: '#FFFFFF' }]}>Add Source</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Close</Text>
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
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Select a card above to view its sources and queue.</Text>
            </View>
          ) : (
            <View style={styles.docsContainer}>
              <View style={styles.docsHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {selectedCard?.bank_name} {selectedCard?.card_name}
                  </Text>
                  <View style={styles.topTabs}>
                    <TouchableOpacity onPress={() => setActiveTab('SOURCES')}>
                      <Text style={[styles.topTabBtn, { color: activeTab === 'SOURCES' ? colors.primary : colors.textSecondary }]}>Sources</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('REVIEW')}>
                      <Text style={[styles.topTabBtn, { color: activeTab === 'REVIEW' ? colors.primary : colors.textSecondary }]}>Review Queue</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {activeTab === 'SOURCES' ? (
                <ScrollView style={styles.docsList}>
                  {isSourcesLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                  ) : sources?.length === 0 ? (
                    <View style={[styles.noDocsBox, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.noDocsText, { color: colors.textSecondary }]}>No sources added yet.</Text>
                    </View>
                  ) : (
                    sources?.map((doc) => (
                      <View key={doc.id} style={[styles.docRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <View style={styles.docRowMain}>
                          <View style={styles.docInfo}>
                            <View style={styles.docTypeRow}>
                              {renderSourceIcon(doc.source_type)}
                              <Text style={[styles.docType, { color: colors.textPrimary }]}>{doc.source_type}</Text>
                              {!doc.is_latest_version && (
                                <View style={[styles.badge, { backgroundColor: colors.border }]}>
                                  <Text style={[styles.badgeText, { color: colors.textSecondary }]}>v{doc.document_version}</Text>
                                </View>
                              )}
                              {doc.is_latest_version && (
                                <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                  <Text style={[styles.badgeText, { color: colors.success }]}>Latest (v{doc.document_version})</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.docFile, { color: colors.textPrimary }]}>{doc.source_title || 'Untitled Source'}</Text>
                            <Text style={[styles.docDate, { color: colors.textSecondary }]} numberOfLines={1}>
                              {doc.source_type === 'URL' ? doc.source_url : doc.file_name}
                            </Text>
                            <Text style={[styles.docDate, { color: colors.textMuted }]}>
                              Added {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                            </Text>
                          </View>
                          
                          <View style={styles.docActions}>
                            <View style={[styles.statusBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                              {renderStatusIcon(doc.processing_status)}
                              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                                {doc.processing_status}
                              </Text>
                            </View>
                            
                            {(doc.processing_status === 'UPLOADED' || doc.processing_status === 'FAILED' || doc.processing_status === 'IMPORTED' || doc.processing_status === 'DISCOVERED') && doc.is_latest_version && (
                              <TouchableOpacity 
                                style={[styles.processBtn, { borderColor: colors.border }]}
                                onPress={() => processMutation.mutate(doc.id)}
                                disabled={processMutation.isPending}
                              >
                                {/* @ts-ignore */}
                                <PlayCircle size={16} color={colors.textPrimary} />
                                <Text style={[styles.processBtnText, { color: colors.textPrimary }]}>
                                  {doc.processing_status === 'DISCOVERED' ? 'Import & Process' : 'Process'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Progress Bar */}
                        {(doc.processing_status === 'QUEUED' || doc.processing_status === 'PROCESSING') && (
                          <View style={styles.progressContainer}>
                            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                              <View 
                                style={[
                                  styles.progressBarFill, 
                                  { 
                                    backgroundColor: colors.primary, 
                                    width: doc.processing_status === 'QUEUED' ? '30%' : '80%' 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.progressText, { color: colors.primary }]}>
                              {doc.processing_status === 'QUEUED' ? 'Waiting in queue...' : 'Extracting intelligence...'}
                            </Text>
                          </View>
                        )}

                        {/* Error Message */}
                        {doc.processing_status === 'FAILED' && doc.processing_error && (
                          <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger }]}>
                            {/* @ts-ignore */}
                            <AlertCircle size={16} color={colors.danger} />
                            <Text style={[styles.errorText, { color: colors.danger }]}>{doc.processing_error}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
              ) : (
                <CardIntelligenceReviewQueue cardId={selectedCardId} />
              )}
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
          setActiveTab('SOURCES');
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
