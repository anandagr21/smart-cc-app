

export interface CategoryAccent {
  bgClass: string;
  textClass: string;
  iconName: string; // lucide-react-native icon name
}

const defaultAccent: CategoryAccent = {
  bgClass: 'bg-surfaceElevated',
  textClass: 'text-textPrimary',
  iconName: 'Receipt',
};

// Map categories to distinct, subtle visual accents
export const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  dining:           { bgClass: 'bg-orange-500/10', textClass: 'text-orange-400', iconName: 'Utensils' },
  food_delivery:    { bgClass: 'bg-orange-500/10', textClass: 'text-orange-400', iconName: 'Utensils' },
  shopping:         { bgClass: 'bg-blue-500/10',   textClass: 'text-blue-400',   iconName: 'ShoppingBag' },
  ecommerce:        { bgClass: 'bg-blue-500/10',   textClass: 'text-blue-400',   iconName: 'ShoppingBag' },
  travel:           { bgClass: 'bg-teal-500/10',   textClass: 'text-teal-400',   iconName: 'Plane' },
  groceries:        { bgClass: 'bg-green-500/10',  textClass: 'text-green-400',  iconName: 'ShoppingCart' },
  utilities:        { bgClass: 'bg-purple-500/10', textClass: 'text-purple-400', iconName: 'Zap' },
  entertainment:    { bgClass: 'bg-pink-500/10',   textClass: 'text-pink-400',   iconName: 'Film' },
  transport:        { bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-400', iconName: 'Car' },
  fuel:             { bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-400', iconName: 'Fuel' },
  healthcare:       { bgClass: 'bg-red-500/10',    textClass: 'text-red-400',    iconName: 'HeartPulse' },
  education:        { bgClass: 'bg-indigo-500/10', textClass: 'text-indigo-400', iconName: 'BookOpen' },
  insurance:        { bgClass: 'bg-cyan-500/10',   textClass: 'text-cyan-400',   iconName: 'Shield' },
  subscription:     { bgClass: 'bg-violet-500/10', textClass: 'text-violet-400', iconName: 'RefreshCw' },
  rent:             { bgClass: 'bg-amber-500/10',  textClass: 'text-amber-400',  iconName: 'Home' },
  investment:       { bgClass: 'bg-emerald-500/10',textClass: 'text-emerald-400',iconName: 'TrendingUp' },
  government:       { bgClass: 'bg-slate-500/10',  textClass: 'text-slate-400',  iconName: 'Building2' },
  transfer:         { bgClass: 'bg-gray-500/10',   textClass: 'text-gray-400',   iconName: 'ArrowLeftRight' },
};

/** Human-readable labels for category slugs returned by the backend. */
const CATEGORY_LABELS: Record<string, string> = {
  food_delivery: 'Food Delivery',
  ecommerce: 'E-Commerce',
};

export function getCategoryAccent(category: string): CategoryAccent {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_ACCENTS[normalized] || defaultAccent;
}

/** Format a category slug into a human-readable label. */
export function formatCategoryLabel(category: string | undefined | null): string {
  if (!category) return '';
  const lower = category.trim().toLowerCase();
  if (!lower) return '';
  if (CATEGORY_LABELS[lower]) return CATEGORY_LABELS[lower];
  // Fallback: title-case the slug, replacing underscores with spaces
  return lower
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
