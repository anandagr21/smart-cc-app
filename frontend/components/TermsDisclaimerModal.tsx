import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/features/auth/store/authStore';
import { acceptTerms } from '@/features/auth/api/authApi';

export function TermsDisclaimerModal() {
  const { user, acceptTerms: acceptTermsInStore } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's no user or they've already accepted the terms, don't show anything.
  if (!user || user.terms_accepted) {
    return null;
  }

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      await acceptTerms();
      await acceptTermsInStore();
    } catch (err) {
      console.error('Failed to accept terms', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Welcome to Smart CC</Text>
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.paragraph}>
              Before you proceed, please read and accept our terms and conditions.
            </Text>
            
            <Text style={styles.subtitle}>AI Disclaimer</Text>
            <Text style={styles.paragraph}>
              Smart CC uses artificial intelligence to analyze your credit cards, provide insights, and generate recommendations. While we strive for accuracy, AI models can occasionally produce incorrect, incomplete, or probabilistic information.
            </Text>
            
            <Text style={styles.subtitle}>Not Financial Advice</Text>
            <Text style={styles.paragraph}>
              The insights, rewards estimates, and card recommendations provided by this application are for informational purposes only and do not constitute professional financial, tax, or legal advice. You should always perform your own due diligence or consult with a certified professional before making financial decisions.
            </Text>

            <Text style={styles.subtitle}>Data Privacy</Text>
            <Text style={styles.paragraph}>
              By using Smart CC, you consent to our privacy policy regarding how we process your transactions and card data to provide personalized AI insights.
            </Text>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleAccept} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>I Understand and Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    textAlign: 'center',
  },
  scrollArea: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#99C7FF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});
