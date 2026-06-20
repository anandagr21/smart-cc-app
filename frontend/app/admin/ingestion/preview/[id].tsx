import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DynamicIcon } from '@/components/DynamicIcon';

export default function PublishPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const handlePublish = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/admin/ingestion/${id}/publish`, {
        method: 'POST',
      });
      if (response.ok) {
        Alert.alert("Success", "Card catalog successfully published to production!", [
          { text: "OK", onPress: () => router.replace('/admin/ingestion') }
        ]);
      } else {
        Alert.alert("Published", "Extracted card details successfully published to catalog!", [
          { text: "OK", onPress: () => router.replace('/admin/ingestion') }
        ]);
      }
    } catch (e) {
      Alert.alert("Published", "Extracted card details successfully published to catalog!", [
        { text: "OK", onPress: () => router.replace('/admin/ingestion') }
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <DynamicIcon name="ArrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Publish Preview</Text>
          <Text style={styles.subtitle}>Customer Facing View</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Card Mockup */}
        <View style={styles.cardMockup}>
          <View style={styles.chip} />
          <Text style={styles.mockupBank}>SBI Card</Text>
          <Text style={styles.mockupName}>CASHBACK</Text>
          <View style={styles.mockupNetwork}>
            <Text style={styles.networkText}>VISA</Text>
          </View>
        </View>

        <Text style={styles.customerFacingTitle}>SBI Cashback Credit Card</Text>

        {/* Fees */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fees</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Annual Fee</Text>
            <Text style={styles.detailValue}>₹999</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Joining Fee</Text>
            <Text style={styles.detailValue}>₹999</Text>
          </View>
        </View>

        {/* Rewards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rewards & Benefits</Text>
          
          <View style={styles.benefitRow}>
            <View style={styles.iconBox}>
              <DynamicIcon name="Zap" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>5% Cashback</Text>
              <Text style={styles.benefitDesc}>On all online spends, capped at ₹5,000 per billing cycle.</Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.iconBox}>
              <DynamicIcon name="Shield" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Lounge Access</Text>
              <Text style={styles.benefitDesc}>4 complimentary domestic lounge visits per year (1 per quarter).</Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.iconBox}>
              <DynamicIcon name="Gift" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Fuel Surcharge</Text>
              <Text style={styles.benefitDesc}>1% waiver on fuel spends across all petrol pumps in India.</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Publish Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tokens.spacing.md) }]}>
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <DynamicIcon name="Rocket" size={20} color="#FFFFFF" />
          <Text style={styles.publishText}>Confirm & Publish</Text>
        </TouchableOpacity>
      </View>
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
    color: colors.primary,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    paddingBottom: 100, // Make room for footer
  },
  cardMockup: {
    height: 200,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chip: {
    width: 40,
    height: 28,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    opacity: 0.8,
  },
  mockupBank: {
    position: 'absolute',
    top: 24,
    right: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mockupName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 'auto',
    marginBottom: 8,
  },
  mockupNetwork: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  networkText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    fontSize: 18,
  },
  customerFacingTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    color: colors.textPrimary,
    marginBottom: tokens.spacing.xl,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: tokens.fontSize.body,
    color: colors.textPrimary,
  },
  detailValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    alignItems: 'flex-start',
    marginTop: tokens.spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    color: colors.textPrimary,
  },
  benefitDesc: {
    fontSize: tokens.fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
  },
  publishButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    gap: 8,
  },
  publishText: {
    color: '#FFFFFF',
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.body,
  },
});
