// ─── Card Analyser Design System — Color Tokens ───────────────────────────────
// Premium foundation: calm, near-white light theme and ink-black dark theme,
// cobalt as a restrained action accent, minimal glass, accessible contrast.

export const lightTheme = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: '#F7F8FA',        // Calm near-white app canvas
  surface: '#FFFFFF',
  surfaceElevated: '#FBFBFC',   // Quiet elevated surface (no grey tint jump)

  // ── Materials (kept for compatibility; values tuned calmer) ───────────────
  glassSurface: 'rgba(255, 255, 255, 0.96)',
  glassBorder: 'rgba(17, 24, 39, 0.06)',
  glassHighlight: 'rgba(255, 255, 255, 0.6)',

  // ── Primary Brand (Cobalt — restrained action accent) ─────────────────────
  primary: '#0052FF',           // Core cobalt
  primaryDark: '#003FD6',       // Pressed / deep cobalt
  primarySoft: 'rgba(0, 82, 255, 0.06)',
  accent: '#0E9F6E',            // Refined emerald
  accentSoft: 'rgba(14, 159, 110, 0.08)',

  // ── Accents & Tiers ────────────────────────────────────────────────────────
  neonCyan: '#0369A1',
  neonViolet: '#5B5BD6',
  neonAmber: '#B45309',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#0E9F6E',
  successSoft: 'rgba(14, 159, 110, 0.08)',

  warning: '#B45309',
  warningSoft: 'rgba(180, 83, 9, 0.08)',

  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',

  // ── Typography (ink-first, WCAG AA) ────────────────────────────────────────
  textHero: '#0B0E14',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',         // 4.6:1 on #F7F8FA — AA for normal text
  textMutedLarge: '#9CA3AF',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(17, 24, 39, 0.08)',
  borderHighlight: 'rgba(17, 24, 39, 0.16)',

  // ── Card Network Gradients ────────────────────────────────────────────────
  networkVisa: ['#1E3A8A', '#2563EB'],
  networkMastercard: ['#881337', '#BE123C'],
  networkAmex: ['#0F172A', '#334155'],
  networkDiscover: ['#9A3412', '#EA580C'],
  networkDefault: ['#1E293B', '#475569'],
};

export const darkTheme = {
  // ── Backgrounds — ink black ────────────────────────────────────────────────
  background: '#08090C',        // True ink black
  surface: '#101216',           // Raised surface
  surfaceElevated: '#171A20',

  // ── Materials ──────────────────────────────────────────────────────────────
  glassSurface: 'rgba(16, 18, 22, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.09)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',

  // ── Primary Brand ──────────────────────────────────────────────────────────
  primary: '#3D7BFF',           // Electric cobalt (readable on black)
  primaryDark: '#2F63E0',
  primarySoft: 'rgba(61, 123, 255, 0.16)',
  accent: '#12B981',
  accentSoft: 'rgba(18, 185, 129, 0.14)',

  // ── Accents & Tiers ────────────────────────────────────────────────────────
  neonCyan: '#3BA9F5',
  neonViolet: '#8B8BF8',
  neonAmber: '#F6B94E',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#12B981',
  successSoft: 'rgba(18, 185, 129, 0.14)',

  warning: '#F6B94E',
  warningSoft: 'rgba(246, 185, 78, 0.14)',

  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',

  // ── Typography ─────────────────────────────────────────────────────────────
  textHero: '#FFFFFF',
  textPrimary: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#8A93A3',         // 4.6:1 on #08090C
  textMutedLarge: '#6B7280',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.1)',
  borderHighlight: 'rgba(255, 255, 255, 0.18)',

  // ── Card Network Gradients ─────────────────────────────────────────────────
  networkVisa: ['#0F2042', '#1B356B'],
  networkMastercard: ['#3A0E1D', '#5C1730'],
  networkAmex: ['#131927', '#1F293D'],
  networkDiscover: ['#381B08', '#5E2F0F'],
  networkDefault: ['#131722', '#222A3E'],
};

// Default export
export const colors = lightTheme;

// Helper: get network gradient by card network name
export function getNetworkGradient(network: string, isDark: boolean): string[] {
  const theme = isDark ? darkTheme : lightTheme;
  const n = network ? network.toLowerCase() : '';
  if (n.includes('visa')) return theme.networkVisa;
  if (n.includes('mastercard')) return theme.networkMastercard;
  if (n.includes('amex') || n.includes('american express')) return theme.networkAmex;
  if (n.includes('discover')) return theme.networkDiscover;
  return theme.networkDefault;
}
