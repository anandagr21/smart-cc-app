import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, FileText, UploadCloud } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { CardDocumentType } from '../types/api';
import * as DocumentPicker from 'expo-document-picker';
import { useUploadDocument } from '../api/cardIntelligenceApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  cardId: string;
}

const documentTypes: { label: string; value: CardDocumentType }[] = [
  { label: 'Reward Guide', value: 'REWARD_GUIDE' },
  { label: 'MITC', value: 'MITC' },
  { label: 'Fees and Charges', value: 'FEES_AND_CHARGES' },
  { label: 'Benefits Guide', value: 'BENEFITS_GUIDE' },
  { label: 'Exclusions', value: 'EXCLUSIONS' },
  { label: 'Milestone Rules', value: 'MILESTONE_RULES' },
  { label: 'Offer Terms', value: 'OFFER_TERMS' },
  { label: 'General Terms', value: 'GENERAL_TERMS' },
];

export const DocumentUploadSheet: React.FC<Props> = ({ visible, onClose, cardId }) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');
  
  const [selectedType, setSelectedType] = useState<CardDocumentType>('REWARD_GUIDE');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  const uploadMutation = useUploadDocument();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.log('Error picking document', err);
      Alert.alert('Error', 'Failed to pick a document');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document first.');
      return;
    }

    uploadMutation.mutate(
      {
        cardId,
        documentType: selectedType,
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        mimeType: selectedFile.mimeType || 'application/pdf',
      },
      {
        onSuccess: () => {
          setSelectedFile(null);
          setSelectedType('REWARD_GUIDE');
          onClose();
        },
        onError: (err) => {
          console.error(err);
          Alert.alert('Upload Failed', 'There was an error uploading the document.');
        },
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Upload Source Document</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              {/* @ts-ignore */}
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DOCUMENT TYPE</Text>
            <View style={styles.typeGrid}>
              {documentTypes.map((type) => {
                const isSelected = selectedType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : colors.surfaceElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: tokens.spacing.xl }]}>FILE</Text>
            
            {!selectedFile ? (
              <TouchableOpacity
                style={[
                  styles.uploadZone,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handlePickDocument}
              >
                {/* @ts-ignore */}
                <UploadCloud size={32} color={colors.primary} style={{ marginBottom: 12, opacity: 0.8 }} />
                <Text style={[styles.uploadZoneText, { color: colors.textPrimary }]}>Select PDF Document</Text>
                <Text style={[styles.uploadZoneSubtext, { color: colors.textSecondary }]}>Official terms, guides, or MITC</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.selectedFileBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.selectedFileRow}>
                  {/* @ts-ignore */}
                  <FileText size={20} color={colors.primary} />
                  <Text style={[styles.selectedFileName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeBtn}>
                  <Text style={[styles.removeBtnText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[
                styles.saveBtn, 
                { backgroundColor: colors.primary, opacity: (!selectedFile || uploadMutation.isPending) ? 0.5 : 1 }
              ]} 
              onPress={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Upload Document</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    minHeight: 500,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    padding: tokens.spacing.xl,
  },
  label: {
    fontSize: tokens.fontSize.label,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1.2,
    marginBottom: tokens.spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  typePill: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  typeText: {
    fontSize: tokens.fontSize.label,
    fontFamily: 'Inter-Medium',
  },
  uploadZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  uploadZoneSubtext: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  selectedFileBox: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: tokens.spacing.md,
  },
  selectedFileName: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
    marginLeft: tokens.spacing.sm,
    flexShrink: 1,
  },
  removeBtn: {
    padding: tokens.spacing.sm,
  },
  removeBtnText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
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
