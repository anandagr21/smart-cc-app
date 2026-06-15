import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface AdminUsageGuideProps {
  title: string;
  description: string;
  workflowSteps: string[];
}

export const AdminUsageGuide: React.FC<AdminUsageGuideProps> = ({
  title,
  description,
  workflowSteps
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          {/* @ts-ignore */}
          <Info size={18} color={colors.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {expanded ? (
          /* @ts-ignore */
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          /* @ts-ignore */
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>{description}</Text>
          
          <View style={styles.workflowContainer}>
            <Text style={styles.workflowTitle}>Suggested Workflow:</Text>
            {workflowSteps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                {/* @ts-ignore */}
                <CheckCircle2 size={16} color={colors.success} style={styles.stepIcon} />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // Using primary dark color as per design system
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0F172A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  workflowContainer: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  workflowTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  stepText: {
    fontSize: 13,
    color: '#F8FAFC',
    flex: 1,
    lineHeight: 18,
  },
});
