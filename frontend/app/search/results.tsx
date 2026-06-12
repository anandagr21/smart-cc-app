import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { apiClient } from '@/services/api/client';

// --- API Typings ---
enum IntentType {
  MERCHANT_LOOKUP = "MERCHANT_LOOKUP",
  BEST_CARD_FOR_MERCHANT = "BEST_CARD_FOR_MERCHANT",
  CATEGORY_DISCOVERY = "CATEGORY_DISCOVERY",
  FEATURE_SEARCH = "FEATURE_SEARCH",
  UNKNOWN = "UNKNOWN"
}

interface SearchIntentResult {
  intent_type: IntentType;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  confidence?: number;
  resolution_type?: string;
}

interface SearchResolveResponse {
  session_id: string;
  intent: SearchIntentResult;
}

export default function SearchResultsScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SearchResolveResponse | null>(null);

  useEffect(() => {
    if (q) {
      resolveQuery(q);
    }
  }, [q]);

  const resolveQuery = async (queryText: string) => {
    try {
      setLoading(true);
      const res = await apiClient.post<SearchResolveResponse>('/search/resolve', {
        query: queryText
      });
      setResult(res.data);
      
      // Emit analytics event
      await apiClient.post('/search/events', {
        session_id: res.data.session_id,
        event_type: 'SEARCH_RESOLVED',
        payload: { query: queryText, intent: res.data.intent }
      });
    } catch (err) {
      console.error("Failed to resolve search:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAliasConfirm = async () => {
    if (!result || !result.intent.entity_id) return;
    try {
      await apiClient.post('/search/alias/learn', {
        raw_name: q,
        merchant_id: result.intent.entity_id
      });
      alert('Thanks for your feedback! Search improved.');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             {/* @ts-ignore */}
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const { intent } = result || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={SlideInDown.springify()} style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           {/* @ts-ignore */}
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {q}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        entering={FadeIn}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Intent Context Chip */}
        {intent && (
          <View style={[styles.intentContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.intentChip}>
              {/* @ts-ignore */}
              <Info size={16} color={colors.primary} />
              <Text style={[styles.intentText, { color: colors.textPrimary }]}>
                Intent: {intent.intent_type.replace(/_/g, ' ')}
              </Text>
            </View>
            <Text style={[styles.entityText, { color: colors.textSecondary }]}>
              Entity: {intent.entity_name} ({intent.entity_type})
            </Text>
          </View>
        )}

        {/* Resolution Feedback Banner */}
        {intent?.resolution_type === 'LLM_RECOVERY' && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.banner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
             {/* @ts-ignore */}
            <AlertTriangle size={20} color={colors.warning} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                Did you mean {intent.entity_name}?
              </Text>
              <Text style={[styles.bannerSubtext, { color: colors.textSecondary }]}>
                We used AI to match "{q}" to "{intent.entity_name}".
              </Text>
            </View>
            <TouchableOpacity onPress={handleAliasConfirm} style={[styles.bannerButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.bannerButtonText}>Yes</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Content Area */}
        <View style={styles.placeholderContainer}>
          {/* @ts-ignore */}
          <CheckCircle2 size={48} color={colors.success} />
          <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
            {intent?.entity_name || 'Search Results'}
          </Text>
          <Text style={[styles.placeholderSubtext, { color: colors.textSecondary }]}>
            This is a placeholder for the intent-driven results page.
          </Text>
        </View>
        
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.semibold,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  intentContainer: {
    padding: 16,
    borderRadius: tokens.radius.card,
    gap: 8,
  },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intentText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  entityText: {
    fontSize: tokens.fontSize.caption,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 4,
  },
  bannerSubtext: {
    fontSize: tokens.fontSize.caption,
  },
  bannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
  },
  bannerButtonText: {
    color: '#FFF',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  placeholderTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
  },
  placeholderSubtext: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
  },
});
