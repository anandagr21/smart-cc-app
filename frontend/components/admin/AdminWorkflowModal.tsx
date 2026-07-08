import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';


import { useRouter } from 'expo-router';
import { DynamicIcon } from '@/components/DynamicIcon';

interface AdminWorkflowModalProps {
  visible: boolean;
  onClose: () => void;
}

const WorkflowNode = ({ icon: Icon, title, description, isLast = false, route, onPress }: any) => (
  <View style={styles.nodeContainer}>
    <TouchableOpacity 
      style={styles.nodeCard}
      activeOpacity={route ? 0.7 : 1}
      onPress={onPress}
      disabled={!route}
    >
      <View style={styles.iconContainer}>
        <Icon size={24} color="#22C55E" />
      </View>
      <View style={styles.nodeTextContainer}>
        <Text style={styles.nodeTitle}>{title}</Text>
        <Text style={styles.nodeDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
    {!isLast && (
      <View style={styles.arrowContainer}>
        <View style={styles.verticalLine} />
        <DynamicIcon name="ArrowDown" size={20} color="#475569" />
      </View>
    )}
  </View>
);

export const AdminWorkflowModal: React.FC<AdminWorkflowModalProps> = ({ visible, onClose }) => {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Platform Architecture & Workflow</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <DynamicIcon name="X" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.introText}>
              The Card Analyser App is powered by a robust data ingestion pipeline. Below is the end-to-end flow of how raw bank data becomes live user features.
            </Text>

            <View style={styles.flowchart}>
              <WorkflowNode 
                icon={FileText}
                title="1. Source Documents"
                description="Raw PDFs (MITC, Terms) and HTML files are uploaded and chunked into a vector database."
                route="/admin/card-intelligence"
                onPress={() => handleNavigate('/admin/card-intelligence')}
              />
              <WorkflowNode 
                icon={Cpu}
                title="2. AI Extraction"
                description="LLMs query the chunks to extract structured JSON (fees, reward rules, caps)."
                route="/admin/ingestion/playground"
                onPress={() => handleNavigate('/admin/ingestion/playground')}
              />
              <WorkflowNode 
                icon={CheckSquare}
                title="3. Human Review"
                description="Admins verify extracted fields side-by-side against the raw source chunks."
                route="/admin/card-intelligence"
                onPress={() => handleNavigate('/admin/card-intelligence')}
              />
              <WorkflowNode 
                icon={Database}
                title="4. Master Catalog"
                description="Approved data is saved to the canonical PostgreSQL database, acting as the ultimate source of truth."
                route="/admin/operations"
                onPress={() => handleNavigate('/admin/operations')}
              />
              <WorkflowNode 
                icon={Smartphone}
                title="5. Live User Features"
                description="The Master Catalog powers the mobile app's recommendations, transaction insights, and AI intelligence."
                isLast
                route="/admin/card-intelligence"
                onPress={() => handleNavigate('/admin/card-intelligence')}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)', // dark slate background
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 24,
  },
  introText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Inter-Regular',
  },
  flowchart: {
    alignItems: 'center',
  },
  nodeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nodeCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nodeTextContainer: {
    flex: 1,
  },
  nodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  nodeDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  arrowContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLine: {
    width: 2,
    height: 16,
    backgroundColor: '#475569',
    marginBottom: -4,
  },
});
