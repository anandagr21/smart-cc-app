import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X, MapPin, Store, CreditCard, Tag, ArrowLeft, TrendingUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { apiClient } from '@/services/api/client';

// --- API Typings (matches backend/search/schemas.py) ---
enum SearchResultType {
  MERCHANT = 'MERCHANT',
  CARD = 'CARD',
  OFFER = 'OFFER',
  CATEGORY = 'CATEGORY',
}

interface SearchSuggestion {
  id: string;
  type: SearchResultType;
  title: string;
  preview?: string;
  icon?: string;
  score: number;
}

interface GroupedSearchSuggestions {
  merchants: SearchSuggestion[];
  categories: SearchSuggestion[];
  cards: SearchSuggestion[];
  offers: SearchSuggestion[];
}

interface SuggestionSection {
  title: string;
  data: SearchSuggestion[];
}

export default function SearchScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus search input immediately
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: suggestionsData, isFetching } = useQuery({
    queryKey: ['search_suggestions', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return null;
      const res = await apiClient.get<GroupedSearchSuggestions>(`/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`);
      return res.data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    // We would fire a search event here, and redirect based on type
    if (suggestion.type === SearchResultType.MERCHANT) {
       router.push(`/search/results?q=${encodeURIComponent(suggestion.title)}`);
    } else if (suggestion.type === SearchResultType.CATEGORY) {
       router.push(`/search/results?q=${encodeURIComponent(suggestion.title)}`);
    } else {
       setQuery(suggestion.title);
    }
  };

  const sections: SuggestionSection[] = [];
  if (suggestionsData) {
    if (suggestionsData.categories.length > 0) {
      sections.push({ title: 'Categories', data: suggestionsData.categories });
    }
    if (suggestionsData.merchants.length > 0) {
      sections.push({ title: 'Merchants', data: suggestionsData.merchants });
    }
    if (suggestionsData.cards.length > 0) {
      sections.push({ title: 'Cards', data: suggestionsData.cards });
    }
    if (suggestionsData.offers.length > 0) {
      sections.push({ title: 'Offers', data: suggestionsData.offers });
    }
  }

  const renderIcon = (type: SearchResultType) => {
    switch (type) {
      case SearchResultType.MERCHANT:
        return <Store size={20} color={colors.primary} />;
      case SearchResultType.CATEGORY:
        return <MapPin size={20} color={colors.primary} />;
      case SearchResultType.CARD:
        return <CreditCard size={20} color={colors.primary} />;
      case SearchResultType.OFFER:
        return <Tag size={20} color={colors.primary} />;
      default:
        return <Search size={20} color={colors.primary} />;
    }
  };

  const renderSuggestion = ({ item, index }: { item: SearchSuggestion, index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <TouchableOpacity
          style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectSuggestion(item)}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primarySoft }]}>
            {renderIcon(item.type)}
          </View>
          <View style={styles.suggestionContent}>
            <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
            {item.preview && (
              <Text style={[styles.suggestionPreview, { color: colors.textMuted }]}>
                {item.preview}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        {/* Search Header */}
        <Animated.View entering={SlideInDown.springify()} style={[styles.searchHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            {/* @ts-ignore */}
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            {/* @ts-ignore */}
            <Search size={20} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ask Smart CC or search merchants..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (query.trim().length > 0) {
                  router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
                }
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                {/* @ts-ignore */}
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Loading Indicator */}
        {isFetching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* Results List */}
        {!isFetching && sections.length > 0 && (
          <Animated.ScrollView 
            entering={FadeIn}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsContainer}
          >
            {sections.map(section => (
              <View key={section.title} style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {section.title}
                </Text>
                {section.data.map((item, index) => (
                  <View key={item.id}>
                    {renderSuggestion({ item, index })}
                  </View>
                ))}
              </View>
            ))}
          </Animated.ScrollView>
        )}

        {/* Search Empty State */}
        {debouncedQuery.length < 2 && (
          <Animated.ScrollView 
            entering={FadeIn}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsContainer}
          >
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                Trending Searches
              </Text>
              <View style={styles.chipContainer}>
                {['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'MakeMyTrip'].map((trend) => (
                  <TouchableOpacity 
                    key={trend}
                    style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setQuery(trend)}
                  >
                    {/* @ts-ignore */}
                    <TrendingUp size={14} color={colors.textSecondary} />
                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>{trend}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                Popular Categories
              </Text>
              <View style={styles.chipContainer}>
                {['Fuel', 'Dining', 'Travel', 'Grocery', 'Online Shopping'].map((cat) => (
                  <TouchableOpacity 
                    key={cat}
                    style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setQuery(cat)}
                  >
                    {/* @ts-ignore */}
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.ScrollView>
        )}

        {/* No Results Empty State */}
        {!isFetching && debouncedQuery.length >= 2 && sections.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No results found for "{debouncedQuery}"
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: tokens.radius.full,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.semibold,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultsContainer: {
    paddingVertical: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },
  suggestionPreview: {
    fontSize: tokens.fontSize.caption,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
});
