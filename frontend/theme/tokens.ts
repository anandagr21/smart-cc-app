// ─── Card Analyser Design System — Design Tokens ─────────────────────────────

export const tokens = {
  // ── Layout ─────────────────────────────────────────────────────────────────
  layout: {
    screenPadding: 20,
    sectionGap: 24,
    itemGap: 12,
    elementGap: 8,
  },

  // ── Spacing (8pt grid) ─────────────────────────────────────────────────────
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  // ── Border Radius ──────────────────────────────────────────────────────────
  radius: {
    xs: 6,
    sm: 10,
    md: 12,
    lg: 16,
    card: 20,      // Cards, containers
    sheet: 24,     // Bottom sheets
    xl: 22,
    full: 9999,    // Pills, avatars, circular action buttons
  },

  // ── Border Widths ─────────────────────────────────────────────────────────
  border: {
    hairline: 0.5,
    thin: 1,
    medium: 1.5,
  },

  // ── Elevation / Shadow System — minimal, calm ─────────────────────────────
  elevation: {
    // Level 0: no shadow
    // Level 1: subtle hairline separation
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    // Level 2: cards, primary surfaces
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 3,
    },
    // Level 3: modal sheets, overlays
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 6,
    },
    // Level 4: floating docks
    level4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    // Restrained brand accent (no heavy glow)
    glow: {
      shadowColor: '#0052FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 8,
      elevation: 2,
    },
    glowViolet: {
      shadowColor: '#5B5BD6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 8,
      elevation: 2,
    },
    glowSuccess: {
      shadowColor: '#0E9F6E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    glowAmber: {
      shadowColor: '#B45309',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
  },

  // ── Font Sizes ─────────────────────────────────────────────────────────────
  fontSize: {
    micro: 10,     // Tiny badges, status pills
    caption: 12,   // Sub-labels, category tags
    label: 13,     // Section headers, uppercase labels
    bodySm: 13,
    body: 15,      // Body text
    bodyLg: 16,    // Large body
    title: 18,     // Titles
    headline: 22,  // Section headlines
    display: 28,   // Medium display
    hero: 38,      // Hero account numerals
    heroXl: 48,    // Mega statistics
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
    normal: 1.35,
    relaxed: 1.5,
  },

  // ── Letter Spacing ────────────────────────────────────────────────────────
  letterSpacing: {
    tightest: -1.0,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  },

  // ── Animation Durations — purposeful 150–250ms ───────────────────────────
  duration: {
    instant: 100,
    fast: 150,
    normal: 220,
    slow: 300,
    verySlow: 450,
  },

  // ── Spring Physics — calm, weighted ────────────────────────────────────────
  spring: {
    weighted: { damping: 26, stiffness: 140, mass: 1.0 },
    calm: { damping: 24, stiffness: 120, mass: 1 },
    snappy: { damping: 24, stiffness: 200, mass: 0.8 },
    gentle: { damping: 30, stiffness: 110, mass: 1.1 },
  },
};
