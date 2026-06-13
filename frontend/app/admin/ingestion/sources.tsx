import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, Search } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/services/api/client';

export default function SourceManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isUploading, setIsUploading] = useState(false);
  const [sourceDoc, setSourceDoc] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      setIsUploading(true);
      const file = result.assets[0];
      
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('source_type', 'MITC_PDF');
      
      const response = await apiClient.post('/admin/ingestion/sources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSourceDoc(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!sourceDoc || !searchQuery) return;
    try {
      setIsSearching(true);
      const response = await apiClient.get(`/admin/ingestion/sources/${sourceDoc.id}/search`, {
        params: { q: searchQuery },
      });
      setSearchResults(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          {/* @ts-ignore */}
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Source Documents</Text>
          <Text style={styles.subtitle}>Upload & Extract Evidence</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Upload Document</Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                {/* @ts-ignore */}
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Select PDF File</Text>
              </>
            )}
          </TouchableOpacity>

          {sourceDoc && (
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>✅ Document Uploaded</Text>
              <Text style={styles.docText}>ID: {sourceDoc.id}</Text>
              <Text style={styles.docText}>Pages: {sourceDoc.pages_processed}</Text>
              <Text style={styles.docText}>Chunks: {sourceDoc.chunks_created}</Text>
            </View>
          )}
        </View>

        {sourceDoc && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Evidence Search</Text>
            
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search chunks (e.g. 'Fee' or 'Lounge')"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                {/* @ts-ignore */}
                <Search size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {isSearching && <ActivityIndicator style={{marginTop: 16}} />}

            {searchResults.map((res, i) => (
              <View key={i} style={styles.chunkCard}>
                <View style={styles.chunkHeader}>
                  <Text style={styles.pageText}>Page {res.page_number}</Text>
                  <Text style={styles.tokenText}>{res.token_count} tokens</Text>
                </View>
                <Text style={styles.chunkText}>{res.chunk_text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderHighlight, gap: tokens.spacing.md,
  },
  backButton: { padding: tokens.spacing.xs },
  title: { fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.heavy, color: colors.textPrimary },
  subtitle: { fontSize: tokens.fontSize.caption, color: colors.textSecondary },
  scrollContent: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderHighlight, borderRadius: tokens.radius.xl, padding: tokens.spacing.lg, gap: tokens.spacing.md },
  sectionTitle: { fontSize: tokens.fontSize.headline, fontWeight: tokens.fontWeight.bold, color: colors.textPrimary },
  primaryButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.md, borderRadius: tokens.radius.lg, gap: 8 },
  buttonText: { color: '#FFFFFF', fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.bold },
  docInfo: { marginTop: 8, padding: 12, backgroundColor: colors.background, borderRadius: 8 },
  docTitle: { color: colors.success, fontWeight: 'bold', marginBottom: 4 },
  docText: { color: colors.textSecondary, fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderHighlight, borderRadius: tokens.radius.lg, padding: tokens.spacing.md, color: colors.textPrimary },
  searchButton: { backgroundColor: colors.primary, padding: tokens.spacing.md, borderRadius: tokens.radius.lg, justifyContent: 'center', alignItems: 'center' },
  chunkCard: { marginTop: 12, padding: 12, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.borderHighlight },
  chunkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pageText: { fontWeight: 'bold', color: colors.textPrimary },
  tokenText: { color: colors.textSecondary, fontSize: 12 },
  chunkText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
