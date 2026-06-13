import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save } from 'lucide-react-native';

export default function CreateIngestionSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');

  const handleCreate = () => {
    // Mock API call
    console.log('Creating session:', { cardName, bankName });
    // Navigate to the review screen for the new session
    router.replace('/admin/ingestion/new-session-id');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          {/* @ts-ignore */}
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>New Card Session</Text>
          <Text style={styles.subtitle}>Manual Entry Mode</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <Text style={styles.description}>
            Create a draft session to manually enter card details or begin an AI extraction pipeline.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Card Name</Text>
            <TextInput
              style={styles.input}
              value={cardName}
              onChangeText={setCardName}
              placeholder="e.g. Millennia Credit Card"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, (!cardName || !bankName) && styles.buttonDisabled]}
            disabled={!cardName || !bankName}
            onPress={handleCreate}
          >
            {/* @ts-ignore */}
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Create Draft Session</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
    gap: tokens.spacing.md,
  },
  backButton: {
    padding: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  description: {
    fontSize: tokens.fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: -8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.body,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    gap: 8,
    marginTop: tokens.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
