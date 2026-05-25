// ─── Smart CC Design System — Color Tokens ───────────────────────────────────
// Palette locked per product spec. Do NOT add random accents.
// Emerald = rewards/success ONLY. Indigo/Violet = brand atmosphere.

export const darkTheme = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: '#0A0E17',        // Primary canvas — deep navy
  surface: '#111625',           // Secondary background — cards, sheets
  surfaceElevated: 'rgba(24, 28, 39, 0.72)', // Elevated surface

  // ── Glass Materials ────────────────────────────────────────────────────────
  glassSurface: 'rgba(10, 14, 23, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',

  // ── Primary Accent — Brand Atmosphere ─────────────────────────────────────
  primary: '#7C83FF',           // Indigo/Violet accent
  primarySoft: 'rgba(124, 131, 255, 0.18)', // Soft indigo glow
  accent: '#7C83FF',
  accentSoft: 'rgba(124, 131, 255, 0.12)',

  // ── Semantic: Rewards / Success / Optimization ────────────────────────────
  success: '#10B981',           // Emerald — rewards ONLY
  successSoft: 'rgba(16, 185, 129, 0.16)',

  // ── Semantic: Warnings / Danger ───────────────────────────────────────────
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.15)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',

  // ── Typography ─────────────────────────────────────────────────────────────
  textHero: '#F5F7FA',
  textPrimary: '#F5F7FA',
  textSecondary: '#A7B0C0',
  textMuted: '#6B7280',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.06)',
  borderHighlight: 'rgba(255, 255, 255, 0.10)',

  // ── Card Network Gradients ────────────────────────────────────────────────
  // Used by WalletCard — kept restrained (no neon, no cyberpunk)
  networkVisa: ['#1A237E', '#283593'],
  networkMastercard: ['#6D1A36', '#8B2252'],
  networkAmex: ['#1A3A5C', '#1E4976'],
  networkDiscover: ['#7B4500', '#9C5A00'],
  networkDefault: ['#1A1E2E', '#232840'],
};

export const lightTheme = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceElevated: 'rgba(255, 255, 255, 0.82)',

  // ── Glass Materials ────────────────────────────────────────────────────────
  glassSurface: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',
  glassHighlight: 'rgba(255, 255, 255, 0.85)',

  // ── Primary Accent ────────────────────────────────────────────────────────
  primary: '#6366F1',
  primarySoft: 'rgba(99, 102, 241, 0.12)',
  accent: '#6366F1',
  accentSoft: 'rgba(99, 102, 241, 0.08)',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',

  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.12)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.10)',

  // ── Typography ─────────────────────────────────────────────────────────────
  textHero: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(15, 23, 42, 0.06)',
  borderHighlight: 'rgba(15, 23, 42, 0.10)',

  // ── Card Network Gradients (lighter for light mode) ───────────────────────
  networkVisa: ['#1565C0', '#1976D2'],
  networkMastercard: ['#C62828', '#D32F2F'],
  networkAmex: ['#1565C0', '#0277BD'],
  networkDiscover: ['#E65100', '#EF6C00'],
  networkDefault: ['#37474F', '#455A64'],
};

// Default export — dark is the primary experience
export const colors = darkTheme;

// Helper: get network gradient by card network name
export function getNetworkGradient(network: string, isDark: boolean): string[] {
  const theme = isDark ? darkTheme : lightTheme;
  const n = network.toLowerCase();
  if (n.includes('visa')) return theme.networkVisa;
  if (n.includes('mastercard')) return theme.networkMastercard;
  if (n.includes('amex') || n.includes('american express')) return theme.networkAmex;
  if (n.includes('discover')) return theme.networkDiscover;
  return theme.networkDefault;
}
