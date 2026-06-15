import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { apiClient } from '@/services/api/client';
import { AdminUsageGuide } from '@/components/admin/AdminUsageGuide';

const SUPPORTED_FIELDS = [
  "annual_fee",
  "joining_fee",
  "renewal_fee",
  "fee_waiver_spend",
  "welcome_bonus"
];

export default function ExtractionPlaygroundScreen() {
  const router = useRouter();
  
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>(SUPPORTED_FIELDS[0]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // In a real app we'd have an endpoint to list uploaded source documents
    // For now we'll just show a placeholder or let the user paste an ID
  }, []);

  const runExtraction = async () => {
    if (!selectedDocId) {
      Alert.alert("Error", "Please enter a document ID");
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await apiClient.post('/admin/ingestion/extract-field', {
        document_id: selectedDocId,
        field_name: selectedField,
      });

      setResult(response.data);
    } catch (error: any) {
      let errorMsg = "An error occurred";
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        errorMsg = detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join('\n');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Extraction Playground</Text>
      </View>
      
      <AdminUsageGuide 
        title="AI Extraction Playground"
        description="Test the LLM extraction logic on a single field using a specific document. This helps debug retrieval and prompt quality."
        workflowSteps={[
          "Enter a valid Document UUID",
          "Select the target field to extract",
          "Run extraction and review the LLM output and retrieved chunks",
          "If accurate, approve it as Ground Truth for future benchmarks"
        ]}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Extraction Configuration</Text>
          
          <Text style={styles.label}>Source Document ID</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Paste Document UUID here"
            value={selectedDocId}
            onChangeText={setSelectedDocId}
          />
          
          <Text style={styles.label}>Target Field</Text>
          <View style={styles.pillContainer}>
            {SUPPORTED_FIELDS.map(field => (
              <TouchableOpacity 
                key={field}
                style={[styles.pill, selectedField === field && styles.pillSelected]}
                onPress={() => setSelectedField(field)}
              >
                <Text style={[styles.pillText, selectedField === field && styles.pillTextSelected]}>
                  {field}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.runButton, isLoading && styles.runButtonDisabled]} 
            onPress={runExtraction}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.runButtonText}>Run Extraction (gpt-4o-mini)</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {result && (
          <View style={styles.resultsGrid}>
            <View style={styles.resultCol}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>LLM Output</Text>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Status:</Text>
                  <Text style={[
                    styles.dataValue, 
                    result.status === 'EXTRACTED' ? {color: colors.success} : {color: colors.danger}
                  ]}>{result.status}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Value:</Text>
                  <Text style={styles.dataValue}>
                    {JSON.stringify(result.candidate_value, null, 2)}
                  </Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Explanation:</Text>
                  <Text style={styles.dataValue}>{result.explanation}</Text>
                </View>

                {result.metrics_debug && (
                  <View style={styles.metricsContainer}>
                    <Text style={styles.metricsTitle}>Telemetry</Text>
                    <Text style={styles.metricText}>Latency: {result.metrics_debug.latency_ms} ms</Text>
                    <Text style={styles.metricText}>Tokens: {result.metrics_debug.prompt_tokens} IN / {result.metrics_debug.completion_tokens} OUT</Text>
                    <Text style={styles.metricText}>Cost: ${result.metrics_debug.cost_usd?.toFixed(5)}</Text>
                    <Text style={styles.metricText}>Prompt Version: {result.metrics_debug.prompt_version}</Text>
                  </View>
                )}
                
                {result.status === 'EXTRACTED' && (
                  <TouchableOpacity 
                    style={styles.approveButton}
                    onPress={async () => {
                      try {
                        await apiClient.post('/admin/ingestion/benchmarks', {
                          document_id: selectedDocId,
                          field_name: selectedField,
                          expected_value: result.candidate_value,
                        });
                        Alert.alert("Success", "Marked as Ground Truth");
                      } catch (err: any) {
                        Alert.alert("Error", err?.response?.data?.detail || err?.message || "Failed to mark ground truth");
                      }
                    }}
                  >
                    <Text style={styles.approveButtonText}>✓ Approve As Ground Truth</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.resultCol}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Retrieval Debugging (Top Chunks)</Text>
                
                {result.retrieved_chunks_debug && result.retrieved_chunks_debug.map((chunk: any) => (
                  <View 
                    key={chunk.id} 
                    style={[
                      styles.chunkCard,
                      result.retrieval_rank === chunk.rank && styles.chunkCardSelected
                    ]}
                  >
                    <View style={styles.chunkHeader}>
                      <Text style={styles.chunkRank}>Rank #{chunk.rank}</Text>
                      <Text style={styles.chunkScore}>Score: {chunk.score.toFixed(2)}</Text>
                      <Text style={styles.chunkPage}>Page: {chunk.page_number}</Text>
                    </View>
                    <Text style={styles.chunkText}>{chunk.text}</Text>
                    {result.retrieval_rank === chunk.rank && (
                      <Text style={styles.chunkBadge}>★ Chosen by LLM</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.background,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  pillTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  runButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  runButtonDisabled: {
    opacity: 0.7,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  resultCol: {
    flex: 1,
  },
  dataRow: {
    marginBottom: 16,
  },
  dataLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 4,
  },
  chunkCard: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  chunkCardSelected: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  chunkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chunkRank: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  chunkScore: {
    color: colors.textSecondary,
  },
  chunkPage: {
    color: colors.textSecondary,
  },
  chunkText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  chunkBadge: {
    marginTop: 12,
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  metricsContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  metricText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  approveButton: {
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
