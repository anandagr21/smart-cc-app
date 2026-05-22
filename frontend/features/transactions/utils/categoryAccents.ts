

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
  dining: {
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    iconName: 'Utensils',
  },
  shopping: {
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    iconName: 'ShoppingBag',
  },
  travel: {
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-400',
    iconName: 'Plane',
  },
  groceries: {
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-400',
    iconName: 'ShoppingCart',
  },
  utilities: {
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    iconName: 'Zap',
  },
  entertainment: {
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-400',
    iconName: 'Film',
  },
  transport: {
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    iconName: 'Car',
  },
};

export function getCategoryAccent(category: string): CategoryAccent {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_ACCENTS[normalized] || defaultAccent;
}
