import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { FileText, PlayCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useCardCatalog } from '@/features/cards/hooks/useCardCatalog';
import { useCardDocuments, useTriggerProcessing } from '../api/cardIntelligenceApi';
import { DocumentUploadSheet } from '../components/DocumentUploadSheet';
import { DocumentProcessingStatus } from '../types/api';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export const CardIntelligenceDashboard: React.FC = () => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  const router = useRouter();

  const { data: catalog, isLoading: isCatalogLoading } = useCardCatalog();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isUploadSheetVisible, setIsUploadSheetVisible] = useState(false);

  const { data: documents, isLoading: isDocsLoading } = useCardDocuments(selectedCardId);
  const processMutation = useTriggerProcessing(selectedCardId || '');

  const selectedCard = catalog?.find((c) => c.id === selectedCardId);

  const renderStatusIcon = (status: DocumentProcessingStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={14} color={colors.success} />;
      case 'PROCESSING':
        return <ActivityIndicator size="small" color={colors.primary} />;
      case 'QUEUED':
        return <Clock size={14} color={colors.warning} />;
      case 'FAILED':
        return <AlertCircle size={14} color={colors.danger} />;
      default:
        return <FileText size={14} color={colors.textSecondary} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Intelligence Operations</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.main}>
        {/* Sidebar */}
        <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CARD CATALOG</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isCatalogLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              catalog?.map((card) => {
                const isSelected = card.id === selectedCardId;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.cardItem,
                      isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                    ]}
                    onPress={() => setSelectedCardId(card.id)}
                  >
                    <Text style={[styles.cardItemText, { color: isSelected ? colors.textPrimary : colors.textSecondary }]}>
                      {card.bank_name} {card.card_name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {!selectedCardId ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Select a card from the catalog</Text>
            </View>
          ) : (
            <View style={styles.docsContainer}>
              <View style={styles.docsHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {selectedCard?.bank_name} {selectedCard?.card_name}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Source Documents
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsUploadSheetVisible(true)}
                >
                  <Text style={styles.uploadBtnText}>Upload Document</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.docsList}>
                {isDocsLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : documents?.length === 0 ? (
                  <View style={[styles.noDocsBox, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.noDocsText, { color: colors.textSecondary }]}>No documents uploaded yet.</Text>
                  </View>
                ) : (
                  documents?.map((doc) => (
                    <View key={doc.id} style={[styles.docRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={styles.docInfo}>
                        <View style={styles.docTypeRow}>
                          <Text style={[styles.docType, { color: colors.textPrimary }]}>{doc.document_type.replace(/_/g, ' ')}</Text>
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
                        <Text style={[styles.docFile, { color: colors.textSecondary }]}>{doc.file_name}</Text>
                        <Text style={[styles.docDate, { color: colors.textMuted }]}>
                          Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        </Text>
                      </View>
                      
                      <View style={styles.docActions}>
                        <View style={[styles.statusBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                          {renderStatusIcon(doc.processing_status)}
                          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                            {doc.processing_status}
                          </Text>
                        </View>
                        
                        {(doc.processing_status === 'UPLOADED' || doc.processing_status === 'FAILED') && doc.is_latest_version && (
                          <TouchableOpacity 
                            style={[styles.processBtn, { borderColor: colors.border }]}
                            onPress={() => processMutation.mutate(doc.id)}
                            disabled={processMutation.isPending}
                          >
                            {/* @ts-ignore */}
                            <PlayCircle size={16} color={colors.textPrimary} />
                            <Text style={[styles.processBtnText, { color: colors.textPrimary }]}>Process Document</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {selectedCardId && (
        <DocumentUploadSheet 
          visible={isUploadSheetVisible} 
          onClose={() => setIsUploadSheetVisible(false)} 
          cardId={selectedCardId} 
        />
      )}
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
  uploadBtn: {
    paddingHorizontal: tokens.spacing.lg,
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
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: tokens.spacing.lg,
  },
  docInfo: {
    flex: 1,
    marginBottom: Platform.OS === 'web' ? 0 : tokens.spacing.lg,
  },
  docTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  docType: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginRight: tokens.spacing.sm,
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
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
});
