// ─── Smart CC Design System — Design Tokens ──────────────────────────────────

export const tokens = {
  // ── Layout ─────────────────────────────────────────────────────────────────
  layout: {
    screenPadding: 24,
    sectionGap: 32,
    itemGap: 16,
    elementGap: 8,
  },

  // ── Spacing (8pt grid) ─────────────────────────────────────────────────────
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ── Border Radius ──────────────────────────────────────────────────────────
  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    card: 24,      // Cards, containers
    sheet: 32,     // Bottom sheets
    xl: 28,
    full: 9999,    // Pills, avatars
  },

  // ── Border Widths ─────────────────────────────────────────────────────────
  border: {
    hairline: 0.5,
    thin: 1,
    medium: 1.5,
  },

  // ── Elevation / Shadow System ─────────────────────────────────────────────
  elevation: {
    // Level 0: no shadow — background canvas
    // Level 1: rows, lightweight containers
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    // Level 2: cards, primary surfaces
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 5,
    },
    // Level 3: modal sheets, overlays
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.20,
      shadowRadius: 28,
      elevation: 10,
    },
    // Level 4: floating elements
    level4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 36,
      elevation: 15,
    },
    // Semantic glow — primary brand
    glow: {
      shadowColor: '#4F36FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.30,
      shadowRadius: 20,
      elevation: 8,
    },
    // Semantic glow — success/rewards
    glowSuccess: {
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
  },

  // ── Font Sizes ─────────────────────────────────────────────────────────────
  fontSize: {
    micro: 9,      // Tiny labels, status pills
    caption: 11,   // Sub-labels
    label: 12,     // Section headers, uppercase labels
    bodySm: 12,
    body: 14,      // Body text
    bodyLg: 16,    // Large body
    title: 18,     // Titles
    headline: 22,  // Headlines
    display: 32,   // Display
    hero: 48,      // Hero numerals
    heroXl: 60,    // Reward values, big numbers
  },

  // ── Font Weights ───────────────────────────────────────────────────────────
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },

  // ── Line Heights ───────────────────────────────────────────────────────────
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },

  // ── Letter Spacing ────────────────────────────────────────────────────────
  letterSpacing: {
    tightest: -1.5,
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },

  // ── Animation Durations ───────────────────────────────────────────────────
  duration: {
    instant: 100,
    fast: 200,
    normal: 350,
    slow: 550,
    verySlow: 800,
  },

  // ── Spring Physics ────────────────────────────────────────────────────────
  spring: {
    // Weighted: for entering cards, sheets
    weighted: { damping: 26, stiffness: 100, mass: 1.2 },
    // Calm: for general transitions
    calm: { damping: 22, stiffness: 95, mass: 1 },
    // Snappy: for micro-interactions (button press)
    snappy: { damping: 28, stiffness: 160, mass: 0.9 },
    // Gentle: for skeleton reveals, fade-ins
    gentle: { damping: 30, stiffness: 80, mass: 1.5 },
  },
};
