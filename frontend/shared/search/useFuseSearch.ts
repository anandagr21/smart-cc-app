import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { UseFuseSearchOptions, UseFuseSearchResult } from './search.types';

/**
 * A shared, pure search abstraction over Fuse.js.
 * This hook maintains Single Responsibility by handling only search/filtering.
 * Debouncing of the `query` string should be handled externally (e.g., via `useDebounce`).
 */
export function useFuseSearch<T>({
  items,
  query,
  keys,
  threshold = 0.3,
  limit,
}: UseFuseSearchOptions<T>): UseFuseSearchResult<T> {
  // Memoize the Fuse instance to avoid re-instantiation on every render.
  // We stringify the keys array to ensure stable dependency comparison for array literals.
  const keysStr = JSON.stringify(keys);
  
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys,
      threshold,
      ignoreLocation: true, // often preferred for general fuzzy matching
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, keysStr, threshold]);

  const results = useMemo(() => {
    const trimmedQuery = query?.trim() || '';
    if (!trimmedQuery) {
      return limit ? items.slice(0, limit) : items;
    }
    
    const searchResults = fuse.search(trimmedQuery).map((result) => result.item);
    return limit ? searchResults.slice(0, limit) : searchResults;
  }, [query, fuse, items, limit]);

  return {
    results,
    hasResults: results.length > 0,
    isEmpty: results.length === 0,
    totalResults: results.length,
  };
}
