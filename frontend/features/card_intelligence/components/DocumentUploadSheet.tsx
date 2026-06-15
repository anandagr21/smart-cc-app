import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  Alert, TextInput, ScrollView, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useSubmitUrlSource } from '../api/cardIntelligenceApi';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/services/api/client';

// ── Top 20 Indian credit card issuing banks ────────────────────────────────
const BANKS = [
  'Axis Bank',
  'AU Small Finance Bank',
  'Bank of Baroda',
  'Federal Bank',
  'HDFC Bank',
  'HSBC Bank',
  'ICICI Bank',
  'IDFC FIRST Bank',
  'IndusInd Bank',
  'Kotak Mahindra Bank',
  'OneCard (FPL Technologies)',
  'Punjab National Bank',
  'RBL Bank',
  'SBI Card',
  'Standard Chartered Bank',
  'Union Bank of India',
  'Yes Bank',
  'American Express',
  'Citibank',
  'Other',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  cardId?: string | null;
  onSuccess?: (cardId: string) => void;
}

export const DocumentUploadSheet: React.FC<Props> = ({ visible, onClose, onSuccess, cardId }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  // ── Form state ─────────────────────────────────────────────────────────
  const [bankName, setBankName] = useState('');
  const [cardName, setCardName] = useState('');
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [url, setUrl] = useState('');
  const [htmlSource, setHtmlSource] = useState('');
  
  const [uploadMode, setUploadMode] = useState<'URL' | 'PDF'>('URL');
  const [pdfFile, setPdfFile] = useState<any>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const urlMutation = useSubmitUrlSource();

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!cardId) {
      if (!bankName.trim()) {
        Alert.alert('Error', 'Please select a bank.');
        return;
      }
      if (!cardName.trim()) {
        Alert.alert('Error', 'Please enter the card name (e.g. "Regalia Gold").');
        return;
      }
    }
    if (!sourceTitle.trim()) {
      Alert.alert('Error', 'Please provide a source title.');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Error', 'Please provide a valid URL.');
      return;
    }

    if (uploadMode === 'URL') {
      urlMutation.mutate(
        { 
          bankName: cardId ? undefined : bankName.trim(), 
          cardName: cardId ? undefined : cardName.trim(), 
          url: url.trim(), 
          sourceTitle: sourceTitle.trim(),
          html_source: htmlSource.trim() || undefined,
          cardId: cardId || undefined
        },
        {
          onSuccess: (data) => {
            resetAndClose();
            if (data?.document_id) {
              Alert.alert(
                'Extraction Started',
                `HTML RAG Document ID: ${data.document_id}\n\nYou can use this ID in the Extraction Playground.`,
                [
                  { 
                    text: 'Go to Review Workspace', 
                    onPress: () => {
                      if (data?.card_id) {
                        if (onSuccess) onSuccess(data.card_id);
                        router.push({
                          pathname: '/admin/card-intelligence/review/[card_id]',
                          params: { card_id: data.card_id }
                        });
                      }
                    } 
                  }
                ]
              );
            } else if (data?.card_id) {
              if (onSuccess) onSuccess(data.card_id);
              router.push({
                pathname: '/admin/card-intelligence/review/[card_id]',
                params: { card_id: data.card_id }
              });
            }
          },
          onError: (error: any) => {
            const errorMessage = error?.response?.data?.detail || error?.message || 'There was an error fetching the URL.';
            Alert.alert('Submission Failed', errorMessage);
          },
        }
      );
    } else {
      // PDF Upload logic
      if (!pdfFile) {
        Alert.alert('Error', 'Please select a PDF document first.');
        return;
      }
      uploadPdf();
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPdfFile(result.assets[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const uploadPdf = async () => {
    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: pdfFile.uri,
        name: pdfFile.name,
        type: pdfFile.mimeType || 'application/pdf',
      } as any);
      formData.append('source_type', 'MITC_PDF');
      // If we had an endpoint that created the catalog item and started extraction, we'd pass bank/card names.
      // Currently, it just queues the document parsing.
      
      await apiClient.post('/admin/ingestion/sources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      Alert.alert('Success', 'PDF uploaded successfully. Extraction is running in the background.');
      resetAndClose();
    } catch (e: any) {
      const errorMessage = e?.response?.data?.detail || e?.message || 'Upload failed.';
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const resetAndClose = () => {
    setBankName('');
    setCardName('');
    setSourceTitle('');
    setUrl('');
    setHtmlSource('');
    setPdfFile(null);
    setIsBankDropdownOpen(false);
    onClose();
  };

  const isPending = uploadMode === 'URL' ? urlMutation.isPending : isUploadingPdf;
  const cardFullName = bankName && cardName ? `${bankName} ${cardName}` : null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
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
              },
            ]}
          />
          <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{cardId ? 'Re-Ingest Card Source' : 'Fetch Live Bank Data'}</Text>
            <TouchableOpacity onPress={resetAndClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

            {/* ── Card Identity ─────────────────────────────────────── */}
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CARD IDENTITY</Text>

            {cardId ? (
              <View style={[styles.cardPreviewBadge, { backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', borderColor: colors.primary + '44' }]}>
                <Text style={[styles.cardPreviewText, { color: colors.primary }]}>
                  Re-Ingesting Source for this Card
                </Text>
              </View>
            ) : (
              <>
                {/* Bank Name Dropdown */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>BANK</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  onPress={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownTriggerText, { color: bankName ? colors.textPrimary : colors.textSecondary }]}>
                    {bankName || 'Select issuing bank...'}
                  </Text>
                  {/* @ts-ignore */}
                  {isBankDropdownOpen ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
                </TouchableOpacity>

                {isBankDropdownOpen && (
                  <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {BANKS.map((bank) => (
                        <TouchableOpacity
                          key={bank}
                          style={[
                            styles.dropdownItem,
                            bankName === bank && { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)' },
                          ]}
                          onPress={() => { setBankName(bank); setIsBankDropdownOpen(false); }}
                        >
                          <Text style={[styles.dropdownItemText, { color: bankName === bank ? colors.primary : colors.textPrimary }]}>
                            {bank}
                          </Text>
                          {bankName === bank && (
                            // @ts-ignore
                            <CheckCircle size={14} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Card Name Text Input */}
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: tokens.spacing.lg }]}>CARD NAME</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  placeholder="e.g. Regalia Gold, SimplyClick, Millennia..."
                  placeholderTextColor={colors.textSecondary}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCorrect={false}
                />

                {/* Derived preview */}
                {cardFullName && (
                  <View style={[styles.cardPreviewBadge, { backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', borderColor: colors.primary + '44' }]}>
                    <Text style={[styles.cardPreviewText, { color: colors.primary }]}>
                      Target: {cardFullName}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* ── Mode Toggle ───────────────────────────────────────── */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, uploadMode === 'URL' && { backgroundColor: colors.primary }]}
                onPress={() => setUploadMode('URL')}
              >
                <Text style={[styles.tabText, uploadMode === 'URL' && { color: '#FFF' }]}>URL / HTML</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, uploadMode === 'PDF' && { backgroundColor: colors.primary }]}
                onPress={() => setUploadMode('PDF')}
              >
                <Text style={[styles.tabText, uploadMode === 'PDF' && { color: '#FFF' }]}>PDF Upload</Text>
              </TouchableOpacity>
            </View>

            {/* ── Source Details ────────────────────────────────────── */}
            <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: tokens.spacing.lg }]}>SOURCE DETAILS</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>SOURCE TITLE</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              placeholder="e.g. HDFC Regalia Gold MITC 2024"
              placeholderTextColor={colors.textSecondary}
              value={sourceTitle}
              onChangeText={setSourceTitle}
            />

            {uploadMode === 'URL' ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: tokens.spacing.xl }]}>OFFICIAL URL (Required for Tracking)</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: tokens.spacing.xl }]}>RAW HTML SOURCE (Optional fallback)</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceElevated, minHeight: 64, maxHeight: 150 }]}
                  placeholder="Paste raw HTML here if the bank blocks our crawler..."
                  placeholderTextColor={colors.textSecondary}
                  value={htmlSource}
                  onChangeText={setHtmlSource}
                  autoCapitalize="none"
                  multiline={true}
                />
              </>
            ) : (
              <View style={{ marginTop: tokens.spacing.xl }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>MITC / TERMS PDF FILE</Text>
                <TouchableOpacity
                  style={[styles.input, { alignItems: 'center', borderColor: colors.border, backgroundColor: colors.surfaceElevated, paddingVertical: 24, borderStyle: 'dashed', borderWidth: 1 }]}
                  onPress={pickPdf}
                >
                  <Text style={{ color: pdfFile ? colors.primary : colors.textSecondary, fontFamily: 'Inter-Medium', marginBottom: 4 }}>
                    {pdfFile ? pdfFile.name : 'Tap to select a PDF'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'Up to 50MB'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Processing Document...</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>{uploadMode === 'URL' ? 'Extract Structured Schema' : 'Upload & Queue PDF'}</Text>
              )}
            </TouchableOpacity>

            {/* Bottom padding for scroll */}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    paddingHorizontal: tokens.spacing.xl,
  },
  sectionHeader: {
    fontSize: tokens.fontSize.label,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.4,
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1.1,
    marginBottom: tokens.spacing.sm,
  },
  // ── Bank Dropdown ──
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: 13,
    marginBottom: 4,
  },
  dropdownTriggerText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    marginBottom: tokens.spacing.sm,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: 11,
  },
  dropdownItemText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  // ── Card Preview Badge ──
  cardPreviewBadge: {
    marginTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  cardPreviewText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },

  // ── Inputs ──
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.lg,
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  // ── Tabs ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: tokens.radius.lg,
    padding: 4,
    marginTop: tokens.spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  // ── Submit ──
  saveBtn: {
    borderRadius: tokens.radius.full,
    paddingVertical: tokens.spacing.lg,
    alignItems: 'center',
    marginTop: tokens.spacing['2xl'],
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
});
