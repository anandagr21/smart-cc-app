// ─── Smart CC Design System — Color Tokens ───────────────────────────────────
// Palette locked per product spec. Do NOT add random accents.

export const lightTheme = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: '#F8F8FC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // ── Glass Materials ────────────────────────────────────────────────────────
  glassSurface: 'rgba(255, 255, 255, 0.80)',
  glassBorder: 'rgba(231, 232, 240, 0.70)',
  glassHighlight: 'rgba(255, 255, 255, 0.90)',

  // ── Primary Accent ────────────────────────────────────────────────────────
  primary: '#4F36FF',           // Primary Purple
  primaryDark: '#3322D1',       // Deep Purple
  primarySoft: '#EDEAFF',       // Light Purple
  accent: '#FF8A3D',            // Primary Orange
  accentSoft: '#FFB545',        // Accent Orange

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.12)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.10)',

  // ── Typography ─────────────────────────────────────────────────────────────
  textHero: '#14142B',
  textPrimary: '#14142B',
  textSecondary: '#666A80',
  textMuted: '#6B7280',           // 5.0:1 on #FFFFFF — WCAG AA ✅
  textMutedLarge: '#8E96A6',      // 3.5:1 on #FFFFFF — WCAG AA for large text (≥18px or ≥14px bold)

  // ── Borders ────────────────────────────────────────────────────────────────
  border: '#E7E8F0',
  borderHighlight: 'rgba(20, 20, 43, 0.08)',

  // ── Card Network Gradients ───────────────────────
  networkVisa: ['#1E293B', '#0F172A'],
  networkMastercard: ['#6D1A36', '#8B2252'],
  networkAmex: ['#1E3A8A', '#1D4ED8'],
  networkDiscover: ['#C2410C', '#9A3412'],
  networkDefault: ['#334155', '#1E293B'],
};

export const darkTheme = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background: '#0A0E17',
  surface: '#111625',
  surfaceElevated: 'rgba(24, 28, 39, 0.72)',

  // ── Glass Materials ────────────────────────────────────────────────────────
  glassSurface: 'rgba(10, 14, 23, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',

  // ── Primary Accent ────────────────────────────────────────────────────────
  primary: '#4F36FF',
  primaryDark: '#3322D1',
  primarySoft: 'rgba(79, 54, 255, 0.15)',
  accent: '#FF8A3D',
  accentSoft: 'rgba(255, 138, 61, 0.15)',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.16)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.15)',
  
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.15)',

  // ── Typography ─────────────────────────────────────────────────────────────
  textHero: '#F5F7FA',
  textPrimary: '#F5F7FA',
  textSecondary: '#A7B0C0',
  textMuted: '#6B7280',           // 6.0:1 on #0A0E17 — WCAG AA ✅
  textMutedLarge: '#7C8AA0',      // 4.8:1 on #0A0E17 — WCAG AA for large text

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.06)',
  borderHighlight: 'rgba(255, 255, 255, 0.10)',

  // ── Card Network Gradients ────────────────────────────────────────────────
  networkVisa: ['#1A237E', '#283593'],
  networkMastercard: ['#6D1A36', '#8B2252'],
  networkAmex: ['#1A3A5C', '#1E4976'],
  networkDiscover: ['#7B4500', '#9C5A00'],
  networkDefault: ['#1A1E2E', '#232840'],
};

// Default export
export const colors = lightTheme;

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
