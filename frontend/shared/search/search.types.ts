import Fuse from 'fuse.js';

export interface SearchKeyWeight {
  name: string;
  weight: number;
}

export interface UseFuseSearchOptions<T> {
  items: T[];
  query: string;
  keys: (string | SearchKeyWeight)[];
  threshold?: number;
  limit?: number;
}

export interface UseFuseSearchResult<T> {
  results: T[];
  hasResults: boolean;
  isEmpty: boolean;
  totalResults: number;
}
