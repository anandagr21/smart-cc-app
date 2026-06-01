import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { RequiredAction } from '../types/api';

interface Props {
  actions: RequiredAction[];
}

export const RequiredActionsSection: React.FC<Props> = ({ actions }) => {
  const colors = useThemeColors();
  
  // State for mock modals
  const [pointValueModalVisible, setPointValueModalVisible] = useState(false);
  const [pointValue, setPointValue] = useState('0.25');
  
  const handleActionClick = (actionType: string) => {
    switch (actionType) {
      case 'SET_POINT_VALUE':
        setPointValueModalVisible(true);
        break;
      case 'UPLOAD_MITC':
        // Mock opening file picker
        alert("Opening file picker for MITC...");
        break;
      case 'ADD_ALIAS':
        alert("Opening Add Alias modal...");
        break;
      case 'CONFIRM_CONDITION':
        alert("Opening condition verification modal...");
        break;
      default:
        alert("Action clicked: " + actionType);
    }
  };

  if (!actions || actions.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Required Actions</Text>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No required actions pending.</Text>
        </View>
      </View>
    );
  }

  const blockers = actions.filter(a => a.severity === 'BLOCKER');
  const warnings = actions.filter(a => a.severity === 'WARNING');
  const infos = actions.filter(a => a.severity === 'INFO');

  const renderGroup = (title: string, groupActions: RequiredAction[], color: string) => {
    if (groupActions.length === 0) return null;
    return (
      <View style={styles.actionGroup}>
        <Text style={[styles.groupTitle, { color }]}>{title}</Text>
        <View style={[styles.actionsList, { borderColor: colors.border }]}>
          {groupActions.map((action, index) => (
            <View key={action.id}>
              {index > 0 && <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.actionItem}>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{action.title}</Text>
                  <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{action.description}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleActionClick(action.actionType)}
                >
                  <Text style={styles.actionBtnText}>{action.actionText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Required Actions</Text>
      
      {renderGroup("🚫 Publish Blockers", blockers, colors.danger)}
      {renderGroup("⚠ Quality Improvements", warnings, colors.warning)}
      {renderGroup("ℹ Review Suggestions", infos, colors.textSecondary)}

      {/* Mock Point Valuation Modal */}
      <Modal visible={pointValueModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Point Value</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Enter the rupee conversion value for 1 reward point.</Text>
            
            <TextInput 
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={pointValue}
              onChangeText={setPointValue}
              keyboardType="numeric"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.surface }]}
                onPress={() => setPointValueModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  alert(`Saved point value: ₹${pointValue}. This would recalculate the effective returns.`);
                  setPointValueModalVisible(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: tokens.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.lg,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  actionGroup: {
    marginBottom: tokens.spacing.xl,
  },
  groupTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.sm,
    letterSpacing: 0.5,
  },
  actionsList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.lg,
  },
  actionDivider: {
    height: 1,
    width: '100%',
  },
  actionInfo: {
    flex: 1,
    paddingRight: tokens.spacing.xl,
  },
  actionTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
  },
  actionBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
  },
  modalTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-Bold',
    marginBottom: tokens.spacing.sm,
  },
  modalDesc: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Regular',
    marginBottom: tokens.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
    marginBottom: tokens.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  modalBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  },
  modalBtnText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-SemiBold',
  }
});
