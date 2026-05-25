/**
 * Deterministic mapping to clean up raw merchant strings for insights and analytics.
 */

const MERCHANT_MAPPINGS: Array<{ pattern: RegExp; normalized: string }> = [
  { pattern: /^swiggy.*$/i, normalized: 'Swiggy' },
  { pattern: /^zomato.*$/i, normalized: 'Zomato' },
  { pattern: /^amazon.*$/i, normalized: 'Amazon' },
  { pattern: /^flipkart.*$/i, normalized: 'Flipkart' },
  { pattern: /^uber.*$/i, normalized: 'Uber' },
  { pattern: /^ola.*$/i, normalized: 'Ola' },
  { pattern: /^make ?my ?trip.*$/i, normalized: 'MakeMyTrip' },
  { pattern: /^mmt.*$/i, normalized: 'MakeMyTrip' },
  { pattern: /^starbucks.*$/i, normalized: 'Starbucks' },
];

export function normalizeMerchantName(rawName: string): string {
  const trimmed = rawName.trim();
  
  for (const mapping of MERCHANT_MAPPINGS) {
    if (mapping.pattern.test(trimmed)) {
      return mapping.normalized;
    }
  }

  // Fallback: Just Capitalize Words
  return trimmed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
