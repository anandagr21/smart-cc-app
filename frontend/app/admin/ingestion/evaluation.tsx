import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { apiClient } from '@/services/api/client';
import { AdminUsageGuide } from '@/components/admin/AdminUsageGuide';

export default function EvaluationDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchDatasets = async () => {
    try {
      const response = await apiClient.get('/admin/ingestion/evaluation/datasets');
      const result = response.data;
      if (result.length > 0) {
        setDatasets(result);
        if (!selectedDatasetId) {
          setSelectedDatasetId(result[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch datasets", err);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/admin/ingestion/evaluation', {
        params: selectedDatasetId && selectedDatasetId !== "" ? { dataset_id: selectedDatasetId } : undefined,
      });
      setData(response.data);
      
      const status = response.data?.job_progress?.status;
      if (status !== 'RUNNING' && status !== 'PENDING') {
        setIsEvaluating(false);
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load evaluation data';
      Alert.alert("Error", message);
      setIsEvaluating(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Poll every 5 seconds if a job is running
    const interval = setInterval(() => {
      // Always fetch to check status, because isEvaluating might be true
      if (isEvaluating || data?.job_progress?.status === 'RUNNING' || data?.job_progress?.status === 'PENDING') {
        fetchDashboardData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDatasetId]);

  const runEvaluationSuite = async () => {
    setIsEvaluating(true);
    try {
      await apiClient.post('/admin/ingestion/evaluation/run', null, {
        params: selectedDatasetId && selectedDatasetId !== "" ? { dataset_id: selectedDatasetId } : undefined,
      });
      // Immediately fetch data to show progress
      fetchDashboardData();
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to start evaluation suite';
      Alert.alert("Error", message);
      setIsEvaluating(false);
    }
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  const isJobRunning = data?.job_progress?.status === 'RUNNING' || data?.job_progress?.status === 'PENDING' || isEvaluating;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Evaluation Dashboard</Text>
        
        {/* Dataset Selector */}
        {datasets.length > 0 && (
          <View style={{marginLeft: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: '#f9f9f9'}}>
            <Picker
              selectedValue={selectedDatasetId}
              style={{ height: 40, width: 200 }}
              onValueChange={(itemValue: string | null) => setSelectedDatasetId(itemValue)}
            >
              <Picker.Item label="All Datasets" value="" />
              {datasets.map(d => (
                <Picker.Item key={d.id} label={`${d.name} (${d.status})`} value={d.id} />
              ))}
            </Picker>
          </View>
        )}
        
        <View style={{ flex: 1 }} />
        
        {isJobRunning ? (
          <View style={styles.progressContainer}>
             <ActivityIndicator size="small" color={colors.primary} style={{marginRight: 8}} />
             <Text style={styles.progressText}>
               Running... {data?.job_progress?.completed || 0} / {data?.job_progress?.total || 0} Benchmarks
             </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.runButton} 
            onPress={runEvaluationSuite}
          >
            <Text style={styles.runButtonText}>▶ Run Evaluation Suite</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <AdminUsageGuide 
        title="Evaluation Dashboard"
        description="Monitor system-wide accuracy of the AI extraction pipeline using Gold Standard datasets."
        workflowSteps={[
          "Select an evaluation dataset",
          "Click 'Run Evaluation Suite' to process all benchmarks",
          "Review health metrics, failure analysis, and field-level accuracy"
        ]}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Section 1: System Health */}
        <Text style={styles.sectionHeading}>1. System Health</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Benchmarks</Text>
            <Text style={styles.metricValue}>{data?.health?.total_benchmarks || 0}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Overall Accuracy</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {((data?.health?.overall_accuracy || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Weighted Acc</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {((data?.health?.weighted_accuracy || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Retrieval Prec.</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {((data?.health?.retrieval_precision || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Extr | Retr Acc</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {((data?.health?.extraction_accuracy_given_retrieval || 0) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          {/* Section 2: Field Accuracy */}
          <View style={[styles.card, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.cardTitle}>2. Field Accuracy</Text>
            {data?.field_accuracy?.map((item: any) => (
              <View key={item.field_name} style={styles.tableRow}>
                <Text style={styles.tableName}>{item.field_name} <Text style={{color: colors.textSecondary, fontSize: 12}}>({item.count})</Text></Text>
                <Text style={styles.tableScore}>{(item.accuracy * 100).toFixed(1)}%</Text>
              </View>
            ))}
            {(!data?.field_accuracy || data.field_accuracy.length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>

          {/* Section 3: Prompt Performance */}
          <View style={[styles.card, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.cardTitle}>3. Prompt Performance Trend</Text>
            {data?.prompt_performance?.map((item: any) => (
              <View key={item.prompt_name} style={styles.tableRow}>
                <Text style={styles.tableName}>{item.prompt_name}</Text>
                <Text style={styles.tableScore}>{(item.accuracy * 100).toFixed(1)}%</Text>
              </View>
            ))}
            {(!data?.prompt_performance || data.prompt_performance.length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>
        </View>

        <View style={styles.row}>
          {/* Section 4: Failure Analysis */}
          <View style={[styles.card, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.cardTitle}>4. Failure Analysis</Text>
            {data?.failure_analysis?.map((item: any, idx: number) => (
              <View key={`${item.error_reason}-${idx}`} style={styles.tableRow}>
                <View>
                  <Text style={styles.tableName}>{item.error_reason}</Text>
                  {item.severity && (
                    <Text style={{fontSize: 10, color: item.severity === 'HIGH' ? colors.danger : colors.warning, fontWeight: 'bold', marginTop: 2}}>
                      SEVERITY: {item.severity}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableScore, { color: colors.danger }]}>{item.count} issues</Text>
              </View>
            ))}
            {(!data?.failure_analysis || data.failure_analysis.length === 0) && (
              <Text style={styles.emptyText}>No failures recorded 🎉</Text>
            )}
          </View>

          {/* Section 5: Worst Performers */}
          <View style={[styles.card, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.cardTitle}>5. Worst Performing Benchmarks</Text>
            {data?.worst_performers?.map((item: any) => (
              <TouchableOpacity 
                key={`${item.document_id}-${item.field_name}`} 
                style={[styles.tableRow, {flexDirection: 'column', alignItems: 'flex-start'}]}
                onPress={() => Alert.alert("View Benchmark", `Benchmark ID: ${item.benchmark_id}\nThis will open a detailed diff view in the future.`)}
              >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                  <Text style={[styles.tableName, {fontWeight: 'bold', color: colors.primary}]}>
                    {item.field_name} ↗
                  </Text>
                  <Text style={[styles.tableScore, { color: colors.danger }]}>{(item.score * 100).toFixed(0)}%</Text>
                </View>
                <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 4}}>
                  {item.error_reason || "Unknown Error"} {item.severity ? `(${item.severity})` : ''}
                </Text>
                <Text style={{fontSize: 10, color: colors.border, marginTop: 4}} numberOfLines={1} ellipsizeMode="middle">
                  Doc: {item.document_id}
                </Text>
              </TouchableOpacity>
            ))}
            {(!data?.worst_performers || data.worst_performers.length === 0) && (
              <Text style={styles.emptyText}>No worst performers found</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
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
  runButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  runButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9e2ec',
  },
  progressText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  tableName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  tableScore: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  }
});
