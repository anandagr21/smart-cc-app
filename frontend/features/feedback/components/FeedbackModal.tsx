import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { X, MessageSquareWarning } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { feedbackApi, FeedbackCreatePayload } from '../api';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  feedbackContext: Omit<FeedbackCreatePayload, 'issue_type' | 'issue_description'>;
}

const ISSUE_TYPES = [
  { id: 'incorrect_reward', label: 'Reward too low or high' },
  { id: 'missing_merchant', label: 'Merchant category wrong' },
  { id: 'wrong_card_recommendation', label: 'Card recommendation wrong' },
  { id: 'other', label: 'Other' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isVisible, onClose, feedbackContext }) => {
  const colors = useThemeColors();
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('Selection Required', 'Please select what went wrong.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackApi.submitFeedback({
        ...feedbackContext,
        issue_type: selectedIssue,
        issue_description: description,
      });
      Alert.alert('Thank you!', 'Your feedback helps us improve the reward calculations.', [
        { text: 'OK', onPress: onClose }
      ]);
      setSelectedIssue(null);
      setDescription('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Submission Failed', 'Could not send feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* @ts-ignore */}
              <MessageSquareWarning size={20} color={colors.text} />
              <Text style={[styles.title, { color: colors.text }]}>Report Issue</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              {/* @ts-ignore */}
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            What seems to be wrong with the recommendation for {feedbackContext.merchant_name}?
          </Text>

          <View style={styles.optionsContainer}>
            {ISSUE_TYPES.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                style={[
                  styles.optionButton,
                  { borderColor: colors.border },
                  selectedIssue === issue.id && { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: '#8B5CF6' }
                ]}
                onPress={() => setSelectedIssue(issue.id)}
              >
                <View style={[
                  styles.radioOuter,
                  { borderColor: colors.border },
                  selectedIssue === issue.id && { borderColor: '#8B5CF6' }
                ]}>
                  {selectedIssue === issue.id && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>{issue.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Additional comments (optional)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="What did you expect the reward to be?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={[styles.submitButton, (!selectedIssue || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!selectedIssue || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  optionText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  label: {
    fontSize: tokens.fontSize.small,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
    fontSize: tokens.fontSize.body,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
